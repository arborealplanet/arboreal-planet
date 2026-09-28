-- Fix: community post publishing was rejected for every signed-in user.
-- public.community_posts had RLS enabled with correct INSERT/UPDATE policies,
-- but the authenticated role was never granted table-level INSERT/UPDATE/DELETE,
-- so PostgREST denied every write with "permission denied for table" before
-- RLS was ever evaluated. The site's /api/community/posts route surfaced this
-- as a generic "Could not publish post" for all posts.
-- Guarded so it is a no-op on databases where the table does not exist
-- (the table itself was created outside of migrations).
DO $$
BEGIN
  IF to_regclass('public.community_posts') IS NOT NULL THEN
    GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
  END IF;
END
$$;
