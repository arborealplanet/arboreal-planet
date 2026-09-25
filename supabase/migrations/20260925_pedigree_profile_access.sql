-- Live database access fixes applied 2026-09-25 (project Arboreal-planet-2).
-- Captures the grants/policies/description change made directly against production
-- so future environments and fresh databases get the same behavior.
-- Idempotent: safe to re-run.
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

-- ---------------------------------------------------------------------------
-- 1. gtp_pedigree_animals: the pedigree read/write failures were missing
--    table-level grants, not missing RLS. Owner-scoped RLS policies already
--    existed; only the grants below were added live.
-- ---------------------------------------------------------------------------

alter table public.gtp_pedigree_animals enable row level security;

grant select on public.gtp_pedigree_animals to anon, authenticated;
grant insert, update, delete on public.gtp_pedigree_animals to authenticated;

-- ---------------------------------------------------------------------------
-- 2. profiles: first-time profile upserts failed because authenticated users
--    had no INSERT grant and no INSERT policy. Adds the owner-scoped INSERT
--    policy plus INSERT/UPDATE grants (SELECT access was already in place).
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

grant insert, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. species: Green Tree Python description. Replaces the
--    "Reference implementation..." placeholder with real natural-history copy.
--    Conditional so re-running against production (which already has the real
--    copy) is a no-op and never overwrites the live text.
-- ---------------------------------------------------------------------------

update public.species
set description = 'The green tree python (Morelia viridis) is an arboreal constrictor native to the rainforests of New Guinea, nearby islands, and far northern Australia. Hatchlings emerge in striking brick-red or lemon-yellow and gradually shift to emerald green as they mature, a color change thought to aid camouflage at different life stages. Built for life above the ground, it has a strongly prehensile tail, a laterally compressed body, and heat-sensing labial pits that let it strike accurately in darkness. It hunts by ambush, coiled in its classic saddle posture over a branch, waiting motionless for birds and small mammals to pass within reach.'
where slug = 'green-tree-python'
  and (description is null or description like 'Reference implementation%');
