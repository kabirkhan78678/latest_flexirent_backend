import { addDataIntoTable, deleteDataByLable, getDataByLabel, hardDeleteNotificationsByReceiver, updateDataByLabel } from "../models/commonModels.js";
import { NotificationTypes, StatusCode } from "../utils/constant.js";
import { DB_TABLE, Message } from "../utils/Messages.js";
import { handleError, handleSuccess } from "../utils/responseHandler.js";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import {
  __dirname,
  hashPassword,
  generateToken,
  comparePassword,
  sendVerificationEmail,
  randomStringAsBase64Url,
  sendPaymentVerificationEmail,
  sendBookingCancelledEmail,
  encodeId,
  sendSubHostCredentialsEmail,
  generateStrongPassword,
} from "../utils/user_helper.js";
import {
  createPropertyOfferMasterModel, fetchOfferPropertyListModel, updateOfferIsActiveModel, updatePropertyOfferModel, expireActiveSubscriptions, fetchallPropertyInquiriesModel, getActiveSubscriptionByHostId, getAllAccoumodationCategory, getAllBookingOfHost, getAllMyProperty, getAllPropertySafety, getAllSafety, getAllSubHostByHostId, getAmenitits, getBooking, getBookingByIdOfHost, getCleaningProperty, getHostDashboardCounts, getHostListingCount, getHostRecentBookings, getHostReviews, getHostReviewsCount, getHouseRulesByIds, getIdealFor, getKycDoc, getMyReportsModel, getPropertyAmenitits, getPropertyIdealFor, getSubHostIdsByHostId, getSubscriptionBySessionId, getSubscriptionPlanById, getSupportQueryByidModel, getSupportQueryModel, getSupportTicketModel, getTodaysCheckOutListSchema, getTotalListingsCount, getUserByActToken,
  updateAllBooking,
  getHostPropertiesWithoutOffer,
  getHostNotifications
} from "../models/hostModel.js";
import { error } from "console";
import { deleteProfileImage } from "../middleware/deleteImage.js";
import { getDataByLabel2 } from "../models/adminModel.js";
import { getHostPayoutHistoryModel } from "../models/payoutModel.js";
import { check } from "express-validator";
import { getAllHostIds, subHostPermission } from "../utils/misc.util.js";
import Stripe from "stripe";

import { pushAndStoreNotification } from "../utils/notification.js";

import { getActiveOfferByPropertyId } from "../models/usersModel.js";

const BASE_URL = process.env.BASE_URL;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const buildStripeAccountStatus = (account) => {
  if (!account) return null;

  return {
    stripe_account_id: account.id,
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    individual_verification_status:
      account.individual?.verification?.status || null,
    country: account.country || null,
    default_currency: account.default_currency || null,
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

const isStripePayoutReady = (accountStatus) => {
  return Boolean(
    accountStatus?.stripe_account_id &&
    accountStatus?.capabilities?.transfers === "active" &&
    accountStatus?.payouts_enabled
  );
};

const isStripeKycCompleted = (account) => {
  if (!account) return false;

  const currentlyDue = account.requirements?.currently_due || [];
  const pastDue = account.requirements?.past_due || [];
  const pendingVerification = account.requirements?.pending_verification || [];

  return Boolean(
    account.details_submitted &&
    currentlyDue.length === 0 &&
    pastDue.length === 0 &&
    pendingVerification.length === 0
  );
};

const hasStripeBankAccount = (account) => {
  return Boolean(account?.external_accounts?.data?.length);
};

const STRIPE_DEFAULT_CURRENCY_BY_COUNTRY = {
  AT: "eur",
  AU: "aud",
  BE: "eur",
  CA: "cad",
  CH: "chf",
  CY: "eur",
  DE: "eur",
  DK: "dkk",
  EE: "eur",
  ES: "eur",
  FI: "eur",
  FR: "eur",
  GB: "gbp",
  GR: "eur",
  HK: "hkd",
  HR: "eur",
  HU: "huf",
  IE: "eur",
  IN: "inr",
  IT: "eur",
  JP: "jpy",
  LT: "eur",
  LU: "eur",
  LV: "eur",
  MT: "eur",
  MX: "mxn",
  NL: "eur",
  NO: "nok",
  NZ: "nzd",
  PL: "pln",
  PT: "eur",
  RO: "ron",
  SE: "sek",
  SG: "sgd",
  SI: "eur",
  SK: "eur",
  US: "usd",
  AE: "aed",
};

const STRIPE_ALLOWED_BANK_CURRENCIES_BY_COUNTRY = {
  ES: ["eur"],
  FR: ["eur"],
  DE: ["eur"],
  IT: ["eur"],
  PT: ["eur"],
  NL: ["eur"],
  BE: ["eur"],
  IE: ["eur"],
  AT: ["eur"],
  FI: ["eur"],
  GR: ["eur"],
  LU: ["eur"],
  SE: ["sek"],
  US: ["usd"],
};

const getAllowedStripeBankCurrencies = (country) => {
  const normalizedCountry = normalizeStripeCountry(country);

  if (!normalizedCountry) {
    return null;
  }

  const explicitAllowedCurrencies =
    STRIPE_ALLOWED_BANK_CURRENCIES_BY_COUNTRY[normalizedCountry];

  if (explicitAllowedCurrencies?.length) {
    return explicitAllowedCurrencies;
  }

  const defaultCurrency = STRIPE_DEFAULT_CURRENCY_BY_COUNTRY[normalizedCountry];

  if (defaultCurrency) {
    return [defaultCurrency];
  }

  return null;
};

const sanitizeStripeValue = (value) => {
  if (typeof value !== "string") return value;

  const trimmedValue = value.trim();

  if (
    trimmedValue.length >= 2 &&
    ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
      (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")))
  ) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
};

const normalizeStripeCountry = (value) => {
  if (value == null) return null;

  const normalizedValue = String(sanitizeStripeValue(value)).trim().toUpperCase();
  return normalizedValue || null;
};

const normalizeStripeCurrency = (value) => {
  if (value == null) return null;

  const normalizedValue = String(sanitizeStripeValue(value)).trim().toLowerCase();
  return normalizedValue || null;
};

const normalizeStripeDob = (value) => {
  if (!value || typeof value !== "string") return null;

  const normalizedValue = sanitizeStripeValue(value);

  if (!normalizedValue) return null;

  const dobParts = normalizedValue.split(/[-/]/).map((part) => part.trim());

  if (dobParts.length !== 3) return null;

  const [day, month, year] = dobParts;

  if (!day || !month || !year) return null;

  return { day, month, year };
};

const getStripeRequestField = (body, path) => {
  if (!body) return undefined;

  if (Object.prototype.hasOwnProperty.call(body, path)) {
    return body[path];
  }

  const bracketPath = path.split(".").reduce((acc, part, index) => {
    return index === 0 ? part : `${acc}[${part}]`;
  }, "");

  if (Object.prototype.hasOwnProperty.call(body, bracketPath)) {
    return body[bracketPath];
  }

  return path.split(".").reduce((value, key) => {
    if (value == null) return undefined;
    return value[key];
  }, body);
};

const toBoolean = (value) => {
  const normalizedInput = sanitizeStripeValue(value);

  if (typeof normalizedInput === "boolean") return normalizedInput;
  if (typeof normalizedInput === "number") return normalizedInput === 1;
  if (typeof normalizedInput !== "string") return false;

  return ["true", "1", "yes", "on"].includes(normalizedInput.trim().toLowerCase());
};

const sanitizeStripeObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, itemValue]) => [key, sanitizeStripeValue(itemValue)])
  );
};

const sanitizeStripeNumberLike = (value) => {
  const sanitizedValue = sanitizeStripeValue(value);
  return sanitizedValue == null ? sanitizedValue : String(sanitizedValue).trim();
};

const sanitizeStripeText = (value) => {
  const sanitizedValue = sanitizeStripeValue(value);
  return sanitizedValue == null ? sanitizedValue : String(sanitizedValue).trim();
};

const sanitizeStripeUrl = (value) => {
  const sanitizedValue = sanitizeStripeValue(value);
  return sanitizedValue == null ? sanitizedValue : String(sanitizedValue).trim();
};

const isValidStripeEmail = (value) => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isValidStripePhone = (value) => {
  if (!value) return false;
  return /^\+?[0-9()\-\s]{6,20}$/.test(value);
};

