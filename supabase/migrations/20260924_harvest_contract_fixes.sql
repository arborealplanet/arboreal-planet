-- Harvest contract fixes — 2026-09-24
-- Adds the columns the Snake Sorter / Snake Stocks harvest pipeline requires.
-- All columns are nullable (or have safe defaults): zero risk to existing rows.
-- Safe to run multiple times (each block is guarded).

-- 1. Description versioning on market observations (master prompt §9).
--    description_hash lets the importer detect description changes between
--    harvests; description_changed_at records when the change was observed.
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS description_hash text;
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS description_changed_at timestamptz;

-- 2. Price edge cases on market observations (master prompt §9 edge cases).
--    price_format: fixed | auction | inquire | trade | payment_plan
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS price_format text;
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS inquire_only boolean NOT NULL DEFAULT false;
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS price_note text;
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS auction_ends_at timestamptz;
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS trade_terms text;
ALTER TABLE market_observations
  ADD COLUMN IF NOT EXISTS payment_plan_terms text;

-- 3. Relist detection pointer on the master animal record.
--    Set when an import looks like a relist of an already-known animal;
--    a reviewer confirms or clears it. No auto-merge happens.
ALTER TABLE gtp_observed_animals
  ADD COLUMN IF NOT EXISTS possible_relist_of uuid;

-- 4. Reviewer attribution on acquisition media (audit trail, master prompt §11).
ALTER TABLE snake_sorter_acquisition_media
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE snake_sorter_acquisition_media
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Helpful indexes for the new lookup patterns.
CREATE INDEX IF NOT EXISTS market_observations_description_hash_idx
  ON market_observations (description_hash);
CREATE INDEX IF NOT EXISTS gtp_observed_animals_possible_relist_of_idx
  ON gtp_observed_animals (possible_relist_of)
  WHERE possible_relist_of IS NOT NULL;
