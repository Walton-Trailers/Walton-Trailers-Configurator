-- 0011_inventory_reservations.sql
-- Persists Reserve-Now requests from the dealer inventory page so dealers
-- can see what they have on hold alongside their orders. The rep email
-- (sent on POST /api/dealer/inventory/reserve) is still the source of
-- truth for actually holding the unit in Airtable — this table is the
-- dealer-facing record so they have a list across sessions.
--
-- Safe to re-run: IF NOT EXISTS on table + indexes.

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id                SERIAL    PRIMARY KEY,
  dealer_id         INTEGER   NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  -- Which employee-under-the-dealer hit Reserve, when the session was a
  -- dealer-user (not the main dealer login). Nullable for main-dealer
  -- sessions, ON DELETE SET NULL so deleting a sub-user doesn't blow
  -- away the dealer's reservation history.
  dealer_user_id    INTEGER   REFERENCES dealer_users(id) ON DELETE SET NULL,
  -- Airtable record id is the link back to the inventory row; we keep
  -- snapshots below so the reservation still reads correctly if the
  -- Airtable row is renamed or hidden in the view.
  airtable_record_id VARCHAR(50),
  stock_number     VARCHAR(100),
  model            VARCHAR(200),
  -- Free-form fields the dealer entered in the modal.
  customer_name    VARCHAR(200),
  note             TEXT,
  -- Full row snapshot from Airtable at request time. Lets the rep
  -- (and the dealer's own list) reconstruct context if needed.
  snapshot_fields  JSONB,
  -- Status the rep will move through. 'requested' is the only value
  -- this app writes today; 'confirmed' / 'released' / 'cancelled'
  -- are reserved for a future rep workflow.
  status           VARCHAR(20) NOT NULL DEFAULT 'requested',
  created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_reservations_dealer_idx
  ON inventory_reservations(dealer_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_status_idx
  ON inventory_reservations(status);