const isValidStripeUrl = (value) => {
  if (!value) return false;

  try {
    const parsedUrl = new URL(value);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

const isValidStripeCountryCode = (value) => {
  if (!value) return false;
  return /^[A-Z]{2}$/.test(normalizeStripeCountry(value));
};

const isValidStripeMcc = (value) => {
  if (!value) return false;
  return /^\d{4}$/.test(String(value).trim());
};

const isValidStripeRoutingNumber = (value) => {
  if (!value) return false;
  return /^\d{9}$/.test(String(value).trim());
};

const isValidStripeBankAccountNumber = (value) => {
  if (!value) return false;
  return /^[A-Za-z0-9]{4,34}$/.test(String(value).replace(/\s+/g, ""));
};

const isValidStripeDobObject = (dob) => {
  if (!dob?.day || !dob?.month || !dob?.year) {
    return { valid: false, message: "dob must be in DD-MM-YYYY format" };
  }

  const day = Number(dob.day);
  const month = Number(dob.month);
  const year = Number(dob.year);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    day < 1 ||
    month < 1 ||
    month > 12 ||
    year < 1900
  ) {
    return { valid: false, message: "dob must be a valid date" };
  }

  const dobDate = new Date(year, month - 1, day);

  if (
    dobDate.getFullYear() !== year ||
    dobDate.getMonth() !== month - 1 ||
    dobDate.getDate() !== day
  ) {
    return { valid: false, message: "dob must be a valid date" };
  }

  const today = new Date();

  if (dobDate > today) {
    return { valid: false, message: "dob cannot be in the future" };
  }

  return { valid: true };
};

const buildStripeSetupValidationErrors = ({
  firstName,
  lastName,
  email,
  phoneNumber,
  dob,
  hasDob,
  address,
  hasAddress,
  bankAccountNumber,
  routingNumber,
  bankCountry,
  stripeAccountCountry,
  businessProfile,
  acceptTosRaw,
}) => {
  const errors = [];

  if (firstName != null && !firstName) {
    errors.push({ field: "first_name", message: "first_name cannot be empty" });
  }

  if (lastName != null && !lastName) {
    errors.push({ field: "last_name", message: "last_name cannot be empty" });
  }

  if (email != null && !isValidStripeEmail(email)) {
    errors.push({ field: "email", message: "email must be valid" });
  }

  if (phoneNumber != null && !isValidStripePhone(phoneNumber)) {
    errors.push({ field: "phone_number", message: "phone_number must be valid" });
  }

  if (hasDob) {
    const dobValidation = isValidStripeDobObject(dob);
    if (!dobValidation.valid) {
      errors.push({ field: "dob", message: dobValidation.message });
    }
  }

  if (hasAddress) {
    if (!address?.line1) {
      errors.push({ field: "address", message: "address is required" });
    }
    if (!address?.city) {
      errors.push({ field: "city", message: "city is required" });
    }
    if (!address?.state) {
      errors.push({ field: "state", message: "state is required" });
    }
    if (!address?.postal_code) {
      errors.push({ field: "postal_code", message: "postal_code is required" });
    }
    if (!address?.country) {
      errors.push({ field: "country", message: "country is required" });
    } else if (!isValidStripeCountryCode(address.country)) {
      errors.push({ field: "country", message: "country must be a valid 2-letter ISO code" });
    }
  }

  if (businessProfile?.mcc && !isValidStripeMcc(businessProfile.mcc)) {
    errors.push({ field: "business_profile", message: "business_profile must be a valid 4-digit MCC code" });
  }

  if (businessProfile?.url && !isValidStripeUrl(businessProfile.url)) {
    errors.push({ field: "business_url", message: "business_url must be a valid http or https URL" });
  }

  if (acceptTosRaw != null && acceptTosRaw !== "" && !toBoolean(acceptTosRaw)) {
    errors.push({
      field: "stripe_terms_accepted",
      message: "stripe_terms_accepted must be true to accept Stripe terms"
    });
  }

  if (bankAccountNumber && !isValidStripeBankAccountNumber(bankAccountNumber)) {
    errors.push({
      field: "bank_account_number",
      message: "bank_account_number must be a valid bank account or IBAN value"
    });
  }

  if (bankCountry && !isValidStripeCountryCode(bankCountry)) {
    errors.push({
      field: "country",
      message: "country must be a valid 2-letter ISO code"
    });
  }

  if (
    bankAccountNumber &&
    bankCountry &&
    stripeAccountCountry &&
    normalizeStripeCountry(bankCountry) !== normalizeStripeCountry(stripeAccountCountry)
  ) {
    errors.push({
      field: "bank_country",
      message: `This Stripe account is created for ${normalizeStripeCountry(
        stripeAccountCountry
      )}. Please use a bank account from the same country or create a new Stripe account for ${normalizeStripeCountry(
        bankCountry
      )}.`
    });
  }

  if (
    stripeBankCountryRequiresRoutingNumber(bankCountry) &&
    !routingNumber
  ) {
    errors.push({
      field: "bank_routing_number",
      message: "bank_routing_number is required for bank accounts in this country"
    });
  } else if (routingNumber && !isValidStripeRoutingNumber(routingNumber)) {
    errors.push({
      field: "bank_routing_number",
      message: "bank_routing_number must be a valid 9-digit routing number"
    });
  }

  return errors;
};

const getRequestIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
};

const getStripeCountry = ({ body, query, account = null, host = null }) => {
  return (
    normalizeStripeCountry(getStripeRequestField(body, "country")) ||
    normalizeStripeCountry(getStripeRequestField(body, "address.country")) ||
    normalizeStripeCountry(query?.country) ||
    normalizeStripeCountry(host?.country) ||
    normalizeStripeCountry(account?.country) ||
    null
  );
};

const getStripeBankCountry = ({ body, query, account = null, host = null }) => {
  return (
    normalizeStripeCountry(getStripeRequestField(body, "bank_country")) ||
    normalizeStripeCountry(getStripeRequestField(body, "country")) ||
    normalizeStripeCountry(getStripeRequestField(body, "address.country")) ||
    normalizeStripeCountry(query?.bank_country) ||
    normalizeStripeCountry(query?.country) ||
    normalizeStripeCountry(account?.country) ||
    normalizeStripeCountry(host?.country) ||
    normalizeStripeCountry(process.env.STRIPE_CONNECT_COUNTRY) ||
    "US"
  );
};

const getStripeBankCurrency = ({ account = null, country = null, currency = null }) => {
  const normalizedCountry =
    normalizeStripeCountry(country) ||
    normalizeStripeCountry(account?.country) ||
    normalizeStripeCountry(process.env.STRIPE_CONNECT_COUNTRY) ||
    "US";

  const allowedCurrencies = getAllowedStripeBankCurrencies(normalizedCountry);
  const explicitCurrency = normalizeStripeCurrency(currency);

  if (explicitCurrency && (!allowedCurrencies || allowedCurrencies.includes(explicitCurrency))) {
    return explicitCurrency;
  }

  const accountDefaultCurrency = normalizeStripeCurrency(account?.default_currency);

  if (
    accountDefaultCurrency &&
    (!allowedCurrencies || allowedCurrencies.includes(accountDefaultCurrency))
  ) {
    return accountDefaultCurrency;
  }

  const mappedCurrency = STRIPE_DEFAULT_CURRENCY_BY_COUNTRY[normalizedCountry];

  if (mappedCurrency && (!allowedCurrencies || allowedCurrencies.includes(mappedCurrency))) {
    return mappedCurrency;
  }

  const envCurrency = normalizeStripeCurrency(process.env.STRIPE_CONNECT_CURRENCY);

  if (envCurrency && (!allowedCurrencies || allowedCurrencies.includes(envCurrency))) {
    return envCurrency;
  }

  if (allowedCurrencies?.length) {
    return allowedCurrencies[0];
  }

  return envCurrency || mappedCurrency || "usd";
};

const stripeBankCountryRequiresRoutingNumber = (country) => {
  const normalizedCountry = normalizeStripeCountry(country);
  return ["US"].includes(normalizedCountry);
};

const isStripeIdentityVerified = (account) => {
  return account?.individual?.verification?.status === "verified";
};

const getStripeSetupMessage = ({
  accountCreated,
  kycUpdated,
  documentUploaded,
  bankAdded,
  businessProfileUpdated,
  tosAcceptanceUpdated,
  account
}) => {
  if (accountCreated) {
    return "Stripe account created successfully";
  }

  if (
    kycUpdated ||
    documentUploaded ||
    bankAdded ||
    businessProfileUpdated ||
    tosAcceptanceUpdated
  ) {
    return "Stripe account updated successfully";
  }

  if (isStripeKycCompleted(account)) {
    return "You have already completed KYC";
  }

  return "You already have Stripe account";
};

const buildStripeSetupSummary = (account, extra = {}) => {
  const accountStatus = buildStripeAccountStatus(account);

  return {
    has_stripe_account: Boolean(account?.id),
    stripe_account_id: account?.id || null,
    has_bank_account: hasStripeBankAccount(account),
    kyc_completed: isStripeKycCompleted(account),
    onboarding_required: !isStripePayoutReady(accountStatus),
    account_status: accountStatus,
    ...extra,
  };
};

const buildStripeExternalBankAccountPayload = ({
  iban,
  country,
  currency,
  accountHolderName,
  routingNumber,
}) => {
  return {
    object: "bank_account",
    country,
    currency,
    account_holder_name: accountHolderName,
    account_holder_type: "individual",
    account_number: iban,
    ...(routingNumber ? { routing_number: routingNumber } : {}),
  };
};

const needsStripeCapabilityRequest = (account) => {
  if (!account) return true;

  return (
    account.capabilities?.card_payments == null ||
    account.capabilities?.transfers == null
  );
};

