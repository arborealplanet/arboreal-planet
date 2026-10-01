-- Snake Sorter supply-only contributions + grant hardening (2026-10-01)
--
-- 1) Contributions INSERT: any signed-in user may insert only their own rows.
--    Replaces the older member-gated insert policy if it is still present.
--    Approve/reject/withdraw semantics are unchanged (owner UPDATE/DELETE,
--    withdraw via the SECURITY DEFINER RPC withdraw_snake_sorter_contribution).
-- 2) Revoke TRUNCATE and TRIGGER grants from anon/authenticated on every
--    snake_sorter_* table. Row-level security does not cover TRUNCATE, so those
--    grants alone would let any signed-in user wipe tables. The app never
--    truncates or creates triggers through user tokens.

DO $$
DECLARE
  pol name;
  t   text;
BEGIN
  SELECT p.policyname INTO pol
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'snake_sorter_contributions'
    AND p.cmd = 'INSERT'
    AND p.with_check LIKE '%snake_sorter_members%'
  LIMIT 1;

  IF pol IS NOT NULL THEN
    EXECUTE format('DROP POLICY %I ON public.snake_sorter_contributions', pol);
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Snake Sorter contributors insert own rows" ON public.snake_sorter_contributions';

  IF pol IS NOT NULL OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'snake_sorter_contributions'
      AND cmd = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "Snake Sorter contributors insert own rows" '
         || 'ON public.snake_sorter_contributions FOR INSERT TO authenticated '
         || 'WITH CHECK (contributor_user_id = auth.uid())';
  END IF;

  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'snake_sorter%'
  LOOP
    EXECUTE format('REVOKE TRUNCATE, TRIGGER ON public.%I FROM anon, authenticated', t);
  END LOOP;
END
$$;
