-- Fix founder exemptions: the Sep 27, 2026 exemption migrations filed both rows
-- under 'gageallanbunn@gmail.com', but the founder's actual Supabase auth
-- account is 'Arborealsbybunn@gmail.com', so auth.uid() never matched and the
-- exemptions silently did nothing. File both exemptions under the correct
-- account (idempotent). The earlier rows are left in place harmlessly.
--
-- Affected: canopy_hunter_exemptions (unlimited free expeditions),
--           hatchling_stakes_token_exemptions (unlimited weekly wager tokens).

-- 1) Unlimited free Canopy Hunter expeditions for the founder's real account.
INSERT INTO public.canopy_hunter_exemptions (user_id, reason)
SELECT id, 'founder: unlimited free canopy hunter expeditions (corrected email)'
FROM auth.users
WHERE lower(email) = 'arborealsbybunn@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 2) Unlimited weekly Hatchling Stakes wager tokens for the founder's real account.
INSERT INTO public.hatchling_stakes_token_exemptions (user_id, reason)
SELECT id, 'founder: unlimited weekly wager tokens (corrected email)'
FROM auth.users
WHERE lower(email) = 'arborealsbybunn@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