const buildStripeConnectResponse = async (stripeAccountId, existingAccount = null) => {
  const cancelUrl = `${BASE_URL}host/stripe-onboarding-cancel?account_id=${encodeURIComponent(
    stripeAccountId
  )}`;
  const successUrl = `${BASE_URL}host/stripe-onboarding-success?account_id=${encodeURIComponent(
    stripeAccountId
  )}`;

  let account = existingAccount;

  if (!account) {
    account = await stripe.accounts.retrieve(stripeAccountId);
  }

  if (needsStripeCapabilityRequest(account)) {
    await stripe.accounts.update(stripeAccountId, {
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    account = await stripe.accounts.retrieve(stripeAccountId);
  }

  const accountStatus = buildStripeAccountStatus(account);

  if (isStripePayoutReady(accountStatus)) {
    return {
      has_stripe_account: true,
      stripe_account_id: stripeAccountId,
      account_created: true,
      onboarding_required: false,
      onboarding_url: null,
      cancel_url: cancelUrl,
      account_status: accountStatus,
    };
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: cancelUrl,
    return_url: successUrl,
    type: "account_onboarding",
  });

  const launchUrl = `${BASE_URL}host/stripe-onboarding-launch?redirect=${encodeURIComponent(
    accountLink.url
  )}&cancel=${encodeURIComponent(cancelUrl)}`;

  return {
    has_stripe_account: true,
    stripe_account_id: stripeAccountId,
    account_created: true,
    onboarding_required: true,
    onboarding_url: accountLink.url,
    launch_url: launchUrl,
    cancel_url: cancelUrl,
    account_status: accountStatus,
  };
};

const getPlanEndDate = (startDate, duration) => {
  const d = new Date(startDate);
  if (duration === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
};

export const hostEmailVarify = async (req, res) => {
  try {
    const act_token = req?.params?.act_token || "";
    if (!act_token) {
      return handleError(res, StatusCode.status400, Message.INVALID_URL);
    } else {
      const userDetails = await getDataByLabel(
        DB_TABLE.host,
        "act_token",
        act_token
      );
      if (userDetails?.length == 0) {
        return res.sendFile(path.join(__dirname, "../view/notverify.html"));
      };
      const data = {
        is_verify: 1,
        act_token: "",
      };
      const result = await updateDataByLabel(
        DB_TABLE?.host,
        data,
        "host_id",
        userDetails[0]?.host_id
      );
      if (result?.affectedRows)
        return res.sendFile(path.join(__dirname, "../view/verify.html"));
      else
        return res.sendFile(path.join(__dirname, "../view/notverify.html"));
    };
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const fetchProfile = async (req, res) => {
  try {
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);
    const [listing] = await getTotalListingsCount(userId);

    const finalData = userDetails?.map((item, i) => {
      return {
        ...item,
        profile_image: item?.profile_image
          ? `${process.env.BASE_URL}profile/${item?.profile_image}`
          : "",
        total_listing: listing?.total_listing || 0,
      };
    });
    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      finalData[0]
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      about, owner_type, business_name, address
    } = req.body;
    const file = req.file;
    const userId = req.user?.host_id;
    let data = {
      first_name,
      last_name,
      phone,
      about,
      owner_type,
      business_name, address
    };
    console.log({ file });
    if (file) {
      data.profile_image = file?.filename;
    }
    const result = await updateDataByLabel(DB_TABLE.host, data, "host_id", userId);
    if (result?.affectedRows) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.profileUpdatedSuccessfully
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.profileUpdateFailed
      );
    }
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);
    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.USER_NOT_FOUND);
    }
    const isMatch = await comparePassword(
      current_password,
      userDetails[0]?.password
    );
    if (!isMatch) {
      return handleError(
        res,
        StatusCode.status400,
        Message.currentPasswordIncorrect
      );
    }
    const hash = await hashPassword(new_password);
    const data = { password: hash };
    const result = await updateDataByLabel(
      DB_TABLE.host,
      data,
      "host_id",
      userDetails[0].host_id
    );
    if (result?.affectedRows) {
      return handleSuccess(res, StatusCode.status200, Message.passwordChanged);
    } else {
      return handleError(res, StatusCode.status400, Message.passwordNotChanged);
    }
  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const createNewProperty = async (req, res) => {
  try {
    console.log("req.body", req.body);
    const {
      owner_type, category_id, property_title, property_description,
      floor, address, post_code, bedrooms, bathrooms, beds, square_foot,
      amenities, safety_amenities, ideal_for, check_in, check_out,
      house_rules, monthly_rent, security_deposit, available_from, min_stay_duration, max_person, cleaning_fee_type, cleaning_fee, location, country, state, monthly_rent_type, latitude, longitude
    } = req.body || {};

    const host_id = req.user?.host_id;
    const uploadedFiles = req.files;

    const [activeSubscription] = await getActiveSubscriptionByHostId(host_id);
    // if (!activeSubscription) {
    //   return handleError(res, StatusCode.status400, Message.subscriptionRequired);
    // }

    const [listingCount] = await getHostListingCount(host_id);
    // const maxListings = activeSubscription.max_listings;
    // if (maxListings !== "unlimited" && listingCount?.total_listing >= parseInt(maxListings, 10)) {
    //   return handleError(res, StatusCode.status400, Message.listingLimitReached);
    // }

    // Extract files from the specific fields
    const imageFiles = uploadedFiles?.file || [];
    const videoFiles = uploadedFiles?.videoFile || [];

    if (imageFiles.length === 0) {
      return handleError(res, StatusCode.status400, Message.msgImageError);
    }

    const categoryDetails = await getDataByLabel(DB_TABLE.accomodationCategory, "category_id", category_id);

    if (!categoryDetails || categoryDetails.length === 0) {
      return handleError(res, StatusCode.status400, Message.msgCategoryNotFound);
    }

    const data = {
      host_id,
      list_type: 2,
      list_status: 1,
      owner_type,
      category_id,
      property_title,
      property_description,
      floor,
      address,
      post_code,
      bedrooms,
      bathrooms,
      beds,
      square_foot,
      amenities,
      safety_amenities,
      ideal_for,
      check_in,
      check_out,
      house_rules,
      monthly_rent,
      security_deposit,
      available_from,
      min_stay_duration,
      updated_at: new Date(),
      video_url: videoFiles.length > 0 ? videoFiles[0].filename : null,  // optional
      max_person,
      cleaning_fee_type,
      cleaning_fee,
      location,
      country,
      state,
      monthly_rent_type,
      latitude,
      longitude
    };

    const add_property = await addDataIntoTable(DB_TABLE.property, data);

    if (add_property?.affectedRows > 0) {
      await Promise.all(
        imageFiles.map(async (item) => {
          const imageData = {
            property_id: add_property.insertId,
            image: item.filename,
          };
          await addDataIntoTable(DB_TABLE.propertyImage, imageData);
        })
      );

      return handleSuccess(res, StatusCode.status200, Message.msgPropertyAddedSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.failedToUsersCreate);
    }

  } catch (error) {
    console.error("Error in createNewProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const createPropertyListing = async (req, res) => {
  try {
    const { website_address, post_code, floor, address, latitude, longitude } = req.body || {};
    const host_id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const [activeSubscription] = await getActiveSubscriptionByHostId(host_id);
    // if (!activeSubscription) {
    //   return handleError(res, StatusCode.status400, Message.subscriptionRequired);
    // }

    const [listingCount] = await getHostListingCount(host_id);
    // const maxListings = activeSubscription.max_listings;
    // if (maxListings !== "unlimited" && listingCount?.total_listing >= parseInt(maxListings, 10)) {
    //   return handleError(res, StatusCode.status400, Message.listingLimitReached);
    // }


    const data = {
      host_id,
      list_type: 1,
      list_status: 0,
      website_address,
      post_code,
      floor,
      address,
      latitude,
      longitude
    }

    const add_property = await addDataIntoTable(DB_TABLE.property, data);

    if (add_property?.affectedRows > 0) {

      const [adminDetails] = await getDataByLabel(DB_TABLE.admin, "admin_id", 1);

      await pushAndStoreNotification({
        sender_id: host_id,
        sender_type: "host",
        receiver_id: adminDetails.admin_id,
        receiver_type: "admin",
        title: "New Property Listing",
        message: `${userDetails[0].first_name} added a new property listing`,
        reference_id: add_property.insertId,
        reference_type: "property",
        notification_type: "PROPERTY_CREATED",
        // fcm_token: adminDetails?.fcm_token
        fcm_token: 'Testing_admin_fcm_token'

      });

      return handleSuccess(
        res,
        StatusCode.status200,
        Message.msgPropertyAddedSuccess
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.failedToUsersCreate
      );
    }

  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllMyPropetyListing = async (req, res) => {
  try {
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }


    const all_ids = await getAllHostIds(userDetails);
    let property = await getAllMyProperty(all_ids);

    if (!property?.length) {
      return handleError(res, StatusCode.status200, Message.dataNotFound, property);
    }

    await Promise.all(
      property.map(async (item) => {
        if (Number(item.list_status) === 1 && Number(item.list_type) === 1) {
          item.list_type = 2;
        }

        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((item, i) => {
          return {
            ...item,
            image: item?.image
              ? `${process.env.BASE_URL}profile/${item?.image}`
              : "",
          };
        });
        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }


        const offer = await getActiveOfferByPropertyId(item.property_id);
        if (offer) {
          item.offer_value = offer.offer_value;
          item.offer_type = offer.offer_type;
          item.offer_start_date = offer.start_date;
          item.offer_end_date = offer.end_date;
        } else {
          item.offer_value = null;
          item.offer_type = null;
          item.offer_start_date = null;
          item.offer_end_date = null;
        }
      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      property
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};



export const updateBookingStatus = async (req, res) => {
  try {
    const { booking_id, booking_status, cancellation_reason } = req.body || {};
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const bookingDetails = await getBooking(booking_id)

    if (!bookingDetails?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);

    const data = {
      booking_status,
      cancellation_reason: booking_status == 1 ? null : cancellation_reason,
      updated_at: booking_status == 1 ? null : new Date()
    }

    const result = await updateDataByLabel(
      DB_TABLE.booking, data, "booking_id", booking_id
    );

    const act_token = encodeId(booking_id);

    console.log("email", bookingDetails[0].email)

    if (result?.affectedRows) {

      await pushAndStoreNotification({
        sender_id: userId,
        sender_type: "host",
        receiver_id: bookingDetails[0].user_id,
        receiver_type: "user",
        title: booking_status == 1 ? "Booking Approved" : "Booking Rejected",
        message: `Your booking for ${bookingDetails[0].property_title} has been ${booking_status == 1 ? "approved" : "rejected"}`,
        reference_id: booking_id,
        reference_type: "booking",
        notification_type: booking_status == 1 ? NotificationTypes.BOOKING_APPROVED : NotificationTypes.BOOKING_REJECTED,
        // fcm_token: bookingDetails[0].user_fcm_token
        fcm_token: 'Testing_user_fcm_token'

      });
      if (booking_status == 1) {
        await updateAllBooking(booking_id, bookingDetails[0].booked_from);
        await sendPaymentVerificationEmail(`${bookingDetails[0].first_name} ${bookingDetails[0].last_name}`, bookingDetails[0].email, res, booking_id, bookingDetails[0].property_title, bookingDetails[0].booked_from, bookingDetails[0].booked_to, bookingDetails[0].guest, bookingDetails[0].total_price);
      } else {
        await sendBookingCancelledEmail(`${bookingDetails[0].first_name} ${bookingDetails[0].last_name}`, bookingDetails[0].email, res, booking_id, bookingDetails[0].property_title, bookingDetails[0].booked_from, bookingDetails[0].booked_to, bookingDetails[0].guest, cancellation_reason);
      }
    }

  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const getAllBooking = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const all_ids = await getAllHostIds(userDetails);


    const booking = await getAllBookingOfHost(all_ids);



    if (!booking?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, booking);
    }

    await Promise.all(
      booking.map(async (item) => {
        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((item, i) => {
          return {
            ...item,
            image: item?.image
              ? `${process.env.BASE_URL}profile/${item?.image}`
              : "",
          };

        });

        if (item.booked_to > new Date()) {
          item.isActive = true;
        } else if (item.booked_to < new Date()) {
          item.isActive = false;
        }


        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.user_image = item?.user_image ? `${process.env.BASE_URL}profile/${item?.user_image}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }

        if (item.doc_status != "NOT REQUESTED") {
          let doc = await getDataByLabel(DB_TABLE.bookingDocument, "booking_id", item.booking_id);
          doc?.map((item) => {
            item.file = item?.file ? `${process.env.BASE_URL}profile/${item?.file}` : "";
          })
          item.userDocument = doc;
        } else {
          item.userDocument = [];
        }

      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const uploadDocuments = async (req, res) => {
  try {
    const { title } = req.body || {};
    const userId = req.user?.host_id;
    const file = req.file ? req.file.filename : null;
    if (!file) {
      return handleError(res, StatusCode.status400, Message.msgImageError);
    }

    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);


    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const data = {
      id: userId,
      title,
      file,
      user_type: 2
    };

    const result = await addDataIntoTable(DB_TABLE.hostDocuments, data);

    if (result?.affectedRows) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.msgDocumentAddedSuccess
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.msgDocumentNotAdded
      );
    }

  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const getAllMyDocuments = async (req, res) => {
  try {
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    let document = await getKycDoc(userId);

    if (!document?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, document);
    }


    let finalData = document?.map((item, i) => {
      return {
        ...item,
        file: item?.file
          ? `${process.env.BASE_URL}profile/${item?.file}`
          : "",
      };
    });

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      finalData
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const forgotResetPassword = async (req, res) => {
  try {
    const act_token = req?.params?.act_token || "";

    if (!act_token) {
      return handleError(res, StatusCode.status400, Message.INVALID_URL);
    }

    const userDetails = await getDataByLabel(DB_TABLE.host, "act_token", act_token);

    if (!userDetails || userDetails.length === 0) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }


    return res.render(
      path.join(__dirname, "../view/forgetPasswordHost.ejs"),
      {
        msg: "",
        act_token,
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { password, confirm_password, act_token } = req.body;
    if (!password || !confirm_password || !act_token) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }


    const [userDetails] = await getUserByActToken(act_token);
    console.log(userDetails, act_token)
    if (!userDetails) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }

    const hash = await hashPassword(password);
    const data = { password: hash, act_token: null };
    const result = await updateDataByLabel(
      DB_TABLE.host,
      data,
      "host_id",
      userDetails.host_id
    );
    if (result?.affectedRows) {
      return res.sendFile(path.join(__dirname, "../view/password-reset-success.html"));
    } else {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }
  } catch (error) {
    console.log(error);

    res.render(path.join(__dirname, "/view/", "adminforgetPassword.ejs"), {
      msg: "Internal server error",
    });
  }
};

export const deleteMyProperty = async (req, res) => {
  try {
    const { property_id } = req.body || {};
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const propertyDetails = await getDataByLabel(DB_TABLE.property, "property_id", property_id);

    if (!propertyDetails?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);

    const data = {
      delete_flag: 1
    }

    const result = await updateDataByLabel(
      DB_TABLE.property, data, "property_id", property_id
    );

    if (result?.affectedRows) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.propertyDeleteSuccess
      );
    } else {
      return handleError(
        res,
        StatusCode.status200,
        Message.propertyDeleteFailure
      );
    }
  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const getAllCategory = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const category = await getAllAccoumodationCategory();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }


    let finalData = category?.map((item, i) => {
      return {
        ...item,
        image: item?.image
          ? `${process.env.BASE_URL}profile/${item?.image}`
          : "",
      };
    });

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      finalData
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllAmenties = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const category = await getAmenitits();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      category
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllSafetyAmenties = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const category = await getAllSafety();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      category
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};
export const getAllIdealFor = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const category = await getIdealFor();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      category
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateMyProperty = async (req, res) => {
  try {
    const {
      owner_type, category_id, property_title, property_description,
      bedrooms, bathrooms, beds, amenities, safety_amenities,
      ideal_for, check_in, check_out, house_rules,
      monthly_rent, security_deposit, min_stay_duration,
      deleteImageIds, property_id, max_person, cleaning_fee_type,
      cleaning_fee, location, country, state, monthly_rent_type
    } = req.body || {};

    const host_id = req.user?.host_id;
    const uploadedFiles = req.files || {};
    const imageFiles = uploadedFiles?.file || [];
    const videoFiles = uploadedFiles?.videoFile || [];

    const propertyDetails = await getDataByLabel(DB_TABLE.property, "property_id", property_id);
    if (!propertyDetails || propertyDetails.length <= 0) {
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);
    }

    const categoryDetails = await getDataByLabel(DB_TABLE.accomodationCategory, "category_id", category_id);
    if (!categoryDetails || categoryDetails.length <= 0) {
      return handleError(res, StatusCode.status400, Message.msgCategoryNotFound);
    }

    const data = {
      host_id,
      owner_type,
      category_id,
      property_title,
      property_description,
      bedrooms,
      bathrooms,
      beds,
      amenities,
      safety_amenities,
      ideal_for,
      check_in,
      check_out,
      house_rules,
      monthly_rent,
      security_deposit,
      min_stay_duration,
      updated_at: new Date(),
      max_person,
      cleaning_fee_type,
      cleaning_fee,
      video_url: videoFiles.length > 0
        ? videoFiles[0].filename
        : propertyDetails[0].video_url, // retain previous if not updated
      location,
      country,
      state,
      monthly_rent_type
    };

    const add_property = await updateDataByLabel(DB_TABLE.property, data, "property_id", property_id);

    if (add_property?.affectedRows > 0) {
      // Add new images
      if (imageFiles.length > 0) {
        await Promise.all(
          imageFiles.map(async (item) => {
            const imageData = {
              property_id,
              image: item.filename,
            };
            await addDataIntoTable(DB_TABLE.propertyImage, imageData);
          })
        );
      }

      // Delete images if requested
      if (deleteImageIds) {
        const ids = deleteImageIds.split(',');
        await Promise.all(
          ids.map(async (item) => {
            const image = await getDataByLabel(DB_TABLE.propertyImage, "property_image_id", item);
            if (image && image.length > 0) {
              await deleteProfileImage(image[0].image);
              await deleteDataByLable(DB_TABLE.propertyImage, "property_image_id", item);
            }
          })
        );
      }

      return handleSuccess(res, StatusCode.status200, Message.msgPropertyUpdateSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.failedToUsersCreate);
    }

  } catch (error) {
    console.error("Error in updateMyProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

// export const getBookingById = async (req, res) => {
//   try {
//     const id = req.user?.host_id;
//     const booking_id = req.params?.booking_id;
//     const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

//     if (!userDetails?.length)
//       return handleError(res, StatusCode.status400, Message.dataNotFound);

//     if (userDetails[0]?.is_verify == 0) {
//       return handleError(
//         res,
//         StatusCode.status400,
//         Message.userEmailNotVerified
//       );
//     }
//     if (userDetails[0]?.is_active == 0) {
//       return handleError(res, StatusCode.status400, Message.userBlocked);
//     }

//     const booking = await getBookingByIdOfHost(booking_id);



//     if (!booking?.length) {
//       return handleSuccess(res, StatusCode.status200, Message.dataNotFound, booking);
//     }

//     await Promise.all(
//       booking.map(async (item) => {
//         let image = await getDataByLabel(
//           DB_TABLE.propertyImage,
//           "property_id",
//           item.property_id
//         );

//         let finalData = image?.map((item, i) => {
//           return {
//             ...item,
//             image: item?.image
//               ? `${process.env.BASE_URL}profile/${item?.image}`
//               : "",
//           };

//         });

//         if (item.booked_to > new Date()) {
//           item.isActive = true;
//         } else if (item.booked_to < new Date()) {
//           item.isActive = false;
//         }


//         item.propertyImage = finalData;
//         item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
//           : "";
//         item.user_image = item?.user_image ? `${process.env.BASE_URL}profile/${item?.user_image}`
//           : "";
//         let amenities = item.amenities ? item.amenities.split(',') : [];
//         let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
//         let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
//         let house_rules = item.house_rules ? item.house_rules.split(',') : [];

//         if (Array.isArray(amenities) && amenities.length > 0) {
//           item.amenities_label = await getPropertyAmenitits(amenities);
//         }

//         if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
//           item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
//         }

//         if (Array.isArray(ideal_for) && ideal_for.length > 0) {
//           item.ideal_for_label = await getPropertyIdealFor(ideal_for);
//         }
//         if (Array.isArray(house_rules) && house_rules.length > 0) {
//           item.house_rules_label = await getHouseRulesByIds(house_rules);
//         }


//         const paymentDetails = await getDataByLabel(DB_TABLE.payment, "booking_id", item.booking_id);
//         if (paymentDetails?.length > 0) {
//           paymentDetails.map((payment) => {
//             payment.property_address = item.address;
//             payment.property_title = item.property_title;
//             payment.property_description = item.property_description;
//           })
//         }
//         item.paymentArray = paymentDetails

//         if (item.doc_status != "NOT REQUESTED") {
//           let doc = await getDataByLabel(DB_TABLE.bookingDocument, "booking_id", item.booking_id);
//           doc?.map((item) => {
//             item.file = item?.file ? `${process.env.BASE_URL}profile/${item?.file}` : "";
//           })
//           item.userDocument = doc;
//         } else {
//           item.userDocument = [];
//         }

//       })
//     );

//     return handleSuccess(
//       res,
//       StatusCode.status200,
//       Message.dataFoundSuccessful,
//       booking[0]
//     );


//   } catch (error) {
//     console.log("Error :", error);
//     return handleError(
//       res,
//       StatusCode.status500,
//       Message.INTERNAL_SERVER_ERROR
//     );
//   }
// };


export const getBookingById = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const booking_id = req.params?.booking_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const booking = await getBookingByIdOfHost(booking_id);



    if (!booking?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, booking);
    }

    await Promise.all(
      booking.map(async (item) => {
        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((item, i) => {
          return {
            ...item,
            image: item?.image
              ? `${process.env.BASE_URL}profile/${item?.image}`
              : "",
          };

        });

        if (item.booked_to > new Date()) {
          item.isActive = true;
        } else if (item.booked_to < new Date()) {
          item.isActive = false;
        }


        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.user_image = item?.user_image ? `${process.env.BASE_URL}profile/${item?.user_image}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }


        const paymentDetails = await getDataByLabel(DB_TABLE.payment, "booking_id", item.booking_id);
        if (paymentDetails?.length > 0) {
          paymentDetails.map((payment) => {
            payment.property_address = item.address;
            payment.property_title = item.property_title;
            payment.property_description = item.property_description;
          })
        }
        item.paymentArray = paymentDetails

        if (item.doc_status != "NOT REQUESTED") {
          let doc = await getDataByLabel(DB_TABLE.bookingDocument, "booking_id", item.booking_id);
          doc?.map((item) => {
            item.file = item?.file ? `${process.env.BASE_URL}profile/${item?.file}` : "";
          })
          item.userDocument = doc;
        } else {
          item.userDocument = [];
        }

        const offer = await getActiveOfferByPropertyId(item.property_id);
        if (offer) {
          item.offer_value = offer.offer_value;
          item.offer_type = offer.offer_type;
          item.offer_start_date = offer.start_date;
          item.offer_end_date = offer.end_date;
        } else {
          item.offer_value = null;
          item.offer_type = null;
          item.offer_start_date = null;
          item.offer_end_date = null;
        }



      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking[0]
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const supportTicket = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const { message, property_id, host_id } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const data = {
      id,
      message,
      property_id: property_id ? property_id : 0,
      host_id: host_id ? host_id : 0,
      user_type: 2
    };

    const ticket = await addDataIntoTable(DB_TABLE.supportTicket, data);

    if (ticket?.affectedRows > 0) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.contactUsSuccessful
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.dataNotFound
      );
    }
  } catch (error) {
    console.error("Error in updateMyProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}

export const getSupportTicket = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }


    const all_ids = await getAllHostIds(userDetails);


    const ticket = await getSupportTicketModel(all_ids);

    if (ticket?.length > 0) {


      await Promise.all(ticket.map(async (item) => {
        item.reply_message = item.reply_message ? JSON.parse(item.reply_message) : [];
      }));

      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        ticket
      );
    } else {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        ticket
      );
    }
  } catch (error) {
    console.error("Error in updateMyProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}


export const getSupportQuery = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const all_ids = await getAllHostIds(userDetails);

    const ticket = await getSupportQueryModel(all_ids);

    if (ticket?.length > 0) {

      await Promise.all(ticket.map(async (item) => {
        item.reply_message = item.reply_message ? JSON.parse(item.reply_message) : [];
      }));

      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        ticket
      );
    } else {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        ticket
      );
    }
  } catch (error) {
    console.error("Error in updateMyProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}

export const getSupportTicketById = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const ticket_id = req.params?.ticket_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const ticket = await getSupportQueryByidModel(ticket_id);

    if (ticket?.length > 0) {
      await Promise.all(ticket.map(async (item) => {
        item.reply_message = item.reply_message ? JSON.parse(item.reply_message) : [];
      }));
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        ticket[0]
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.dataNotFound
      );
    }
  } catch (error) {
    console.error("Error in updateMyProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}

export const supportTicketReply = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const { reply_message, ticket_id } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const supportTicket = await getDataByLabel(DB_TABLE.supportTicket, "ticket_id", ticket_id);

    if (!supportTicket?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const message = { "role": "host", "message": reply_message, "created_at": new Date() };
    let messages = [];
    let reply = "";

    if (supportTicket[0].reply_message == null) {
      messages = [message];
      reply = JSON.stringify(messages);
    } else {
      messages = JSON.parse(supportTicket[0].reply_message);
      messages.push(message);
      reply = JSON.stringify(messages);
    }

    const data = {
      reply_message: reply,
      status: 1,
      reply_date: new Date(),
    };

    const ticket = await updateDataByLabel(DB_TABLE.supportTicket, data, "ticket_id", ticket_id);

    if (ticket?.affectedRows > 0) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.queryReplySuccess
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.failedToQueryReply
      );
    }
  } catch (error) {
    console.error("Error in updateMyProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}

export const requesteForBookingDocument = async (req, res) => {
  try {
    const { booking_id, requested_doc } = req.body || {};
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const bookingDetails = await getBooking(booking_id)

    if (!bookingDetails?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);

    if (bookingDetails[0].booking_status != 0) {
      return handleError(res, StatusCode.status400, Message.propertyNotPendingStatus);
    }

    const data = {
      requested_doc,
      doc_status: "REQUESTED"
    }

    const result = await updateDataByLabel(
      DB_TABLE.booking, data, "booking_id", booking_id
    );


    return handleSuccess(
      res,
      StatusCode.status200,
      Message.documentRequestedSuccessfully
    );


  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const addSubHost = async (req, res) => {
  try {
    let { permission, first_name, last_name, email, mobile } = req.body;
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const password = generateStrongPassword();


    const check = await getDataByLabel(DB_TABLE.host, "email", email);

    if (check.length <= 0) {
      const hash = await hashPassword(password);

      const act_token = crypto.randomBytes(16).toString("hex");

      const data = {
        first_name, last_name,
        email, password: hash,
        phone: mobile,
        user_type: 3,
        act_token,
        added_by: userId
      }
      const add = await addDataIntoTable(DB_TABLE.host, data);

      if (add?.affectedRows > 0) {

        if (permission.length > 0) {
          let result = await Promise.all(
            permission.map(async (item) => {
              const data = {
                host_id: add.insertId,
                type: item,
                is_add: 1,
                is_view: 1,
                is_edit: 1,
                is_delete: 1
              }
              let addPermission = await addDataIntoTable(DB_TABLE.hostPermission, data);

            })
          )
        }

        // return handleSuccess(res, StatusCode.status200, Message.msgSubAdminAdded);
        await sendSubHostCredentialsEmail(act_token, email, password, res);
      } else {
        return handleError(res, StatusCode.status400, Message.msgSubAdminAdded);
      }
    } else {
      return handleError(res, StatusCode.status404, Message.hostEmailAlreadyExist);
    }
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const subHostEmailVarify = async (req, res) => {
  try {
    const act_token = req?.params?.act_token || "";
    if (!act_token) {
      return handleError(res, StatusCode.status400, Message.INVALID_URL);
    } else {
      const userDetails = await getDataByLabel(
        DB_TABLE.host,
        "act_token",
        act_token
      );
      if (userDetails?.length == 0) {
        return res.sendFile(path.join(__dirname, "../view/notverify.html"));
      };
      const data = {
        is_verify: 1,
        act_token: "",
      };
      const result = await updateDataByLabel(
        DB_TABLE?.host,
        data,
        "host_id",
        userDetails[0]?.host_id
      );
      if (result?.affectedRows)
        return res.sendFile(path.join(__dirname, "../view/verify.html"));
      else
        return res.sendFile(path.join(__dirname, "../view/notverify.html"));
    };
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateSubHost = async (req, res) => {
  try {
    let { permission, first_name, last_name, mobile, host_id } = req.body;
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const check = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (check.length <= 0) {
      return handleError(res, StatusCode.status404, Message.subHostNotFound);
    }

    const deleteLastPermission = await deleteDataByLable(DB_TABLE.hostPermission, "host_id", host_id);

    const data = {
      first_name,
      last_name,
      phone: mobile,
    }
    const update = await updateDataByLabel(DB_TABLE.host, data, "host_id", host_id);

    if (update?.affectedRows > 0) {
      if (permission.length > 0) {
        let result = await Promise.all(
          permission.map(async (item) => {
            const data = {
              host_id: host_id,
              type: item,
              is_add: 1,
              is_view: 1,
              is_edit: 1,
              is_delete: 1
            }
            let addPermission = await addDataIntoTable(DB_TABLE.hostPermission, data);

          })
        )
      }

      return handleSuccess(res, StatusCode.status200, Message.msgSubHostUpdated);
    } else {
      return handleError(res, StatusCode.status400, Message.msgSubHostNotUpdated);
    }
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllSubHost = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const subHost = await getAllSubHostByHostId(id);

    if (!subHost?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, subHost);
    }

    const ruleTypes = subHostPermission;

    await Promise.all(
      subHost?.map(async (item) => {
        item.profile_image = item?.profile_image
          ? `${process.env.BASE_URL}profile/${item?.profile_image}`
          : "";
        item.password = undefined;

        let permission = await getDataByLabel(DB_TABLE.hostPermission, "host_id", item.host_id);

        if (permission?.length) {
          permission = permission.map((perm) => {
            const match = ruleTypes.find((r) => r.type === perm.type);
            return {
              ...perm,
              title: match ? match.title : null, // add title if matched, else null
            };
          });
        }

        item.permission = permission;
      })
    );



    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      subHost
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const updatePropertyCleaningStatus = async (req, res) => {
  try {
    const { property_id, cleaning_status } = req.body || {};
    const host_id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);
    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);
    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }
    const propertyDetails = await getDataByLabel(DB_TABLE.property, "property_id", property_id);
    if (!propertyDetails?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);
    const data = {
      cleaning_status
    }
    const udpateProperty = await updateDataByLabel(DB_TABLE.property, data, "property_id", property_id);
    if (udpateProperty?.affectedRows) {
      return handleSuccess(res, StatusCode.status200, Message.msgPropertyStatusUpdated);
    } else {
      return handleError(res, StatusCode.status400, Message.msgPropertyStatusNotUpdated);
    }
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const blockUnblockSubHost = async (req, res) => {
  try {
    let { host_id } = req.params;
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);

    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const subHost = await getDataByLabel2(DB_TABLE.host, "host_id", host_id, "added_by", userId);

    if (!subHost?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, subHost);
    }

    let is_active = subHost[0]?.is_active == 1 ? 0 : 1;

    const data = {
      is_active
    }
    const update = await updateDataByLabel(DB_TABLE.host, data, "host_id", host_id);

    return handleSuccess(res, StatusCode.status200, is_active == 1 ? Message.msgSubHostUnblocked : Message.msgSubHostBlocked);

  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const getSubHostById = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const { host_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const subHost = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!subHost?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const ruleTypes = subHostPermission;

    await Promise.all(
      subHost?.map(async (item) => {
        item.profile_image = item?.profile_image
          ? `${process.env.BASE_URL}profile/${item?.profile_image}`
          : "";
        item.password = undefined;

        let permission = await getDataByLabel(DB_TABLE.hostPermission, "host_id", item.host_id);

        if (permission?.length) {
          permission = permission.map((perm) => {
            const match = ruleTypes.find((r) => r.type === perm.type);
            return {
              ...perm,
              title: match ? match.title : null, // add title if matched, else null
            };
          });
        }

        item.permission = permission;
      })
    );



    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      subHost[0]
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getTodaysCheckOutList = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);
    console.log("userDetails", userDetails);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const all_ids = await getAllHostIds(userDetails);

    const booking = await getTodaysCheckOutListSchema(all_ids);

    console.log("booking", booking);

    if (booking?.length < 0) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, []);
    }

    await Promise.all(
      booking.map(async (item) => {
        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((item, i) => {
          return {
            ...item,
            image: item?.image
              ? `${process.env.BASE_URL}profile/${item?.image}`
              : "",
          };

        });

        if (item.booked_to > new Date()) {
          item.isActive = true;
        } else if (item.booked_to < new Date()) {
          item.isActive = false;
        }


        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.user_image = item?.user_image ? `${process.env.BASE_URL}profile/${item?.user_image}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }

        if (item.doc_status != "NOT REQUESTED") {
          let doc = await getDataByLabel(DB_TABLE.bookingDocument, "booking_id", item.booking_id);
          doc?.map((item) => {
            item.file = item?.file ? `${process.env.BASE_URL}profile/${item?.file}` : "";
          })
          item.userDocument = doc;
        } else {
          item.userDocument = [];
        }

      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateBookingCheckOutStatus = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const bookingDetails = await getBooking(booking_id)

    if (!bookingDetails?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);

    const data = {
      check_out_status: 1
    }
    const updateProperty = {
      cleaning_status: "PENDING"
    }

    const result = await updateDataByLabel(
      DB_TABLE.booking, data, "booking_id", booking_id
    );

    const update = await updateDataByLabel(
      DB_TABLE.property, updateProperty, "property_id", bookingDetails[0].property_id
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.bookingCheckOutStatusUpdated
    );

  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllCleaningPropertyListing = async (req, res) => {
  try {
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const all_ids = await getAllHostIds(userDetails);

    let property = await getCleaningProperty(all_ids);

    if (!property?.length) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        property
      );
    }

    await Promise.all(
      property.map(async (item) => {
        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((item, i) => {
          return {
            ...item,
            image: item?.image
              ? `${process.env.BASE_URL}profile/${item?.image}`
              : "",
          };
        });
        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }
      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      property
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getHostPermission = async (req, res) => {
  try {
    const userId = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", userId);

    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);
    if (userDetails[0]?.user_type != 3) return handleError(res, StatusCode.status400, Message.accessNotAllowed);

    let permissions = await getDataByLabel(DB_TABLE.hostPermission, "host_id", userDetails[0].host_id);

    const ruleTypes = subHostPermission;

    // Map permissions with titles
    if (permissions.length > 0) {
      permissions = permissions.map((perm) => {
        const rule = ruleTypes.find(r => r.type === perm.type);
        return {
          ...perm,
          title: rule ? rule.title : null   // add title if found
        };
      });
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      permissions
    );

  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getHostDashboard = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const all_ids = await getAllHostIds(userDetails);
    const [counts] = await getHostDashboardCounts(all_ids);
    const recent = await getHostRecentBookings(all_ids);

    const statusLabel = (status) => {
      if (status === 1) return "Approved";
      if (status === 2) return "Rejected";
      return "Pending";
    };

    const recentBookings = recent.map((item) => ({
      ...item,
      guest_name: `${item.guest_first_name || ""} ${item.guest_last_name || ""}`.trim(),
      booking_status_label: statusLabel(item.booking_status),
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, {
      dashboard: counts || {
        total_properties: 0,
        total_bookings: 0,
        total_revenue: 0,
        pending_listings: 0,
      },
      recent_bookings: recentBookings,
    });
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getHostReviewsController = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(res, StatusCode.status400, Message.userEmailNotVerified);
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const { search = "", rating = "", } = req.query;

    const ratingValue = rating ? parseInt(rating, 10) : null;

    const all_ids = await getAllHostIds(userDetails);
    const [countRow] = await getHostReviewsCount(all_ids, search, ratingValue);
    const rows = await getHostReviews(all_ids, search, ratingValue);

    const data = rows.map((item) => ({
      ...item,
      guest_name: `${item.guest_first_name || ""} ${item.guest_last_name || ""}`.trim(),
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, {
      total: countRow?.total || 0,
      data,
    });
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getMyPayouts = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }
    if (userDetails[0]?.is_verify == 0) {
      return handleError(res, StatusCode.status400, Message.userEmailNotVerified);
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const all_ids = await getAllHostIds(userDetails);
    const rows = await getHostPayoutHistoryModel(all_ids);

    const toNumber = (value) => Number(value || 0);

    const summary = rows.reduce(
      (acc, item) => {
        const payoutAmount = toNumber(item.host_payout_amount);

        acc.total_host_payout += payoutAmount;

        if ((item.payout_status || "PENDING") === "PAID") {
          acc.total_paid += payoutAmount;
        } else if ((item.payout_status || "PENDING") === "FAILED") {
          acc.total_failed += payoutAmount;
        } else {
          acc.total_pending += payoutAmount;
        }

        return acc;
      },
      {
        total_host_payout: 0,
        total_paid: 0,
        total_pending: 0,
        total_failed: 0,
      }
    );

    Object.keys(summary).forEach((key) => {
      summary[key] = Number(summary[key].toFixed(2));
    });

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, {
      summary,
      data: rows,
    });
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const createHostSubscription = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const { subscription_id } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);
    if (userDetails[0]?.is_verify == 0) {
      return handleError(res, StatusCode.status400, Message.userEmailNotVerified);
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const [plan] = await getSubscriptionPlanById(subscription_id);
    if (!plan) return handleError(res, StatusCode.status400, Message.subscriptionNotFound);

    if (Number(plan.price) <= 0) {
      await expireActiveSubscriptions(host_id);
      const startDate = new Date();
      const endDate = getPlanEndDate(startDate, plan.duration);
      const data = {
        host_id,
        subscription_id: plan.subscription_id,
        status: "active",
        start_date: startDate,
        end_date: endDate,
        price: plan.price,
        currency: plan.currency,
        duration: plan.duration,
        payment_status: "FREE",
        is_deleted: 0,
      };
      const result = await addDataIntoTable(DB_TABLE.user_subscription, data);
      return handleSuccess(res, StatusCode.status200, Message.subscriptionActivated, result);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: plan.currency?.toLowerCase() || "eur",
            product_data: {
              name: plan.plan_name,
            },
            unit_amount: Math.round(Number(plan.price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        host_id: String(host_id),
        subscription_id: String(plan.subscription_id),
        duration: plan.duration,
      },
      success_url: `${BASE_URL}host/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}host/subscription-cancel?session_id={CHECKOUT_SESSION_ID}`,
    });

    const data = {
      host_id,
      subscription_id: plan.subscription_id,
      status: "pending",
      price: plan.price,
      currency: plan.currency,
      duration: plan.duration,
      payment_status: "PENDING",
      stripe_session_id: session.id,
      is_deleted: 0,
    };
    await addDataIntoTable(DB_TABLE.user_subscription, data);

    return handleSuccess(res, StatusCode.status200, Message.subscriptionPending, {
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const subscriptionSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return handleError(res, StatusCode.status400, "Session ID is required.");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return handleError(res, StatusCode.status400, Message.subscriptionPaymentFailed);
    }

    const existing = await getSubscriptionBySessionId(session_id);
    if (!existing?.length) {
      return handleError(res, StatusCode.status400, Message.subscriptionNotFound);
    }

    const subscriptionRow = existing[0];
    await expireActiveSubscriptions(subscriptionRow.host_id);
    const startDate = new Date();
    const endDate = getPlanEndDate(startDate, subscriptionRow.duration);

    await updateDataByLabel(
      DB_TABLE.user_subscription,
      {
        status: "active",
        payment_status: "COMPLETED",
        start_date: startDate,
        end_date: endDate,
        stripe_payment_intent: session.payment_intent,
      },
      "user_subscription_id",
      subscriptionRow.user_subscription_id
    );

    return handleSuccess(res, StatusCode.status200, Message.subscriptionActivated);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const subscriptionCancel = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return handleError(res, StatusCode.status400, "Session ID is required.");
    }

    const existing = await getSubscriptionBySessionId(session_id);
    if (existing?.length) {
      await updateDataByLabel(
        DB_TABLE.user_subscription,
        {
          status: "canceled",
          payment_status: "CANCELLED",
        },
        "user_subscription_id",
        existing[0].user_subscription_id
      );
    }

    return handleSuccess(res, StatusCode.status200, Message.subscriptionPaymentFailed);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getCurrentSubscription = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const [subscription] = await getActiveSubscriptionByHostId(host_id);
    if (!subscription) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, null);
    }
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, subscription);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getMyReports = async (req, res) => {
  try {
    const id = req.user?.host_id;
    const userDetails = await getDataByLabel(DB_TABLE.host, "host_id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const all_ids = await getAllHostIds(userDetails);

    const data = await getMyReportsModel(all_ids);

    if (!data?.length)
      return handleSuccess(res, 200, "Data found successfully", data);

    data.map((item) => {
      item.user_profile_image = item.user_profile_image ? `${process.env.BASE_URL}profile/${item?.user_profile_image}` : null
    });

    return handleSuccess(res, 200, "Data found successfully", data);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};


export const fetchPropertyInquiries = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    let rows = await fetchallPropertyInquiriesModel(host_id);

    if (rows.length === 0) {
      return handleSuccess(res, 400, "Inquiries not found", []);
    }
    return handleSuccess(res, 200, "Host inquiries", rows);

  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};


export const createMultiplePropertyOffer = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const { property_ids, offer_value, start_date, end_date } = req.body;

    if (!Array.isArray(property_ids) || property_ids.length === 0 || !offer_value || !start_date || !end_date) {
      return handleError(res, 400, "All fields are required");
    }

    if (start_date > end_date) {
      return handleError(res, 400, "Invalid date range");
    }
    const offer_type = 1;
    const values = property_ids.map((property_id) => [property_id, host_id, offer_type, offer_value, start_date, end_date]);
    let rows = await createPropertyOfferMasterModel(values);

    if (rows.insertId === 0) {
      return handleError(res, 400, "Failed to create offers");
    }

    return handleSuccess(res, 200, "Offer applied to selected properties");

  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getHostOfferProperties = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const offers = await fetchOfferPropertyListModel(host_id);

    return handleSuccess(res, 200, "Offer property list", offers);

  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const updateOfferIsActive = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const { offer_id, is_active } = req.body;

    if (!offer_id || is_active === undefined) {
      return handleError(res, 400, "offer_id and is_active required");
    }

    const result = await updateOfferIsActiveModel(
      offer_id,
      host_id,
      is_active
    );

    if (result.affectedRows === 0) {
      return handleError(res, 404, "Offer not found");
    }

    return handleSuccess(res, 200, "Offer status updated");

  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};


export const updatePropertyOffer = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const {
      offer_id,
      offer_value,
      start_date,
      end_date
    } = req.body;

    if (
      !offer_id ||
      !offer_value ||
      !start_date ||
      !end_date
    ) {
      return handleError(res, 400, "All fields are required");
    }

    if (start_date > end_date) {
      return handleError(res, 400, "Invalid date range");
    }

    const result = await updatePropertyOfferModel(
      offer_id,
      host_id,
      1,
      offer_value,
      start_date,
      end_date
    );

    if (result.affectedRows === 0) {
      return handleError(res, 404, "Offer not found or unauthorized");
    }

    return handleSuccess(res, 200, "Offer updated successfully");

  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};


export const getHostPropertiesWithoutOfferController = async (req, res) => {
  try {
    const host_id = req.host?.host_id || req.user?.host_id;

    if (!host_id) {
      return handleError(res, StatusCode.status401, Message.INVALID_TOKEN);
    }

    const properties = await getHostPropertiesWithoutOffer(host_id);

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      properties
    );
  } catch (error) {
    console.log(error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const fetchHostNotifications = async (req, res) => {
  try {

    const host_id = req.user?.host_id;

    const hostDetails = await getDataByLabel(
      DB_TABLE.host,
      "host_id",
      host_id
    );

    if (!hostDetails?.length) {
      return handleError(res, StatusCode.status400, 'Host not found');
    }

    const notifications = await getHostNotifications(host_id);

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      notifications
    );

  } catch (error) {
    console.log("Error :", error);

    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const deleteHostNotifications = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const hostDetails = await getDataByLabel(
      DB_TABLE.host,
      "host_id",
      host_id
    );

    if (!hostDetails?.length) {
      return handleError(res, StatusCode.status400, "Host not found");
    }

    const rawNotificationId = req.body?.notification_id ?? req.query?.notification_id;
    const hasNotificationId =
      rawNotificationId !== undefined &&
      rawNotificationId !== null &&
      rawNotificationId !== "";

    const notification_id = hasNotificationId ? Number(rawNotificationId) : null;

    if (hasNotificationId && !Number.isInteger(notification_id)) {
      return handleError(res, StatusCode.status400, "Valid notification_id is required");
    }

    const result = await hardDeleteNotificationsByReceiver(
      host_id,
      "host",
      notification_id
    );

    if (hasNotificationId && !result?.affectedRows) {
      return handleError(res, StatusCode.status404, "Notification not found");
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      hasNotificationId
        ? "Notification deleted successfully"
        : "All notifications deleted successfully"
    );
  } catch (error) {
    console.log("Error :", error);

    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const createStripeConnectedAccount = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const hostDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!hostDetails?.length) {
      return handleError(res, 404, "Host not found");
    }

    const host = hostDetails[0];
    let stripeAccountId = host.stripe_account_id;

    if (host.stripe_account_id) {
      const data = await buildStripeConnectResponse(host.stripe_account_id);
      return handleSuccess(res, 200, "Stripe account already exists", data);
    }

    const stripeCountry = getStripeCountry({
      body: req.body,
      query: req.query,
      host,
    });

    const account = await stripe.accounts.create({
      type: "express",
      email: host.email,
      country: stripeCountry,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    stripeAccountId = account.id;
    await updateDataByLabel(DB_TABLE.host, { stripe_account_id: stripeAccountId, }, "host_id", host_id);

    const data = await buildStripeConnectResponse(stripeAccountId, account);
    return handleSuccess(res, 200, "Stripe account created successfully", data);
  } catch (error) {
    console.error("❌ createStripeConnectedAccount error:", error);
    return handleError(res, 500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const stripeOnboardingSuccessPage = async (req, res) => {
  try {
    const stripeAccountId = req.query?.account_id;

    if (!stripeAccountId) {
      return res.sendFile(path.join(__dirname, "../view/stripe-onboarding-cancel.html"));
    }

    const account = await stripe.accounts.retrieve(String(stripeAccountId));
    const accountStatus = buildStripeAccountStatus(account);

    if (!isStripePayoutReady(accountStatus)) {
      return res.sendFile(path.join(__dirname, "../view/stripe-onboarding-cancel.html"));
    }

    return res.sendFile(path.join(__dirname, "../view/stripe-onboarding-success.html"));
  } catch (error) {
    console.error("❌ stripeOnboardingSuccessPage error:", error);
    return handleError(res, 500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const stripeOnboardingCancelPage = async (req, res) => {
  try {
    return res.sendFile(path.join(__dirname, "../view/stripe-onboarding-cancel.html"));
  } catch (error) {
    console.error("❌ stripeOnboardingCancelPage error:", error);
    return handleError(res, 500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const stripeOnboardingLaunchPage = async (req, res) => {
  try {
    const redirectUrl = req.query?.redirect;
    const cancelUrl = req.query?.cancel || `${BASE_URL}host/stripe-onboarding-cancel`;

    if (!redirectUrl) {
      return res.redirect(cancelUrl);
    }

    const safeRedirectUrl = String(redirectUrl);
    const safeCancelUrl = String(cancelUrl);

    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to Stripe</title>
</head>
<body style="font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f8fafc; color:#0f172a;">
  <div style="text-align:center; max-width:520px; padding:24px;">
    <h1 style="margin-bottom:12px;">Redirecting to Stripe</h1>
    <p style="margin:0; line-height:1.6; color:#475569;">Please wait while we open the Stripe onboarding form.</p>
  </div>
  <script>
    (function () {
      var storageKey = "host_stripe_onboarding_started";
      var redirectUrl = ${JSON.stringify(safeRedirectUrl)};
      var cancelUrl = ${JSON.stringify(safeCancelUrl)};
      var alreadyStarted = sessionStorage.getItem(storageKey) === "1";

      if (alreadyStarted) {
        sessionStorage.removeItem(storageKey);
        window.location.replace(cancelUrl);
        return;
      }

      sessionStorage.setItem(storageKey, "1");
      window.location.replace(redirectUrl);
    })();
  </script>
</body>
</html>`);
  } catch (error) {
    console.error("❌ stripeOnboardingLaunchPage error:", error);
    return handleError(res, 500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getStripeOnboardingLink = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const hostDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!hostDetails?.length) {
      return handleError(res, 404, "Host not found");
    }

    const host = hostDetails[0];

    if (!host.stripe_account_id) {
      return handleError(
        res,
        400,
        "Please create Stripe connected account first"
      );
    }
    const data = await buildStripeConnectResponse(host.stripe_account_id);

    return handleSuccess(
      res,
      200,
      data.onboarding_required
        ? "Stripe onboarding link generated successfully"
        : "Stripe account is already ready for payouts",
      data
    );
  } catch (error) {
    console.error("❌ getStripeOnboardingLink error:", error);
    return handleError(res, 500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getStripeAccountStatus = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const hostDetails = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!hostDetails?.length) {
      return handleError(res, 404, "Host not found");
    }

    const host = hostDetails[0];

    if (!host.stripe_account_id) {
      return handleSuccess(
        res,
        200,
        "Stripe account status fetched successfully",
        {
          has_stripe_account: false,
          stripe_account_id: null,
          onboarding_required: false,
          onboarding_url: null,
          launch_url: null,
          cancel_url: `${BASE_URL}host/stripe-onboarding-cancel`,
          account_status: null,
        }
      );
    }

    const data = await buildStripeConnectResponse(host.stripe_account_id);

    return handleSuccess(
      res,
      200,
      "Stripe account status fetched successfully",
      data
    );
  } catch (error) {
    console.error("❌ getStripeAccountStatus error:", error);
    return handleError(res, 500, Message.INTERNAL_SERVER_ERROR);
  }
};


// ================= CREATE ACCOUNT =================
export const createStripeCustomAccount = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const host = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!host?.length) {
      return handleError(res, 404, "Host not found");
    }

    if (host[0].stripe_account_id) {
      return handleSuccess(res, 200, "Already exists", host[0]);
    }

    const stripeCountry = getStripeCountry({
      body: req.body,
      query: req.query,
      host: host[0],
    });

    const account = await stripe.accounts.create({
      type: "custom",
      country: stripeCountry,
      email: host[0].email,
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true }
      }
    });

    await updateDataByLabel(
      DB_TABLE.host,
      { stripe_account_id: account.id },
      "host_id",
      host_id
    );

    return handleSuccess(res, 200, "Account created", account);

  } catch (error) {
    return handleError(res, 500, "Stripe error");
  }
};

export const setupStripeAccount = async (req, res) => {
  try {
    const host_id = req.user?.host_id;
    const hosts = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!hosts?.length) {
      return handleError(res, 404, "Host not found");
    }

    const host = hosts[0];

    // 🔥 STEP 1: GET COUNTRY (STRICT - NO FALLBACK)
    const stripeCountry = normalizeStripeCountry(
      getStripeRequestField(req.body, "country") ||
      getStripeRequestField(req.body, "address.country")
    );

    if (!stripeCountry) {
      return handleError(res, 400, "Country is required");
    }

    // 🔥 STEP 2: BLOCK COUNTRY CHANGE
    if (host.stripe_account_id && host.country && host.country !== stripeCountry) {
      return handleError(res, 400, "Country cannot be changed after Stripe account creation");
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      phone_number,
      iban,
      account_number,
      bank_account_number,
      bank_routing_number,
      routing_number,
      dob,
      address,
    } = req.body || {};

    const normalizedFirstName = sanitizeStripeText(first_name);
    const normalizedLastName = sanitizeStripeText(last_name);
    const normalizedEmail = sanitizeStripeText(email);
    const normalizedPhoneNumber = sanitizeStripeText(phone_number || phone);

    const normalizedDob =
      normalizeStripeDob(dob) || {
        day: sanitizeStripeNumberLike(getStripeRequestField(req.body, "dob.day")),
        month: sanitizeStripeNumberLike(getStripeRequestField(req.body, "dob.month")),
        year: sanitizeStripeNumberLike(getStripeRequestField(req.body, "dob.year")),
      };

    const sanitizedAddressObject =
      address && typeof address === "object" && !Array.isArray(address)
        ? sanitizeStripeObject(address)
        : null;

    const normalizedAddress = sanitizedAddressObject || {
      line1:
        sanitizeStripeText(getStripeRequestField(req.body, "address.line1")) ||
        sanitizeStripeText(getStripeRequestField(req.body, "address")),
      city:
        sanitizeStripeText(getStripeRequestField(req.body, "address.city")) ||
        sanitizeStripeText(req.body?.city),
      state:
        sanitizeStripeText(getStripeRequestField(req.body, "address.state")) ||
        sanitizeStripeText(req.body?.state),
      postal_code:
        sanitizeStripeText(getStripeRequestField(req.body, "address.postal_code")) ||
        sanitizeStripeText(req.body?.postal_code),
      country: stripeCountry,
    };

    const normalizedBusinessProfile = {
      mcc:
        sanitizeStripeText(getStripeRequestField(req.body, "business_profile.mcc")) ||
        sanitizeStripeText(getStripeRequestField(req.body, "business_profile")),
      url:
        sanitizeStripeUrl(getStripeRequestField(req.body, "business_profile.url")) ||
        sanitizeStripeUrl(getStripeRequestField(req.body, "business_url")),
    };

    const hasBusinessProfile =
      normalizedBusinessProfile.mcc || normalizedBusinessProfile.url;

    const hasDob = normalizedDob?.day || normalizedDob?.month || normalizedDob?.year;
    const hasAddress =
      normalizedAddress?.line1 ||
      normalizedAddress?.city ||
      normalizedAddress?.state ||
      normalizedAddress?.postal_code ||
      normalizedAddress?.country;

    const bankAccountNumber = sanitizeStripeNumberLike(
      bank_account_number || iban || account_number
    );

    const normalizedRoutingNumber = sanitizeStripeText(
      bank_routing_number || routing_number
    );

    const requestBankCountry = normalizeStripeCountry(
      getStripeRequestField(req.body, "bank_country") || stripeCountry
    );

    let stripeAccountId = host.stripe_account_id;
    let accountCreated = false;

    // 🔥 STEP 3: CREATE STRIPE ACCOUNT (ONLY HERE)
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "custom",
        country: stripeCountry,
        email: normalizedEmail || host.email,
        business_type: "individual",
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        }
      });

      stripeAccountId = account.id;
      accountCreated = true;

      // 🔥 SAVE BOTH stripe_account_id + country
      await updateDataByLabel(
        DB_TABLE.host,
        {
          stripe_account_id: stripeAccountId,
          country: stripeCountry
        },
        "host_id",
        host_id
      );
    } else if (host.country !== stripeCountry) {
      await updateDataByLabel(
        DB_TABLE.host,
        { country: stripeCountry },
        "host_id",
        host_id
      );
    }

    let currentAccount = await stripe.accounts.retrieve(stripeAccountId, {
      expand: ["external_accounts"],
    });

    const accountCountry = normalizeStripeCountry(currentAccount.country);

    // 🔥 STEP 4: STRICT BANK COUNTRY MATCH
    if (requestBankCountry !== accountCountry) {
      return handleError(
        res,
        400,
        `Bank country ${requestBankCountry} must match account country ${accountCountry}`
      );
    }

    const resolvedBankCurrency = getStripeBankCurrency({
      account: currentAccount,
      country: accountCountry,
    });

    // 🔥 STEP 5: UPDATE KYC
    await stripe.accounts.update(stripeAccountId, {
      ...(hasBusinessProfile
        ? {
          business_profile: {
            ...(normalizedBusinessProfile.mcc
              ? { mcc: normalizedBusinessProfile.mcc }
              : {}),
            ...(normalizedBusinessProfile.url
              ? { url: normalizedBusinessProfile.url }
              : {}),
          },
        }
        : {}),
      individual: {
        ...(normalizedFirstName ? { first_name: normalizedFirstName } : {}),
        ...(normalizedLastName ? { last_name: normalizedLastName } : {}),
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedPhoneNumber ? { phone: normalizedPhoneNumber } : {}),
        ...(hasDob ? { dob: normalizedDob } : {}),
        ...(hasAddress ? { address: normalizedAddress } : {}),
      }
    });

    if (normalizedPhoneNumber) {
      await updateDataByLabel(
        DB_TABLE.host,
        { phone: normalizedPhoneNumber },
        "host_id",
        host_id
      );
    }

    const identityDocument =
      req.files?.documents?.[0] || req.files?.file?.[0] || null;

    if (identityDocument) {
      const uploadedDocument = await stripe.files.create({
        purpose: "identity_document",
        file: {
          data: fs.readFileSync(identityDocument.path),
          name: identityDocument.originalname,
          type: identityDocument.mimetype
        }
      });

      await stripe.accounts.update(stripeAccountId, {
        individual: {
          verification: {
            document: {
              front: uploadedDocument.id
            }
          }
        }
      });
    }

    // 🔥 STEP 6: ADD BANK
    if (bankAccountNumber) {
      await stripe.accounts.createExternalAccount(stripeAccountId, {
        external_account: {
          object: "bank_account",
          country: accountCountry,
          currency: resolvedBankCurrency,
          account_holder_name:
            `${host.first_name || ""} ${host.last_name || ""}`.trim() || host.email,
          account_holder_type: "individual",
          account_number: bankAccountNumber,
          ...(normalizedRoutingNumber ? { routing_number: normalizedRoutingNumber } : {})
        }
      });
    }

    // 🔥 STEP 7: TOS ACCEPT
    await stripe.accounts.update(stripeAccountId, {
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: getRequestIp(req),
      }
    });

    const updatedAccount = await stripe.accounts.retrieve(stripeAccountId, {
      expand: ["external_accounts"],
    });

    return handleSuccess(
      res,
      200,
      accountCreated
        ? "Stripe account created successfully"
        : "Stripe account updated successfully",
      buildStripeSetupSummary(updatedAccount, {
        requested_country: stripeCountry,
        bank_country: accountCountry,
        bank_currency: resolvedBankCurrency,
      })
    );

  } catch (error) {
    console.error("❌ setupStripeAccount error:", error);
    return handleError(
      res,
      error?.statusCode || 500,
      error?.raw?.message || "Stripe setup failed"
    );
  }
};

