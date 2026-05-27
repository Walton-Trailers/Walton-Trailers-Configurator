-- 0010_dealer_orders_invoice_and_delivery_date.sql
-- Adds two fields the rep populates on an order so the dealer can see
-- them on /dealer/orders/:id:
--   invoice_url            — public Vercel Blob URL of the invoice PDF
--   invoice_uploaded_at    — stamp when the rep last attached an invoice
--   expected_delivery_date — date the rep promised the trailer would ship
--
-- Safe to re-run: all use IF NOT EXISTS.

ALTER TABLE dealer_orders
  ADD COLUMN IF NOT EXISTS invoice_url             VARCHAR(500),
  ADD COLUMN IF NOT EXISTS invoice_uploaded_at     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS expected_delivery_date  DATE;
