-- 0002_dealer_orders_po_number.sql
-- Adds po_number to dealer_orders for dealer-supplied purchase order /
-- internal reference numbers when submitting an order to Walton.
--
-- customer_name already exists on dealer_orders so no add needed for it.
--
-- Applied: 2026-05-23 against Vercel Neon.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE dealer_orders
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);
