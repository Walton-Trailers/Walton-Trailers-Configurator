-- 0009_admin_users_drop_username_requirement.sql
-- Switches admin_users (Walton internal staff) to email-only login,
-- mirroring what we did for dealers (0007 for dealer_users).
-- `username` column stays so existing rows aren't broken, but is no
-- longer required and no longer asked for on the login or create
-- forms. NULLs are not considered equal under Postgres's default
-- unique-constraint semantics, so the existing UNIQUE on username
-- still works with multiple NULL rows.
--
-- Safe to re-run: ALTER COLUMN DROP NOT NULL is idempotent.

ALTER TABLE admin_users
  ALTER COLUMN username DROP NOT NULL;
