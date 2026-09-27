-- Hatchling Stakes: accept claimed collection snakes at wager time.
--
-- Root cause (Sep 27, 2026): hatchling_stakes_claim_inventory_animal() inserts
-- source = 'inventory-claim', and the live eligible-animals function has no
-- source filter, so claimed snakes show up as eligible. But
-- hatchling_stakes_create_npc_wager() still gated on
-- source = 'breeder-registered', rejecting every claimed snake with
-- 'animal not eligible'. This widens the create-time gate to the same
-- allowlist the claim flow writes, keeping producer/owner/state/lock checks.
-- Idempotent: safe to re-run.

-- 1) Widen the source allowlist on the registry table (the original pilot-era
--    CHECK only knew 'breeder-registered' and 'npc').
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hatchling_stakes_animals_source_check') THEN
    ALTER TABLE public.hatchling_stakes_animals DROP CONSTRAINT hatchling_stakes_animals_source_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hatchling_stakes_animals_source_check') THEN
    ALTER TABLE public.hatchling_stakes_animals ADD CONSTRAINT hatchling_stakes_animals_source_check
      CHECK (source IN ('breeder-registered', 'npc', 'inventory-claim'));
  END IF;
END $$;

-- 2) create_npc_wager: accept inventory-claimed snakes (body otherwise
--    identical to 20260927_unlimited_stake_tokens.sql).
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
    AND source IN ('breeder-registered', 'inventory-claim') AND state = 'active' FOR UPDATE;
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

-- 3) Record the live claim function in the repo (it was created via the
--    dashboard during the claim-flow work and never filed). Now sets
--    state = 'active' explicitly instead of relying on the column default.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_claim_inventory_animal(
  p_name text, p_tier text, p_life_stage text, p_traits jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_key text := 'inv-' || gen_random_uuid()::text;
    v_name text := substr(trim(p_name), 1, 80);
    v_snapshot jsonb;
BEGIN
    IF v_name = '' THEN
        RAISE EXCEPTION 'name is required';
    END IF;
    IF p_tier NOT IN ('sprout', 'vine', 'canopy', 'emergent', 'crown') THEN
        RAISE EXCEPTION 'unknown tier';
    END IF;
    IF p_life_stage NOT IN ('neonate', 'juvenile', 'subadult', 'adult') THEN
        RAISE EXCEPTION 'unknown life stage';
    END IF;
    v_snapshot := jsonb_build_object(
        'name', v_name,
        'life_stage', p_life_stage,
        'origin', 'inventory-claim'
    ) || COALESCE(p_traits, '{}'::jsonb);
    INSERT INTO public.hatchling_stakes_animals
        (asset_key, producer, owner, source, tier, state, trait_snapshot, breeding_event_id)
    VALUES (v_key, auth.uid(), auth.uid(), 'inventory-claim', p_tier, 'active', v_snapshot, NULL);
    RETURN jsonb_build_object('asset_key', v_key, 'tier', p_tier, 'trait_snapshot', v_snapshot);
END;
$function$;
