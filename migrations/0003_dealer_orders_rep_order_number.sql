-- 0003_dealer_orders_rep_order_number.sql
-- Adds rep_order_number to dealer_orders. The existing order_number column
-- stays as our stable internal handle (used in URLs, code, the DB). The new
-- rep_order_number is what the Walton sales rep fills in after matching the
-- dealer's incoming order to a record in Walton's internal system. The
-- dealer-facing UI displays rep_order_number when present and falls back to
-- "Pending assignment" otherwise — so the dealer's order # always matches
-- whatever Walton's internal numbering says.
--
-- Applied: 2026-05-23 against Vercel Neon.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE dealer_orders
  ADD COLUMN IF NOT EXISTS rep_order_number VARCHAR(50);
