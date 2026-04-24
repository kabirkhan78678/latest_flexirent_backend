# Payout Flow Test Guide

This flow implements:

`payment received -> payout pending -> booked_from date reached -> host payout released`

## Before You Test

1. Run the SQL migration:

```sql
SOURCE sql/payout_flow_migration.sql;
```

2. Make sure these env vars exist:

```env
STRIPE_SECRET_KEY=...
STRIPE_CONNECT_COUNTRY=US
PAYOUT_SCHEDULER_ENABLED=true
PAYOUT_SCHEDULER_INTERVAL_MS=300000
PAYOUT_SCHEDULER_BATCH_SIZE=20
```

3. For fastest test, create the booking with `booked_from = today`.

4. Use bearer tokens for a guest user, a host user, and an admin user.

## Base URL

```bash
export BASE_URL="http://localhost:4000/api"
export USER_TOKEN="guest-jwt"
export HOST_TOKEN="host-jwt"
export ADMIN_TOKEN="admin-jwt"
```

## 1. Create Or Reuse Host Stripe Account

```bash
curl --location --request POST "$BASE_URL/host/create-stripe-account" \
  --header "Authorization: Bearer $HOST_TOKEN"
```

## 2. Get Stripe Onboarding Link

```bash
curl --location "$BASE_URL/host/stripe-onboarding-link" \
  --header "Authorization: Bearer $HOST_TOKEN"
```

Complete onboarding in Stripe before testing the real payout release.

## 3. Get Booking Price

Replace `PROPERTY_ID` and dates.

```bash
curl --location "$BASE_URL/user/get-property-booking-price?property_id=PROPERTY_ID&booked_from=2026-04-14&booked_to=2026-04-16&guest=1" \
  --header "Authorization: Bearer $USER_TOKEN"
```

Use the returned `total_price`, `sub_total`, and `price_breakdown` values in the next step.

## 4. Create Booking

```bash
curl --location --request POST "$BASE_URL/user/property-booking" \
  --header "Authorization: Bearer $USER_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "property_id": PROPERTY_ID,
    "booked_from": "2026-04-14",
    "booked_to": "2026-04-16",
    "total_price": 10000,
    "purpose_of_stay": "Business trip",
    "guest": 1,
    "user_earning": 0,
    "full_name": "Test Guest",
    "email": "guest@example.com",
    "nationality": "Indian",
    "phone_number": "9999999999",
    "offer_value": 0
  }'
```

Save the returned booking id as `BOOKING_ID`.

## 5. Host Approves Booking

```bash
curl --location --request POST "$BASE_URL/host/update-booking-status" \
  --header "Authorization: Bearer $HOST_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "booking_id": BOOKING_ID,
    "booking_status": 1
  }'
```

## 6A. Fast API-Only Payment Test

This is the easiest way to test backend payout logic without opening Stripe Checkout.

```bash
curl --location --request POST "$BASE_URL/user/pay-booking" \
  --header "Authorization: Bearer $USER_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "booking_id": BOOKING_ID
  }'
```

## 6B. Real Stripe Checkout Test

Use this when you want an actual Stripe test payment before payout release.

```bash
curl --location --request POST "$BASE_URL/user/pay-booking-stripe" \
  --header "Authorization: Bearer $USER_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "booking_id": BOOKING_ID
  }'
```

Open the returned checkout URL in a browser and complete payment using a Stripe test card such as:

```text
4242 4242 4242 4242
```

After success, the backend writes the `payment_master` row with:

- `host_payout_amount`
- `payout_status = PENDING`
- `release_on = booked_from`

## 7. Verify Admin Payout Queue

```bash
curl --location "$BASE_URL/admin/manage-payout" \
  --header "Authorization: Bearer $ADMIN_TOKEN"
```

```bash
curl --location "$BASE_URL/admin/payout-dashboard" \
  --header "Authorization: Bearer $ADMIN_TOKEN"
```

You should see the payout as `PENDING` until release.

## 8. Process All Due Payouts

This releases all eligible payouts where:

- payment is completed
- booking is approved
- booking is not cancelled
- `booked_from <= current_date`

```bash
curl --location --request POST "$BASE_URL/admin/process-due-payouts" \
  --header "Authorization: Bearer $ADMIN_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "limit": 20
  }'
```

## 9. Release One Specific Payout Manually

Use the `payment_id` from admin manage payout response.

```bash
curl --location --request POST "$BASE_URL/admin/release-payout/PAYMENT_ID" \
  --header "Authorization: Bearer $ADMIN_TOKEN"
```

## 10. Verify Host Payout History

```bash
curl --location "$BASE_URL/host/my-payouts" \
  --header "Authorization: Bearer $HOST_TOKEN"
```

This returns:

- `summary.total_host_payout`
- `summary.total_paid`
- `summary.total_pending`
- `summary.total_failed`

## 11. Verify User Payment History

```bash
curl --location "$BASE_URL/user/get-payment-history" \
  --header "Authorization: Bearer $USER_TOKEN"
```

```bash
curl --location "$BASE_URL/user/get-payment-history/BOOKING_ID" \
  --header "Authorization: Bearer $USER_TOKEN"
```

The detailed endpoint now includes payout fields inside `payment_details`.

## Expected Scenario

1. Guest pays for booking.
2. Payment row is inserted with `payout_status = PENDING`.
3. Before `booked_from`, payout stays pending.
4. On or after `booked_from`, admin manual API or scheduler releases payout.
5. `payout_status` becomes `PAID` and `stripe_transfer_id` is saved.
