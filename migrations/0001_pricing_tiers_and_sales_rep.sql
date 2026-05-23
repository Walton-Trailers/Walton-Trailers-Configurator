-- 0001_pricing_tiers_and_sales_rep.sql
-- Adds dealer pricing tiers (Elite 20% / Preferred 15% / Standard 10%)
-- and per-dealer sales rep contact info for order routing.
--
-- Applied: 2026-05-23 against Vercel Neon.
-- Safe to re-run: all statements use IF NOT EXISTS.

-- 1. pricing_tiers lookup table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id            SERIAL      PRIMARY KEY,
  slug          VARCHAR(20) NOT NULL UNIQUE,
  display_name  VARCHAR(50) NOT NULL,
  discount_pct  INTEGER     NOT NULL CHECK (discount_pct >= 0 AND discount_pct <= 100),
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- 2. Seed the three tiers
INSERT INTO pricing_tiers (slug, display_name, discount_pct, display_order)
VALUES
  ('elite',     'Elite',     20, 1),
  ('preferred', 'Preferred', 15, 2),
  ('standard', 'Standard',   10, 3)
ON CONFLICT (slug) DO NOTHING;

-- 3. Add pricing-tier + sales-rep fields to dealers
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS pricing_tier     VARCHAR(20)   NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS sales_rep_name   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS sales_rep_email  VARCHAR(200);

-- 4. Add a FK so a dealer can only reference an existing tier slug
-- (using a CHECK + trigger pattern would be more flexible; FK on slug is fine
-- here because slugs are stable and the table is tiny.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'dealers_pricing_tier_fk'
  ) THEN
    ALTER TABLE dealers
      ADD CONSTRAINT dealers_pricing_tier_fk
      FOREIGN KEY (pricing_tier) REFERENCES pricing_tiers(slug)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END$$;
