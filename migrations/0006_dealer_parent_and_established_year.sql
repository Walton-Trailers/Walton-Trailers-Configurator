-- 0006_dealer_parent_and_established_year.sql
-- Adds optional parent linkage and the year a dealer joined.
-- These power the auto-generated dealer_id rule set:
--   Primary dealer:   [STATE]-[YY]-[###]    e.g.  UT-23-001
--   Additional loc:   [STATE]-[YY]-[###]-L[##]  e.g. UT-23-001-L02
--
-- Per-state sequence numbering. Year is the year the dealer was admitted.
-- Safe to re-run: all statements use IF NOT EXISTS.

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS parent_dealer_id  INTEGER,
  ADD COLUMN IF NOT EXISTS established_year  VARCHAR(4);

-- FK so parent_dealer_id can only reference an existing dealer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'dealers_parent_dealer_fk'
  ) THEN
    ALTER TABLE dealers
      ADD CONSTRAINT dealers_parent_dealer_fk
      FOREIGN KEY (parent_dealer_id) REFERENCES dealers(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS dealers_parent_dealer_idx
  ON dealers(parent_dealer_id);

-- Backfill established_year from created_at for existing rows.
UPDATE dealers
SET established_year = TO_CHAR(created_at, 'YYYY')
WHERE established_year IS NULL AND created_at IS NOT NULL;
