-- 0014_quote_request_lead_tracking.sql
-- Lead tracking for quote requests.
--
-- Additive and NON-DESTRUCTIVE — safe to run against the shared production DB:
--   * adds a nullable closed_by_dealer_id column (logically references dealers.id)
--   * switches the DEFAULT status for newly-submitted leads to 'new'
--
-- Existing rows are left untouched. Legacy status values
-- (pending / contacted / quoted / closed) are mapped to the new funnel in the
-- admin UI, so there is intentionally no data backfill here.

ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS closed_by_dealer_id integer;
ALTER TABLE quote_requests ALTER COLUMN status SET DEFAULT 'new';
