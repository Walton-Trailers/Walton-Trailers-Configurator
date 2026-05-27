-- 0008_admin_dealer_assignments.sql
-- Join table linking Walton employees (admin_users) to specific dealers
-- they're responsible for (account-manager / sales-rep style coverage).
--
-- This release is bookkeeping only — the assignments are stored and shown
-- in the Employees UI but do NOT yet gate access in the dealer/order APIs.
-- Wiring access enforcement is a separate decision (per-role policy etc.)
-- and intentionally left out of this migration.
--
-- Safe to re-run: IF NOT EXISTS on table + constraints.

CREATE TABLE IF NOT EXISTS admin_dealer_assignments (
  id             SERIAL    PRIMARY KEY,
  admin_user_id  INTEGER   NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  dealer_id      INTEGER   NOT NULL REFERENCES dealers(id)     ON DELETE CASCADE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_dealer_assignments_unique UNIQUE (admin_user_id, dealer_id)
);

CREATE INDEX IF NOT EXISTS admin_dealer_assignments_user_idx
  ON admin_dealer_assignments(admin_user_id);
CREATE INDEX IF NOT EXISTS admin_dealer_assignments_dealer_idx
  ON admin_dealer_assignments(dealer_id);