// ================= UPDATE KYC =================
export const updateStripeKyc = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const host = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!host?.length) {
      return handleError(res, 404, "Host not found");
    }

    const currentHost = host[0];
    const stripeAccountId = currentHost.stripe_account_id;

    const requestedCountry = normalizeStripeCountry(
      getStripeRequestField(req.body, "country") ||
      getStripeRequestField(req.body, "address.country")
    );

    if (requestedCountry) {
      await updateDataByLabel(
        DB_TABLE.host,
        { country: requestedCountry },
        "host_id",
        host_id
      );
    }

    let stripeCountry = requestedCountry || getStripeCountry({
      body: req.body,
      query: req.query,
      host: currentHost,
    });

    if (!stripeCountry) {
      return handleError(res, 400, "Country is required");
    }

    if (stripeAccountId) {
      const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
      const accountCountry = normalizeStripeCountry(stripeAccount.country);

      if (requestedCountry && accountCountry && requestedCountry !== accountCountry) {
        return handleError(
          res,
          400,
          `Country cannot be changed after Stripe account creation. Current Stripe account country is ${accountCountry}.`
        );
      }

      stripeCountry = accountCountry || stripeCountry;
    }

    await stripe.accounts.update(stripeAccountId, {
      individual: {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        phone: req.body.phone,
        dob: req.body.dob,
        address: {
          ...req.body.address,
          country: normalizeStripeCountry(req.body?.address?.country) || stripeCountry
        }
      }
    });

    return handleSuccess(res, 200, "KYC updated");

  } catch (error) {
    return handleError(res, 500, "Error updating KYC");
  }
};

