-- 0016_reservation_document.sql
-- Additive, non-destructive: a rep-uploaded work-order / document PDF on a
-- reservation that the dealer can view on their Reserved tab. Nullable;
-- existing rows untouched.

ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS document_url varchar(500);
ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS document_uploaded_at timestamp;
