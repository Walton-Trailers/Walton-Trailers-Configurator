-- 0013_backfill_reservation_stock_model.sql
-- Backfills inventory_reservations.stock_number + .model from each
-- row's snapshot_fields. The reserve handler used to look up "Model"
-- as the field name, but the live Airtable view uses
-- "🚐 Trailer Model" with an emoji prefix, so older rows landed
-- with null model values even though the snapshot held the right data.
--
-- Safe to re-run: WHERE … IS NULL means we only touch rows that
-- weren't populated correctly the first time.

UPDATE inventory_reservations
SET stock_number = COALESCE(
  stock_number,
  snapshot_fields->>'Production ID',
  snapshot_fields->>'Stock #',
  snapshot_fields->>'Stock Number'
)
WHERE stock_number IS NULL
  AND snapshot_fields IS NOT NULL;

UPDATE inventory_reservations
SET model = COALESCE(
  model,
  snapshot_fields->>'🚐 Trailer Model',
  snapshot_fields->>'Trailer Model',
  snapshot_fields->>'Model',
  snapshot_fields->>'Trailer'
)
WHERE model IS NULL
  AND snapshot_fields IS NOT NULL;
