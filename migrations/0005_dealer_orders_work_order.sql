-- 0005_dealer_orders_work_order.sql
-- Adds work-order attachment columns to dealer_orders.
--
-- work_order_url           — Vercel Blob URL of the PDF the rep uploads
--                            after matching the dealer's order to Walton's
--                            internal system. Setting this on a 'submitted'
--                            order auto-flips status to 'received' (logic
--                            lives in the server PATCH handler).
-- work_order_uploaded_at   — Audit timestamp for when the file was attached.
--
-- Applied: 2026-05-23 against Vercel Neon.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS guards both.

ALTER TABLE dealer_orders
  ADD COLUMN IF NOT EXISTS work_order_url         VARCHAR(500),
  ADD COLUMN IF NOT EXISTS work_order_uploaded_at TIMESTAMP;
