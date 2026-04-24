import db from "../config/db.js";

export const getPayoutPaymentByIdModel = async (payment_id) => {
  return db.query(
    `
      SELECT
        pm.*,
        b.booking_status,
        b.payment_status AS booking_payment_status,
        b.is_canceled,
        b.booked_from,
        b.booked_to,
        b.host_id,
        b.property_id,
        COALESCE(pm.release_on, b.booked_from) AS effective_release_on,
        p.property_title,
        p.address,
        h.stripe_account_id,
        h.email AS host_email,
        h.first_name AS host_first_name,
        h.last_name AS host_last_name,
        u.email AS guest_email,
        u.first_name AS guest_first_name,
        u.last_name AS guest_last_name
      FROM payment_master pm
      LEFT JOIN booking_master b ON b.booking_id = pm.booking_id
      LEFT JOIN property_master p ON p.property_id = b.property_id
      LEFT JOIN host_master h ON h.host_id = b.host_id
      LEFT JOIN users u ON u.id = pm.user_id
      WHERE pm.payment_id = ?
      LIMIT 1
    `,
    [payment_id]
  );
};

export const claimPayoutForProcessingModel = async (
  payment_id,
  allowedStatuses = ["PENDING", "FAILED"]
) => {
  const placeholders = allowedStatuses.map(() => "?").join(", ");

  return db.query(
    `
      UPDATE payment_master
      SET
        payout_status = 'PROCESSING',
        payout_failure_reason = NULL,
        last_payout_attempt_at = NOW()
      WHERE payment_id = ?
        AND COALESCE(payout_status, 'PENDING') IN (${placeholders})
    `,
    [payment_id, ...allowedStatuses]
  );
};

export const markPayoutPaidModel = async (payment_id, stripe_transfer_id) => {
  return db.query(
    `
      UPDATE payment_master
      SET
        payout_status = 'PAID',
        stripe_transfer_id = ?,
        payout_released_at = NOW(),
        payout_failure_reason = NULL,
        last_payout_attempt_at = NOW()
      WHERE payment_id = ?
    `,
    [stripe_transfer_id, payment_id]
  );
};

export const markPayoutFailedModel = async (payment_id, payout_failure_reason) => {
  return db.query(
    `
      UPDATE payment_master
      SET
        payout_status = 'FAILED',
        payout_failure_reason = ?,
        last_payout_attempt_at = NOW()
      WHERE payment_id = ?
        AND COALESCE(payout_status, 'PENDING') <> 'PAID'
    `,
    [payout_failure_reason, payment_id]
  );
};

export const getDuePayoutPaymentsModel = async (limit = 20) => {
  return db.query(
    `
      SELECT
        pm.payment_id
      FROM payment_master pm
      INNER JOIN booking_master b ON b.booking_id = pm.booking_id
      WHERE pm.payment_status = 'COMPLETED'
        AND COALESCE(pm.host_payout_amount, 0) > 0
        AND COALESCE(pm.payout_status, 'PENDING') = 'PENDING'
        AND b.booking_status = 1
        AND b.payment_status = 1
        AND COALESCE(b.is_canceled, 'No') = 'No'
        AND DATE(COALESCE(pm.release_on, b.booked_from)) <= CURRENT_DATE
      ORDER BY COALESCE(pm.release_on, b.booked_from) ASC, pm.created_at ASC
      LIMIT ?
    `,
    [Number(limit) || 20]
  );
};

export const getHostPayoutHistoryModel = async (host_ids) => {
  return db.query(
    `
      SELECT
        pm.payment_id,
        pm.booking_id,
        pm.payment_status,
        COALESCE(pm.payout_status, 'PENDING') AS payout_status,
        pm.total_amount,
        pm.admin_earnings,
        COALESCE(
          pm.host_payout_amount,
          ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2)
        ) AS host_payout_amount,
        pm.currency,
        pm.release_on,
        pm.payout_released_at,
        pm.stripe_transfer_id,
        pm.payout_failure_reason,
        pm.created_at,
        b.booked_from,
        b.booked_to,
        p.property_title,
        p.address,
        u.first_name AS guest_first_name,
        u.last_name AS guest_last_name
      FROM payment_master pm
      INNER JOIN booking_master b ON b.booking_id = pm.booking_id
      LEFT JOIN property_master p ON p.property_id = b.property_id
      LEFT JOIN users u ON u.id = b.user_id
      WHERE b.host_id IN (?)
        AND pm.payment_status = 'COMPLETED'
      ORDER BY pm.created_at DESC
    `,
    [host_ids]
  );
};
