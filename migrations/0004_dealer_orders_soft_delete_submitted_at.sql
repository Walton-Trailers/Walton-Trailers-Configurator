-- 0004_dealer_orders_soft_delete_submitted_at.sql
-- Two changes to support soft delete + the 48hr cancel window for
-- submitted orders.
--
-- 1. deleted_at  — non-null = soft-deleted. The dealer dashboard moves these
--    rows into a "Deleted" tab where the dealer can Recreate (pre-fills the
--    configurator) but the row itself stays so we have an audit trail of
--    what dealers cancelled.
-- 2. submitted_at — set the moment status moves draft → submitted (server-
--    side, via /submit). updated_at is reused for every edit so it can't be
--    trusted as the submission timestamp. Backfilled to updated_at for any
--    existing submitted orders.
--
-- Applied: 2026-05-23 against Vercel Neon.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS guards both.

ALTER TABLE dealer_orders
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

-- Backfill submitted_at for existing submitted/processing/completed orders.
-- updated_at is the closest proxy we have. Future submissions stamp this
-- exactly in the /submit handler.
UPDATE dealer_orders
SET submitted_at = updated_at
WHERE submitted_at IS NULL
  AND status IN ('submitted', 'processing', 'completed', 'received');
