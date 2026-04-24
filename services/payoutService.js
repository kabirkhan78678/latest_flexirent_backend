import Stripe from "stripe";
import {
  claimPayoutForProcessingModel,
  getDuePayoutPaymentsModel,
  getPayoutPaymentByIdModel,
  markPayoutFailedModel,
  markPayoutPaidModel,
} from "../models/payoutModel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class PayoutProcessingError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = "PayoutProcessingError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const roundAmount = (value) => {
  const numberValue = Number(value || 0);
  return Number(numberValue.toFixed(2));
};

const getHostPayoutAmount = (payment) => {
  if (payment?.host_payout_amount !== null && payment?.host_payout_amount !== undefined) {
    return roundAmount(payment.host_payout_amount);
  }

  return roundAmount(Number(payment?.total_amount || 0) - Number(payment?.admin_earnings || 0));
};

const getReleaseDate = (payment) => {
  const releaseDate = payment?.effective_release_on || payment?.release_on || payment?.booked_from;
  if (!releaseDate) return null;

  const parsedDate = new Date(releaseDate);
  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
};

const formatDateForMessage = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const isReleaseDateReached = (payment) => {
  const releaseDate = getReleaseDate(payment);
  if (!releaseDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today >= releaseDate;
};

const getSafeCurrency = (currency) => {
  return String(currency || "usd").toLowerCase();
};

const getCapabilityStatus = (account, capabilityName) => {
  return account?.capabilities?.[capabilityName] || "inactive";
};

const getPendingRequirementFields = (account) => {
  return account?.requirements?.currently_due || account?.requirements?.eventually_due || [];
};

const getStripeAccountDiagnostics = (account) => {
  if (!account) return null;

  return {
    stripe_account_id: account.id,
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    capabilities: {
      transfers: account.capabilities?.transfers || "inactive",
      card_payments: account.capabilities?.card_payments || "inactive",
      crypto_transfers: account.capabilities?.crypto_transfers || "inactive",
      legacy_payments: account.capabilities?.legacy_payments || "inactive",
    },
    requirements: {
      currently_due: account.requirements?.currently_due || [],
      eventually_due: account.requirements?.eventually_due || [],
      past_due: account.requirements?.past_due || [],
      pending_verification: account.requirements?.pending_verification || [],
      disabled_reason: account.requirements?.disabled_reason || null,
    },
    external_accounts_count: account.external_accounts?.data?.length || 0,
  };
};

const ensureTransfersCapabilityReady = async (stripeAccountId) => {
  const account = await stripe.accounts.retrieve(stripeAccountId);
  const transfersStatus = getCapabilityStatus(account, "transfers");

  if (transfersStatus === "active") {
    return account;
  }

  const pendingFields = getPendingRequirementFields(account);
  const pendingFieldsText = pendingFields.length
    ? ` Pending requirements: ${pendingFields.join(", ")}.`
    : "";

  throw new PayoutProcessingError(
    `Host Stripe account onboarding is incomplete. Transfers capability is ${transfersStatus}.${pendingFieldsText}`,
    400,
    {
      stripe_account: getStripeAccountDiagnostics(account),
    }
  );
};

const getPayoutSummary = (payment, extra = {}) => {
  return {
    payment_id: payment.payment_id,
    booking_id: payment.booking_id,
    property_title: payment.property_title,
    host_name: `${payment.host_first_name || ""} ${payment.host_last_name || ""}`.trim(),
    guest_name: `${payment.guest_first_name || ""} ${payment.guest_last_name || ""}`.trim(),
    host_payout_amount: getHostPayoutAmount(payment),
    admin_earnings: roundAmount(payment.admin_earnings),
    total_amount: roundAmount(payment.total_amount),
    payment_status: payment.payment_status,
    payout_status: payment.payout_status || "PENDING",
    release_on: payment.effective_release_on || payment.release_on || payment.booked_from,
    stripe_transfer_id: payment.stripe_transfer_id || null,
    ...extra,
  };
};

export const releasePayoutForPayment = async ({
  paymentId,
  triggerSource = "manual",
  allowedStatuses = ["PENDING", "FAILED"],
} = {}) => {
  if (!paymentId) {
    throw new PayoutProcessingError("payment_id is required");
  }

  const [payment] = await getPayoutPaymentByIdModel(paymentId);

  if (!payment) {
    throw new PayoutProcessingError("Payment record not found", 404);
  }

  const payoutDebugContext = {
    payment_id: payment.payment_id,
    booking_id: payment.booking_id,
    host_id: payment.host_id,
    property_id: payment.property_id,
    stripe_account_id: payment.stripe_account_id || null,
    payment_status: payment.payment_status,
    booking_status: payment.booking_status,
    booking_payment_status: payment.booking_payment_status,
    payout_status: payment.payout_status || "PENDING",
    release_on: payment.effective_release_on || payment.release_on || payment.booked_from || null,
  };

  if (payment.payment_status !== "COMPLETED") {
    throw new PayoutProcessingError("Only completed payments can be released");
  }

  if (Number(payment.booking_status) !== 1 || Number(payment.booking_payment_status) !== 1) {
    throw new PayoutProcessingError("Booking is not eligible for payout release");
  }

  if ((payment.is_canceled || "No") !== "No") {
    throw new PayoutProcessingError("Cancelled booking payout cannot be released");
  }

  const hostPayoutAmount = getHostPayoutAmount(payment);
  if (hostPayoutAmount <= 0) {
    throw new PayoutProcessingError("Host payout amount must be greater than zero");
  }

  if ((payment.payout_status || "PENDING") === "PAID") {
    return {
      success: true,
      already_processed: true,
      message: "Payout already released",
      payout: getPayoutSummary(payment),
    };
  }

  if (!isReleaseDateReached(payment)) {
    const effectiveReleaseDate = formatDateForMessage(getReleaseDate(payment));
    const releaseSource = payment?.release_on ? "payment_master.release_on" : "booking_master.booked_from";
    const message = effectiveReleaseDate
      ? `Payout is not due yet. Effective release date is ${effectiveReleaseDate} from ${releaseSource}.`
      : "Payout is not due yet. Wait until the check-in date.";

    throw new PayoutProcessingError(message);
  }

  const claimResult = await claimPayoutForProcessingModel(paymentId, allowedStatuses);
  if (!claimResult?.affectedRows) {
    const [latestPayment] = await getPayoutPaymentByIdModel(paymentId);

    if ((latestPayment?.payout_status || "PENDING") === "PAID") {
      return {
        success: true,
        already_processed: true,
        message: "Payout already released",
        payout: getPayoutSummary(latestPayment),
      };
    }

    throw new PayoutProcessingError("Payout is already being processed or is not retryable right now");
  }

  try {
    const [claimedPayment] = await getPayoutPaymentByIdModel(paymentId);
    const payoutAttemptMarker =
      claimedPayment?.last_payout_attempt_at
        ? new Date(claimedPayment.last_payout_attempt_at).getTime()
        : Date.now();

    if (!payment.stripe_account_id) {
      throw new PayoutProcessingError("Host Stripe account is not connected", 400, payoutDebugContext);
    }

    await ensureTransfersCapabilityReady(payment.stripe_account_id);

    const transfer = await stripe.transfers.create(
      {
        amount: Math.round(hostPayoutAmount * 100),
        currency: getSafeCurrency(payment.currency),
        destination: payment.stripe_account_id,
        metadata: {
          payment_id: String(payment.payment_id),
          booking_id: String(payment.booking_id),
          trigger_source: String(triggerSource),
        },
        transfer_group: `booking_${payment.booking_id}`,
      },
      {
        idempotencyKey: `payment-payout-${payment.payment_id}-${payoutAttemptMarker}`,
      }
    );

    await markPayoutPaidModel(payment.payment_id, transfer.id);

    return {
      success: true,
      already_processed: false,
      message: "Payout released successfully",
      payout: getPayoutSummary(payment, {
        payout_status: "PAID",
        stripe_transfer_id: transfer.id,
        release_trigger: triggerSource,
      }),
    };
  } catch (error) {
    const failureMessage = error?.message || "Failed to release payout";
    await markPayoutFailedModel(payment.payment_id, failureMessage);

    if (error instanceof PayoutProcessingError) {
      error.details = {
        ...payoutDebugContext,
        ...error.details,
      };
      throw error;
    }

    if (error?.type === "StripeInvalidRequestError" && error?.message?.includes("capabilities enabled")) {
      throw new PayoutProcessingError(
        "Host Stripe account cannot receive payouts yet. Please reopen Stripe onboarding and complete all required payout details.",
        400,
        {
          ...payoutDebugContext,
          stripe_error: {
            type: error.type || null,
            code: error.code || null,
            param: error.param || null,
            decline_code: error.decline_code || null,
            message: error.message || null,
            raw: error.raw || null,
          },
        }
      );
    }

    throw new PayoutProcessingError(failureMessage, 500, {
      ...payoutDebugContext,
      stripe_error: {
        type: error?.type || null,
        code: error?.code || null,
        param: error?.param || null,
        decline_code: error?.decline_code || null,
        message: error?.message || null,
        raw: error?.raw || null,
      },
    });
  }
};

export const processDuePayouts = async ({
  limit = 20,
  triggerSource = "cron",
} = {}) => {
  const payments = await getDuePayoutPaymentsModel(limit);
  const results = [];

  for (const payment of payments) {
    try {
      const result = await releasePayoutForPayment({
        paymentId: payment.payment_id,
        triggerSource,
        allowedStatuses: ["PENDING"],
      });
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        payment_id: payment.payment_id,
        message: error?.message || "Failed to process payout",
      });
    }
  }

  return {
    total_due: payments.length,
    processed_count: results.filter((item) => item.success && !item.already_processed).length,
    failed_count: results.filter((item) => !item.success).length,
    results,
  };
};

export { PayoutProcessingError };
