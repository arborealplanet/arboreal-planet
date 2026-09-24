-- Snake Sorter member contributions — 2026-09-24
-- Safe to run multiple times (every block is guarded). Purely additive:
-- one new table, one new storage bucket, new policies. No existing table or
-- row is touched, so reference/dataset data is unaffected.
--
-- Purpose: let approved members upload images and videos to improve the
-- Snake Sorter dataset. Contributions land in `pending_review` and NOTHING
-- enters the reference/training library until the owner explicitly approves
-- (per the Snake Sorter non-negotiable data rule: scan/contributed media is
-- analysis-only until owner-curated).

-- 1. Contributions table
CREATE TABLE IF NOT EXISTS snake_sorter_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_user_id uuid NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL,          -- path inside the snake-sorter-contributions bucket
  original_name text NOT NULL,
  mime_type text NOT NULL,
  content_sha256 text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'withdrawn')),

  -- contributor-supplied hints (all optional)
  taxon_guess text,
  life_stage_guess text CHECK (life_stage_guess IS NULL OR life_stage_guess IN
    ('hatchling', 'neonate', 'juvenile', 'subadult', 'adult', 'unknown')),
  view_type_guess text CHECK (view_type_guess IS NULL OR view_type_guess IN
    ('unknown', 'full_body', 'head', 'dorsal', 'left_lateral', 'right_lateral', 'tail', 'other', 'mixed')),
  provenance_hint text,
  notes text,

  -- owner review + promotion linkage
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  promoted_reference_animal_id uuid
    REFERENCES snake_sorter_reference_animals(id) ON DELETE SET NULL,
  promoted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snake_sorter_contributions_status_idx
  ON snake_sorter_contributions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS snake_sorter_contributions_contributor_idx
  ON snake_sorter_contributions (contributor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS snake_sorter_contributions_sha_idx
  ON snake_sorter_contributions (content_sha256)
  WHERE status IN ('pending_review', 'approved');

-- 2. Row-level security
ALTER TABLE snake_sorter_contributions ENABLE ROW LEVEL SECURITY;

-- Contributors insert their own rows only.
DROP POLICY IF EXISTS "contributors insert own" ON snake_sorter_contributions;
CREATE POLICY "contributors insert own" ON snake_sorter_contributions
  FOR INSERT TO authenticated
  WITH CHECK (contributor_user_id = auth.uid());

-- Contributors read their own rows; the owner reads everything.
DROP POLICY IF EXISTS "contributors read own, owner reads all" ON snake_sorter_contributions;
CREATE POLICY "contributors read own, owner reads all" ON snake_sorter_contributions
  FOR SELECT TO authenticated
  USING (
    contributor_user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );

-- Owner manages review state and promotion linkage.
DROP POLICY IF EXISTS "owner updates all" ON snake_sorter_contributions;
CREATE POLICY "owner updates all" ON snake_sorter_contributions
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Contributors may withdraw their own pending contributions, and nothing
-- else: a dedicated RPC flips status -> withdrawn atomically. (A plain
-- UPDATE policy cannot express "status column only", so it would let a
-- contributor piggyback changes to review/promotion columns.)
DROP POLICY IF EXISTS "contributors withdraw own" ON snake_sorter_contributions;

CREATE OR REPLACE FUNCTION public.withdraw_snake_sorter_contribution(p_contribution_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.snake_sorter_contributions
  SET status = 'withdrawn', updated_at = now()
  WHERE id = p_contribution_id
    AND contributor_user_id = auth.uid()
    AND status = 'pending_review';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_snake_sorter_contribution(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.withdraw_snake_sorter_contribution(uuid) TO authenticated;

-- Owner can purge withdrawn/rejected rows.
DROP POLICY IF EXISTS "owner deletes all" ON snake_sorter_contributions;
CREATE POLICY "owner deletes all" ON snake_sorter_contributions
  FOR DELETE TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- 3. Private storage bucket for original contributed media
INSERT INTO storage.buckets (id, name, public)
VALUES ('snake-sorter-contributions', 'snake-sorter-contributions', false)
ON CONFLICT (id) DO NOTHING;

-- Contributors upload into their own folder: {user_id}/...
DROP POLICY IF EXISTS "contributions upload own folder" ON storage.objects;
CREATE POLICY "contributions upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'snake-sorter-contributions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Contributors read their own objects; owner reads everything.
DROP POLICY IF EXISTS "contributions read own, owner all" ON storage.objects;
CREATE POLICY "contributions read own, owner all" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'snake-sorter-contributions'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
  );

-- Owner can delete objects (purge of rejected/withdrawn media).
DROP POLICY IF EXISTS "contributions owner delete" ON storage.objects;
CREATE POLICY "contributions owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'snake-sorter-contributions'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );
