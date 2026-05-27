-- 0012_inventory_reservations_rep_notes.sql
-- Adds a rep-internal notes column + a status-changed timestamp so the
-- rep workflow on /admin can log what they did to a reservation
-- without overwriting the dealer's original note field.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE inventory_reservations
  ADD COLUMN IF NOT EXISTS rep_notes         TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP;

-- Backfill status_changed_at = created_at on existing rows so the
-- "last status update" column reads sensibly from day one.
UPDATE inventory_reservations
SET status_changed_at = created_at
WHERE status_changed_at IS NULL;
