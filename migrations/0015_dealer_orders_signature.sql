-- 0015_dealer_orders_signature.sql
-- Additive, non-destructive: dealer e-signature (typed full name) captured at
-- submit time and recorded on the work order. Nullable; existing rows untouched.

ALTER TABLE dealer_orders ADD COLUMN IF NOT EXISTS dealer_signature varchar(200);
