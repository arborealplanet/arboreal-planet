-- Unlimited wager tokens for exempt accounts (founder/testing).
-- Adds a server-side exemption list consulted by the token ledger and the
-- NPC wager gate. Everyone else keeps the 2-tokens-per-week rule.

CREATE TABLE IF NOT EXISTS public.hatchling_stakes_token_exemptions (
  user_id uuid PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hatchling_stakes_token_exemptions ENABLE ROW LEVEL SECURITY;
-- No direct client access: everything flows through the RPCs below.

-- Weekly token ledger for the caller (creates this week's two slots).
-- Exempt callers get 'unlimited: true' and skip token consumption.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_my_tokens()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week text := to_char(date_trunc('week', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD');
  v_next timestamptz := date_trunc('week', now() AT TIME ZONE 'UTC') + interval '7 days';
  v_exempt boolean;
  v_tokens jsonb;
BEGIN
  INSERT INTO public.hatchling_stakes_tokens (user_id, week_key, slot)
  VALUES (auth.uid(), v_week, 1), (auth.uid(), v_week, 2)
  ON CONFLICT (user_id, week_key, slot) DO NOTHING;
  SELECT EXISTS (
    SELECT 1 FROM public.hatchling_stakes_token_exemptions WHERE user_id = auth.uid()
  ) INTO v_exempt;
  SELECT jsonb_agg(jsonb_build_object('slot', slot, 'status', status, 'wager_id', wager_id)
                    ORDER BY slot)
    INTO v_tokens
    FROM public.hatchling_stakes_tokens
    WHERE user_id = auth.uid() AND week_key = v_week;
  RETURN jsonb_build_object(
    'week_key', v_week,
    'resets_at', v_next,
    'unlimited', v_exempt,
    'tokens', v_tokens
  );
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_my_tokens() FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_my_tokens() TO authenticated;

-- Create an NPC wager for the caller's staked hatchling, mints a same-tier
-- canonical NPC hatchling (seasonally capped), and opens the server-owned
-- game session. Idempotent per player asset lock.
-- Exempt callers skip the weekly token reservation entirely.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_create_npc_wager(p_asset_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_enabled text;
  v_week text := to_char(date_trunc('week', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD');
  v_token_slot int;
  v_exempt boolean;
  v_tier text;
  v_snapshot jsonb;
  v_wager_id uuid;
  v_npc_key text;
  v_season text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_cap int;
  v_npc_count int;
  v_npc_template text;
  v_npc_name text;
BEGIN
  SELECT value INTO v_enabled FROM public.hatchling_stakes_config WHERE key = 'stakes_enabled';
  IF v_enabled IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'hatchling stakes are paused';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.hatchling_stakes_token_exemptions WHERE user_id = auth.uid()
  ) INTO v_exempt;

  IF NOT v_exempt THEN
    INSERT INTO public.hatchling_stakes_tokens (user_id, week_key, slot)
    VALUES (auth.uid(), v_week, 1), (auth.uid(), v_week, 2)
    ON CONFLICT (user_id, week_key, slot) DO NOTHING;

    SELECT slot INTO v_token_slot FROM public.hatchling_stakes_tokens
    WHERE user_id = auth.uid() AND week_key = v_week AND status = 'available'
    ORDER BY slot LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'no wager tokens left this week';
    END IF;
  END IF;

  SELECT tier, trait_snapshot INTO v_tier, v_snapshot
  FROM public.hatchling_stakes_animals
  WHERE asset_key = p_asset_key AND producer = auth.uid() AND owner = auth.uid()
    AND source = 'breeder-registered' AND state = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'animal not eligible';
  END IF;
  IF v_tier NOT IN ('sprout', 'vine', 'canopy') THEN
    RAISE EXCEPTION 'tier not open in the NPC pilot';
  END IF;
  IF EXISTS (SELECT 1 FROM public.hatchling_stakes_wager_locks
             WHERE asset_key = p_asset_key AND state = 'active') THEN
    RAISE EXCEPTION 'animal already staked';
  END IF;

  SELECT value::int INTO v_cap FROM public.hatchling_stakes_config
  WHERE key = 'npc_monthly_cap_per_tier';
  SELECT count(*) INTO v_npc_count FROM public.hatchling_stakes_npc_inventory
  WHERE tier = v_tier AND season = v_season;
  IF v_npc_count >= v_cap THEN
    RAISE EXCEPTION 'no NPC counter-stakes left this season';
  END IF;

  -- Mint the canonical NPC asset (never from a player save).
  v_npc_key := 'hs-npc-' || encode(gen_random_bytes(16), 'hex');
  v_npc_template := CASE v_tier
    WHEN 'sprout' THEN 'Canopy wildling'
    WHEN 'vine' THEN 'Riverbend yearling'
    ELSE 'Emergent line prospect' END;
  v_npc_name := CASE v_tier
    WHEN 'sprout' THEN 'Wildling'
    WHEN 'vine' THEN 'River pup'
    ELSE 'Canopy prospect' END;
  INSERT INTO public.hatchling_stakes_animals
    (asset_key, producer, owner, source, tier, trait_snapshot, state)
  VALUES (v_npc_key, '00000000-0000-0000-0000-000000000000',
          '00000000-0000-0000-0000-000000000000', 'npc', v_tier,
          jsonb_build_object('name', v_npc_name, 'traits', '{}'::jsonb,
                             'template', v_npc_template), 'staked');
  INSERT INTO public.hatchling_stakes_npc_inventory (asset_key, tier, template, season, state)
  VALUES (v_npc_key, v_tier, v_npc_template, v_season, 'staked');

  INSERT INTO public.hatchling_stakes_wagers (mode, game, state, creator, npc_asset_key)
  VALUES ('npc', 'blackjack', 'locked', auth.uid(), v_npc_key)
  RETURNING id INTO v_wager_id;

  INSERT INTO public.hatchling_stakes_wager_entries (wager_id, actor, asset_key, snapshot)
  VALUES
    (v_wager_id, auth.uid(), p_asset_key,
     jsonb_build_object('tier', v_tier, 'snapshot', v_snapshot, 'side', 'player')),
    (v_wager_id, '00000000-0000-0000-0000-000000000000', v_npc_key,
     jsonb_build_object('tier', v_tier, 'template', v_npc_template, 'side', 'npc'));

  INSERT INTO public.hatchling_stakes_wager_locks (asset_key, wager_id)
  VALUES (p_asset_key, v_wager_id), (v_npc_key, v_wager_id);

  UPDATE public.hatchling_stakes_animals SET state = 'staked'
  WHERE asset_key IN (p_asset_key, v_npc_key);

  INSERT INTO public.hatchling_stakes_wager_events (wager_id, seq, type, payload_hash, payload)
  VALUES (v_wager_id, 1, 'wager_locked', encode(digest(v_wager_id::text, 'sha256'), 'hex'),
          jsonb_build_object('player_asset', p_asset_key, 'npc_asset', v_npc_key, 'tier', v_tier));

  IF NOT v_exempt THEN
    UPDATE public.hatchling_stakes_tokens
    SET status = 'reserved', wager_id = v_wager_id, updated_at = now()
    WHERE user_id = auth.uid() AND week_key = v_week AND slot = v_token_slot;
  END IF;

  INSERT INTO public.hatchling_stakes_game_sessions (wager_id, target_score)
  VALUES (v_wager_id, 100);

  RETURN jsonb_build_object(
    'wager_id', v_wager_id,
    'npc_asset_key', v_npc_key,
    'npc_name', v_npc_name,
    'tier', v_tier,
    'target', 100,
    'token_slot', v_token_slot
  );
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_create_npc_wager(text) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_create_npc_wager(text) TO authenticated;

-- Founder exemption: unlimited staking tokens for Gage's account only.
INSERT INTO public.hatchling_stakes_token_exemptions (user_id, reason)
SELECT id, 'founder: unlimited staking tokens'
FROM auth.users
WHERE email = 'gageallanbunn@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
