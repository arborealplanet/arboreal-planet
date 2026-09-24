-- Harvest canonical photos, occurrences, and reversible merges — 2026-09-24
-- Safe to run multiple times (every block is guarded). All new columns are
-- nullable: zero risk to existing rows.
--
-- Depends on 20260924_harvest_contract_fixes.sql (reviewed_by/reviewed_at on
-- snake_sorter_acquisition_media). Run that migration first.

-- 1. Canonical photo linkage on acquisition media (master prompt §10).
--    The same source photograph can appear in several listings (relist
--    evidence). Storage is written once; every listing gets a media row that
--    points at the canonical row via duplicate_of, and every row in a photo
--    family shares canonical_photo_id.
ALTER TABLE snake_sorter_acquisition_media
  ADD COLUMN IF NOT EXISTS duplicate_of uuid
  REFERENCES snake_sorter_acquisition_media(id) ON DELETE SET NULL;
ALTER TABLE snake_sorter_acquisition_media
  ADD COLUMN IF NOT EXISTS canonical_photo_id uuid;

CREATE INDEX IF NOT EXISTS snake_sorter_acquisition_media_duplicate_of_idx
  ON snake_sorter_acquisition_media (duplicate_of)
  WHERE duplicate_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS snake_sorter_acquisition_media_canonical_photo_idx
  ON snake_sorter_acquisition_media (canonical_photo_id)
  WHERE canonical_photo_id IS NOT NULL;

-- 2. Occurrence records: every detected duplicate photo is evidence
--    (possible relist across sellers/listings) and is recorded even when no
--    new bytes are stored.
CREATE TABLE IF NOT EXISTS snake_sorter_media_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_media_id uuid NOT NULL
    REFERENCES snake_sorter_acquisition_media(id) ON DELETE CASCADE,
  observed_candidate_id uuid NOT NULL
    REFERENCES snake_sorter_acquisition_candidates(id) ON DELETE CASCADE,
  observed_media_id uuid
    REFERENCES snake_sorter_acquisition_media(id) ON DELETE SET NULL,
  detection_kind text NOT NULL
    CHECK (detection_kind IN ('sha256', 'perceptual_hash')),
  hamming_distance integer,
  detected_at timestamptz NOT NULL DEFAULT now(),
  detected_by uuid,
  UNIQUE (canonical_media_id, observed_candidate_id, detection_kind)
);
CREATE INDEX IF NOT EXISTS snake_sorter_media_occurrences_candidate_idx
  ON snake_sorter_media_occurrences (observed_candidate_id);

-- 3. Reversible animal merges (master prompt §8): reviewer-confirmed relist
--    merges are records, never silent row surgery. A merge can be reverted.
CREATE TABLE IF NOT EXISTS gtp_animal_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_animal_id uuid NOT NULL
    REFERENCES gtp_observed_animals(id) ON DELETE CASCADE,
  into_animal_id uuid NOT NULL
    REFERENCES gtp_observed_animals(id) ON DELETE CASCADE,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  merged_by uuid,
  merged_at timestamptz NOT NULL DEFAULT now(),
  reverted_at timestamptz,
  reverted_by uuid,
  revert_reason text,
  CHECK (from_animal_id <> into_animal_id)
);
CREATE INDEX IF NOT EXISTS gtp_animal_merges_from_idx
  ON gtp_animal_merges (from_animal_id) WHERE reverted_at IS NULL;
CREATE INDEX IF NOT EXISTS gtp_animal_merges_into_idx
  ON gtp_animal_merges (into_animal_id) WHERE reverted_at IS NULL;
