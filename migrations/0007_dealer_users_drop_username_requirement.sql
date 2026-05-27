-- 0007_dealer_users_drop_username_requirement.sql
-- Switches dealer_users to email-only login. The `username` column is kept
-- for backwards compat (so existing rows don't break) but is no longer
-- required and no longer populated on new rows.
--
-- Safe to re-run: ALTER COLUMN DROP NOT NULL is idempotent.

ALTER TABLE dealer_users
  ALTER COLUMN username DROP NOT NULL;

-- The unique constraint on username is kept — NULLs are not considered
-- equal in Postgres by default, so multiple rows with NULL username are
-- allowed. Drop the constraint entirely only if you want to reclaim the
-- column for something else later.