// ================= UPLOAD DOCUMENT =================
export const uploadStripeDocument = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const host = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    const file = req.file;

    const uploaded = await stripe.files.create({
      purpose: "identity_document",
      file: {
        data: fs.readFileSync(file.path),
        name: file.originalname,
        type: file.mimetype
      }
    });

    await stripe.accounts.update(host[0].stripe_account_id, {
      individual: {
        verification: {
          document: {
            front: uploaded.id
          }
        }
      }
    });

    return handleSuccess(res, 200, "Document uploaded");

  } catch (error) {
    return handleError(res, 500, "Upload failed");
  }
};

// ================= ADD IBAN =================
export const addStripeBankAccount = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const host = await getDataByLabel(DB_TABLE.host, "host_id", host_id);
    const stripeAccount = await stripe.accounts.retrieve(host[0].stripe_account_id);
    const bankAccountNumber = req.body.iban || req.body.account_number;
    const normalizedRoutingNumber = sanitizeStripeText(
      req.body.bank_routing_number || req.body.routing_number
    );
    const bankCountry = getStripeBankCountry({
      body: req.body,
      query: req.query,
      account: stripeAccount,
      host: host[0],
    });
    const requestedCurrency =
      getStripeRequestField(req.body, "bank_currency") ||
      getStripeRequestField(req.body, "currency") ||
      req.query?.bank_currency ||
      req.query?.currency;

    if (
      stripeBankCountryRequiresRoutingNumber(bankCountry || stripeAccount.country) &&
      !normalizedRoutingNumber
    ) {
      return handleError(
        res,
        400,
        "routing_number is required for bank accounts in this country"
      );
    }

    await stripe.accounts.createExternalAccount(
      host[0].stripe_account_id,
      {
        external_account: buildStripeExternalBankAccountPayload({
          iban: bankAccountNumber,
          country: bankCountry || stripeAccount.country,
          currency: getStripeBankCurrency({
            account: stripeAccount,
            country: bankCountry || stripeAccount.country,
            currency: requestedCurrency,
          }),
          accountHolderName: `${host[0].first_name || ""} ${host[0].last_name || ""}`.trim() || host[0].email,
          routingNumber: normalizedRoutingNumber,
        })
      }
    );

    return handleSuccess(res, 200, "Bank added");

  } catch (error) {
    return handleError(res, 500, "Bank error");
  }
};

// ================= STATUS =================
export const getStripeStatus = async (req, res) => {
  try {
    const host_id = req.user?.host_id;

    const hosts = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!hosts?.length) {
      return handleError(res, 404, "Host not found");
    }

    const host = hosts[0];
    let stripeAccountId = host.stripe_account_id;
    let accountCreated = false;
    const stripeCountry = getStripeCountry({
      body: req.body,
      query: req.query,
      host,
    });

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "custom",
        country: stripeCountry,
        email: host.email,
        business_type: "individual",
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        }
      });

      stripeAccountId = account.id;
      accountCreated = true;

      await updateDataByLabel(
        DB_TABLE.host,
        { stripe_account_id: stripeAccountId },
        "host_id",
        host_id
      );
    }

    const account = await stripe.accounts.retrieve(stripeAccountId, {
      expand: ["external_accounts"],
    });

    let message = "You already have Stripe account";

    if (accountCreated) {
      message = "Stripe account created successfully";
    } else if (isStripeKycCompleted(account)) {
      message = "You have already completed KYC";
    }

    return handleSuccess(
      res,
      200,
      message,
      buildStripeSetupSummary(account, {
        account_created: accountCreated,
      })
    );

  } catch (error) {
    return handleError(res, 500, "Status error");
  }
};
