ALTER TABLE `payment_master`
  ADD COLUMN IF NOT EXISTS `payout_status` ENUM('PENDING','PROCESSING','PAID','FAILED') NOT NULL DEFAULT 'PENDING' AFTER `host_payout_amount`,
  ADD COLUMN IF NOT EXISTS `release_on` DATE DEFAULT NULL AFTER `payout_status`,
  ADD COLUMN IF NOT EXISTS `payout_released_at` DATETIME DEFAULT NULL AFTER `release_on`,
  ADD COLUMN IF NOT EXISTS `stripe_transfer_id` VARCHAR(255) DEFAULT NULL AFTER `payout_released_at`,
  ADD COLUMN IF NOT EXISTS `payout_failure_reason` TEXT DEFAULT NULL AFTER `stripe_transfer_id`,
  ADD COLUMN IF NOT EXISTS `last_payout_attempt_at` DATETIME DEFAULT NULL AFTER `payout_failure_reason`;

UPDATE `payment_master`
SET
  `host_payout_amount` = ROUND(COALESCE(`total_amount`, 0) - COALESCE(`admin_earnings`, 0), 2)
WHERE `payment_status` = 'COMPLETED'
  AND `host_payout_amount` IS NULL;

UPDATE `payment_master`
SET `release_on` = COALESCE(`release_on`, `start_date`)
WHERE `payment_status` = 'COMPLETED'
  AND `release_on` IS NULL;
