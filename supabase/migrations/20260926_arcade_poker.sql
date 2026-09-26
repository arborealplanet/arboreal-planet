-- Arboreal Arcade: snake-poker card room + Hatchling Stakes (phase 1 NPC pilot).
-- Safe to run multiple times (every block is guarded). Purely additive:
-- new tables, new RPCs, one new public storage bucket. No existing table,
-- row, or policy is touched. Lifesap is a standalone arcade currency and
-- never interacts with keeper cash, Hunter expedition fees, or marketplace.
--
-- NOTE: run this against the live database; the repo does not hold the full schema.
-- Tables use auth.uid() at the RPC boundary; the Next.js API layer calls these
-- RPCs with the player's own bearer token (same pattern as
-- withdraw_snake_sorter_contribution).

-- ============================================================================
-- 1. LIFESAP BANKROLL (soft arcade currency, starts at 1000 per user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lifesap_bankrolls (
  user_id uuid PRIMARY KEY,
  balance bigint NOT NULL DEFAULT 1000 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifesap_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta bigint NOT NULL,
  balance_after bigint NOT NULL,
  game text NOT NULL,
  round_ref uuid,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lifesap_ledger_user_idx ON lifesap_ledger (user_id, created_at DESC);

-- Open card rounds: a bet is debited up front; settle credits a bounded payout.
CREATE TABLE IF NOT EXISTS poker_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game text NOT NULL CHECK (game IN ('holdem', 'blackjack', 'draw')),
  bet bigint NOT NULL CHECK (bet > 0),
  added_bet bigint NOT NULL DEFAULT 0 CHECK (added_bet >= 0),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'settled', 'voided')),
  payout bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 hours'
);
CREATE INDEX IF NOT EXISTS poker_rounds_user_state_idx ON poker_rounds (user_id, game, state);

ALTER TABLE lifesap_bankrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifesap_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_rounds ENABLE ROW LEVEL SECURITY;
-- No direct client access: all movement goes through the RPCs below.

-- Return the caller's bankroll, creating it at 1000 on first use.
CREATE OR REPLACE FUNCTION public.lifesap_get_bankroll()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
BEGIN
  INSERT INTO public.lifesap_bankrolls (user_id, balance)
  VALUES (auth.uid(), 1000)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO v_balance FROM public.lifesap_bankrolls WHERE user_id = auth.uid();
  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.lifesap_get_bankroll() FROM public;
GRANT EXECUTE ON FUNCTION public.lifesap_get_bankroll() TO authenticated;

-- Table limits (per game) and max payout multipliers (× bet, incl. returned stake).
-- These bounds are the anti-mint: the client reports a hand result, the server
-- caps what it can be worth. Hold'em: 6 seats × buy-in. Blackjack: split+double
-- +insurance worst case. Draw: royal 800× + 5 double-or-nothing steps.
CREATE OR REPLACE FUNCTION public.poker_game_limits(p_game text)
RETURNS TABLE (max_bet bigint, max_payout_mult numeric)
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  CASE p_game
    WHEN 'holdem' THEN RETURN QUERY SELECT 1000::bigint, 6::numeric;
    WHEN 'blackjack' THEN RETURN QUERY SELECT 500::bigint, 12::numeric;
    WHEN 'draw' THEN RETURN QUERY SELECT 50::bigint, 30000::numeric;
    ELSE RAISE EXCEPTION 'unknown game %', p_game;
  END CASE;
END;
$$;

-- Debit a bet and open a round. Voids (refunds) the caller's expired open rounds first.
CREATE OR REPLACE FUNCTION public.poker_place_bet(p_game text, p_bet bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_bet bigint;
  v_balance bigint;
  v_round_id uuid;
  v_exp interval;
BEGIN
  IF p_game NOT IN ('holdem', 'blackjack', 'draw') THEN
    RAISE EXCEPTION 'unknown game %', p_game;
  END IF;
  SELECT max_bet INTO v_max_bet FROM public.poker_game_limits(p_game);
  IF p_bet IS NULL OR p_bet <= 0 OR p_bet > v_max_bet THEN
    RAISE EXCEPTION 'bet out of range';
  END IF;

  INSERT INTO public.lifesap_bankrolls (user_id, balance)
  VALUES (auth.uid(), 1000)
  ON CONFLICT (user_id) DO NOTHING;

  -- Refund expired open rounds before opening a new one.
  UPDATE public.poker_rounds
  SET state = 'voided', updated_at = now()
  WHERE user_id = auth.uid() AND state = 'open' AND expires_at < now();

  UPDATE public.lifesap_bankrolls b
  SET balance = b.balance + r.bet + r.added_bet, updated_at = now()
  FROM public.poker_rounds r
  WHERE r.user_id = auth.uid() AND r.state = 'voided' AND r.payout IS NULL
    AND b.user_id = auth.uid()
    AND r.updated_at > now() - interval '1 minute';
  -- Mark refunded so the sweep above never double-refunds.
  UPDATE public.poker_rounds
  SET payout = 0
  WHERE user_id = auth.uid() AND state = 'voided' AND payout IS NULL
    AND updated_at > now() - interval '1 minute';

  IF EXISTS (SELECT 1 FROM public.poker_rounds
             WHERE user_id = auth.uid() AND game = p_game AND state = 'open') THEN
    RAISE EXCEPTION 'settle your open % round first', p_game;
  END IF;

  SELECT balance INTO v_balance FROM public.lifesap_bankrolls WHERE user_id = auth.uid();
  IF v_balance < p_bet THEN
    RAISE EXCEPTION 'insufficient lifesap';
  END IF;

  v_exp := CASE WHEN p_game = 'holdem' THEN interval '24 hours' ELSE interval '2 hours' END;

  UPDATE public.lifesap_bankrolls
  SET balance = balance - p_bet, updated_at = now()
  WHERE user_id = auth.uid();

  INSERT INTO public.poker_rounds (user_id, game, bet, expires_at)
  VALUES (auth.uid(), p_game, p_bet, now() + v_exp)
  RETURNING id INTO v_round_id;

  INSERT INTO public.lifesap_ledger (user_id, delta, balance_after, game, round_ref, reason)
  VALUES (auth.uid(), -p_bet, v_balance - p_bet, p_game, v_round_id, 'bet placed');

  RETURN v_round_id;
END;
$$;
REVOKE ALL ON FUNCTION public.poker_place_bet(text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.poker_place_bet(text, bigint) TO authenticated;

-- Hold'em rebuys top up the open round's stake (capped).
CREATE OR REPLACE FUNCTION public.poker_add_rebuy(p_round_id uuid, p_amount bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000 THEN
    RAISE EXCEPTION 'rebuy out of range';
  END IF;
  SELECT balance INTO v_balance FROM public.lifesap_bankrolls WHERE user_id = auth.uid();
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient lifesap';
  END IF;
  UPDATE public.poker_rounds
  SET added_bet = added_bet + p_amount, updated_at = now()
  WHERE id = p_round_id AND user_id = auth.uid() AND game = 'holdem' AND state = 'open'
    AND bet + added_bet + p_amount <= 3000;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no open holdem round for rebuy';
  END IF;
  UPDATE public.lifesap_bankrolls SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = auth.uid();
  INSERT INTO public.lifesap_ledger (user_id, delta, balance_after, game, round_ref, reason)
  VALUES (auth.uid(), -p_amount, v_balance - p_amount, 'holdem', p_round_id, 'rebuy');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.poker_add_rebuy(uuid, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.poker_add_rebuy(uuid, bigint) TO authenticated;

-- Credit a bounded payout for an open round. The client reports the result;
-- the server caps what it can be worth (see poker_game_limits).
-- p_risked (blackjack only): total lifesap actually put at risk this hand
-- (doubles/splits/insurance). The server debits any risk beyond the opening
-- bet first, then bounds the payout at 2.5x risked (blackjack pays 3:2).
CREATE OR REPLACE FUNCTION public.poker_settle_round(p_round_id uuid, p_payout bigint, p_risked bigint DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.poker_rounds%ROWTYPE;
  v_max_mult numeric;
  v_max_payout bigint;
  v_balance bigint;
  v_risked bigint;
  v_extra bigint;
BEGIN
  SELECT * INTO r FROM public.poker_rounds
  WHERE id = p_round_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'round not found';
  END IF;
  IF r.state <> 'open' THEN
    RAISE EXCEPTION 'round already settled';
  END IF;

  IF r.game = 'blackjack' AND p_risked IS NOT NULL THEN
    -- Blackjack: risk is only known once the hand is played.
    v_risked := p_risked;
    IF v_risked < r.bet OR v_risked > r.bet * 5 THEN
      RAISE EXCEPTION 'risk out of bounds';
    END IF;
    v_extra := v_risked - r.bet;
    SELECT balance INTO v_balance FROM public.lifesap_bankrolls WHERE user_id = auth.uid() FOR UPDATE;
    IF v_balance < v_extra THEN
      RAISE EXCEPTION 'insufficient lifesap';
    END IF;
    IF v_extra > 0 THEN
      UPDATE public.lifesap_bankrolls SET balance = balance - v_extra, updated_at = now()
      WHERE user_id = auth.uid();
      INSERT INTO public.lifesap_ledger (user_id, delta, balance_after, game, round_ref, reason)
      VALUES (auth.uid(), -v_extra, v_balance - v_extra, r.game, p_round_id, 'extra risk (double/split/insurance)');
      v_balance := v_balance - v_extra;
    END IF;
    v_max_payout := floor(v_risked * 2.5)::bigint;
  ELSE
    SELECT max_payout_mult INTO v_max_mult FROM public.poker_game_limits(r.game);
    v_max_payout := floor((r.bet + r.added_bet) * v_max_mult)::bigint;
  END IF;

  IF p_payout IS NULL OR p_payout < 0 OR p_payout > v_max_payout THEN
    RAISE EXCEPTION 'payout out of bounds';
  END IF;

  UPDATE public.poker_rounds
  SET state = 'settled', payout = p_payout, updated_at = now()
  WHERE id = p_round_id;

  UPDATE public.lifesap_bankrolls
  SET balance = balance + p_payout, updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING balance INTO v_balance;

  INSERT INTO public.lifesap_ledger (user_id, delta, balance_after, game, round_ref, reason)
  VALUES (auth.uid(), p_payout, v_balance, r.game, p_round_id, 'round settled');

  RETURN v_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.poker_settle_round(uuid, bigint, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.poker_settle_round(uuid, bigint, bigint) TO authenticated;

-- ============================================================================
-- 2. HATCHLING STAKES (phase 1: NPC pilot) — sidecar provenance registry
-- ============================================================================

-- Immutable server-issued proof that breeder X produced clutch Y.
CREATE TABLE IF NOT EXISTS hatchling_stakes_breeding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breeder uuid NOT NULL,
  clutch_fingerprint text NOT NULL,
  parents jsonb NOT NULL DEFAULT '{}'::jsonb,
  genetics jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (breeder, clutch_fingerprint)
);

-- Canonical asset registry. asset_key is server-issued and survives renames.
CREATE TABLE IF NOT EXISTS hatchling_stakes_animals (
  asset_key text PRIMARY KEY,
  producer uuid NOT NULL,
  owner uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('breeder-registered', 'npc')),
  tier text NOT NULL CHECK (tier IN ('sprout', 'vine', 'canopy', 'emergent', 'crown')),
  trait_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'staked', 'transferred', 'retired')),
  breeding_event_id uuid REFERENCES hatchling_stakes_breeding_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hs_animals_owner_idx ON hatchling_stakes_animals (owner, state);

-- Append-only ownership ledger.
CREATE TABLE IF NOT EXISTS hatchling_stakes_ownership_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key text NOT NULL REFERENCES hatchling_stakes_animals(asset_key) ON DELETE CASCADE,
  from_user uuid,
  to_user uuid,
  reason text NOT NULL,
  seq int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_key, seq)
);

-- Anti-double-spend sidecar: one active lock per asset.
CREATE TABLE IF NOT EXISTS hatchling_stakes_wager_locks (
  asset_key text PRIMARY KEY REFERENCES hatchling_stakes_animals(asset_key) ON DELETE CASCADE,
  wager_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'released')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);

CREATE TABLE IF NOT EXISTS hatchling_stakes_wagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'npc' CHECK (mode IN ('npc', 'keeper')),
  game text NOT NULL DEFAULT 'blackjack' CHECK (game IN ('blackjack', 'draw')),
  state text NOT NULL DEFAULT 'locked'
    CHECK (state IN ('draft','open','confirming','locked','in_progress','settling','complete','void','review')),
  rule_version text NOT NULL DEFAULT 'bj-stake-v1',
  creator uuid NOT NULL,
  npc_asset_key text REFERENCES hatchling_stakes_animals(asset_key) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hatchling_stakes_wager_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wager_id uuid NOT NULL REFERENCES hatchling_stakes_wagers(id) ON DELETE CASCADE,
  actor uuid NOT NULL,
  asset_key text NOT NULL REFERENCES hatchling_stakes_animals(asset_key) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wager_id, actor)
);

CREATE TABLE IF NOT EXISTS hatchling_stakes_wager_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wager_id uuid NOT NULL REFERENCES hatchling_stakes_wagers(id) ON DELETE CASCADE,
  seq int NOT NULL,
  type text NOT NULL,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wager_id, seq)
);

-- Two weekly entries per account, Monday 00:00 UTC reset, no rollover.
CREATE TABLE IF NOT EXISTS hatchling_stakes_tokens (
  user_id uuid NOT NULL,
  week_key text NOT NULL,
  slot int NOT NULL CHECK (slot IN (1, 2)),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'consumed', 'refunded')),
  wager_id uuid REFERENCES hatchling_stakes_wagers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_key, slot)
);

-- Server-owned game session: shoe + transcript live here, never the browser.
CREATE TABLE IF NOT EXISTS hatchling_stakes_game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wager_id uuid NOT NULL UNIQUE REFERENCES hatchling_stakes_wagers(id) ON DELETE CASCADE,
  seed_commitment text,
  shoe jsonb NOT NULL DEFAULT '[]'::jsonb,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  player_score int NOT NULL DEFAULT 100,
  target_score int NOT NULL DEFAULT 100,
  hands_played int NOT NULL DEFAULT 0,
  base_bet int NOT NULL DEFAULT 10,
  winner uuid,
  state text NOT NULL DEFAULT 'awaiting_shoe'
    CHECK (state IN ('awaiting_shoe','in_progress','complete','voided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Controlled NPC counter-stake inventory, seasonally capped.
CREATE TABLE IF NOT EXISTS hatchling_stakes_npc_inventory (
  asset_key text PRIMARY KEY REFERENCES hatchling_stakes_animals(asset_key) ON DELETE CASCADE,
  tier text NOT NULL,
  template text NOT NULL,
  season text NOT NULL,
  state text NOT NULL DEFAULT 'available' CHECK (state IN ('available', 'staked', 'awarded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Kill switch + tunables.
CREATE TABLE IF NOT EXISTS hatchling_stakes_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO hatchling_stakes_config (key, value) VALUES
  ('stakes_enabled', 'true'),
  ('npc_monthly_cap_per_tier', '50')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE hatchling_stakes_breeding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_ownership_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_wager_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_wager_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_wager_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hatchling_stakes_npc_inventory ENABLE ROW LEVEL SECURITY;
-- No direct client access: everything flows through the RPCs below.

-- Weekly token ledger for the caller (creates this week's two slots).
CREATE OR REPLACE FUNCTION public.hatchling_stakes_my_tokens()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week text := to_char(date_trunc('week', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD');
  v_next timestamptz := date_trunc('week', now() AT TIME ZONE 'UTC') + interval '7 days';
BEGIN
  INSERT INTO public.hatchling_stakes_tokens (user_id, week_key, slot)
  VALUES (auth.uid(), v_week, 1), (auth.uid(), v_week, 2)
  ON CONFLICT (user_id, week_key, slot) DO NOTHING;
  RETURN jsonb_build_object(
    'week_key', v_week,
    'resets_at', v_next,
    'tokens', (SELECT jsonb_agg(jsonb_build_object('slot', slot, 'status', status, 'wager_id', wager_id)
                               ORDER BY slot)
              FROM public.hatchling_stakes_tokens
              WHERE user_id = auth.uid() AND week_key = v_week)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_my_tokens() FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_my_tokens() TO authenticated;

-- Animals the caller may stake: server-registered, producer = owner = caller,
-- hatchling-stage, active, and not currently locked.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_eligible_animals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'asset_key', a.asset_key,
      'tier', a.tier,
      'trait_snapshot', a.trait_snapshot,
      'created_at', a.created_at
    ) ORDER BY a.created_at DESC)
    FROM public.hatchling_stakes_animals a
    WHERE a.producer = auth.uid()
      AND a.owner = auth.uid()
      AND a.source = 'breeder-registered'
      AND a.state = 'active'
      AND NOT EXISTS (SELECT 1 FROM public.hatchling_stakes_wager_locks l
                      WHERE l.asset_key = a.asset_key AND l.state = 'active')
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_eligible_animals() FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_eligible_animals() TO authenticated;

-- Register a bred clutch. Idempotent per (breeder, clutch_fingerprint): a rolled-back
-- or re-submitted save returns the SAME canonical assets, never duplicates.
-- p_offspring: jsonb array of {name, tier, traits}.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_register_offspring(
  p_clutch_fingerprint text,
  p_parents jsonb,
  p_offspring jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_assets jsonb := '[]'::jsonb;
  o jsonb;
  v_key text;
BEGIN
  IF p_clutch_fingerprint IS NULL OR length(p_clutch_fingerprint) > 200 THEN
    RAISE EXCEPTION 'bad fingerprint';
  END IF;
  IF p_offspring IS NULL OR jsonb_array_length(p_offspring) = 0
     OR jsonb_array_length(p_offspring) > 40 THEN
    RAISE EXCEPTION 'bad offspring list';
  END IF;

  SELECT id INTO v_event_id FROM public.hatchling_stakes_breeding_events
  WHERE breeder = auth.uid() AND clutch_fingerprint = p_clutch_fingerprint;

  IF v_event_id IS NULL THEN
    INSERT INTO public.hatchling_stakes_breeding_events (breeder, clutch_fingerprint, parents)
    VALUES (auth.uid(), p_clutch_fingerprint, COALESCE(p_parents, '{}'::jsonb))
    RETURNING id INTO v_event_id;

    FOR o IN SELECT * FROM jsonb_array_elements(p_offspring) LOOP
      IF COALESCE(o->>'tier', '') NOT IN ('sprout','vine','canopy','emergent','crown') THEN
        RAISE EXCEPTION 'bad tier';
      END IF;
      v_key := 'hs-' || encode(gen_random_bytes(16), 'hex');
      INSERT INTO public.hatchling_stakes_animals
        (asset_key, producer, owner, source, tier, trait_snapshot, breeding_event_id)
      VALUES (v_key, auth.uid(), auth.uid(), 'breeder-registered', o->>'tier',
              jsonb_build_object('name', left(COALESCE(o->>'name','Hatchling'), 80),
                                 'traits', COALESCE(o->'traits', '{}'::jsonb)),
              v_event_id);
      v_assets := v_assets || jsonb_build_object('asset_key', v_key, 'tier', o->>'tier',
                                                'name', left(COALESCE(o->>'name','Hatchling'), 80));
    END LOOP;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'asset_key', asset_key, 'tier', tier,
      'name', trait_snapshot->>'name') ORDER BY created_at), '[]'::jsonb)
    INTO v_assets
    FROM public.hatchling_stakes_animals WHERE breeding_event_id = v_event_id;
  END IF;

  RETURN jsonb_build_object('breeding_event_id', v_event_id, 'assets', v_assets);
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_register_offspring(text, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_register_offspring(text, jsonb, jsonb) TO authenticated;

-- Phase 1: create an NPC stake. Consumes one weekly token, locks the player's
-- hatchling, mints a same-tier canonical NPC hatchling (seasonally capped),
-- and opens the server-owned game session. Idempotent per player asset lock.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_create_npc_wager(p_asset_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled text;
  v_week text := to_char(date_trunc('week', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD');
  v_token_slot int;
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

  INSERT INTO public.hatchling_stakes_tokens (user_id, week_key, slot)
  VALUES (auth.uid(), v_week, 1), (auth.uid(), v_week, 2)
  ON CONFLICT (user_id, week_key, slot) DO NOTHING;

  SELECT slot INTO v_token_slot FROM public.hatchling_stakes_tokens
  WHERE user_id = auth.uid() AND week_key = v_week AND status = 'available'
  ORDER BY slot LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no wager tokens left this week';
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

  UPDATE public.hatchling_stakes_tokens
  SET status = 'reserved', wager_id = v_wager_id, updated_at = now()
  WHERE user_id = auth.uid() AND week_key = v_week AND slot = v_token_slot;

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

-- Attach the server-generated shoe to a locked wager and enter in_progress.
-- Called by the trusted game service (API route) with a CSPRNG shoe.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_start_session(
  p_wager_id uuid, p_seed_commitment text, p_shoe jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_creator uuid;
BEGIN
  SELECT state, creator INTO v_state, v_creator FROM public.hatchling_stakes_wagers
  WHERE id = p_wager_id FOR UPDATE;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  IF v_state <> 'locked' THEN
    RAISE EXCEPTION 'wager not lockable';
  END IF;
  IF p_shoe IS NULL OR jsonb_array_length(p_shoe) < 100 THEN
    RAISE EXCEPTION 'bad shoe';
  END IF;

  UPDATE public.hatchling_stakes_game_sessions
  SET seed_commitment = p_seed_commitment, shoe = p_shoe, state = 'in_progress',
      updated_at = now()
  WHERE wager_id = p_wager_id AND state = 'awaiting_shoe';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'session not ready';
  END IF;

  UPDATE public.hatchling_stakes_wagers
  SET state = 'in_progress', updated_at = now()
  WHERE id = p_wager_id;

  UPDATE public.hatchling_stakes_tokens
  SET status = 'consumed', updated_at = now()
  WHERE wager_id = p_wager_id AND status = 'reserved';

  INSERT INTO public.hatchling_stakes_wager_events (wager_id, seq, type, payload_hash, payload)
  VALUES (p_wager_id,
          (SELECT COALESCE(max(seq), 0) + 1 FROM public.hatchling_stakes_wager_events WHERE wager_id = p_wager_id),
          'session_started', encode(digest(p_seed_commitment, 'sha256'), 'hex'),
          jsonb_build_object('seed_commitment', p_seed_commitment));

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_start_session(uuid, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_start_session(uuid, text, jsonb) TO authenticated;

-- Draw the next N cards from the server shoe. The browser never sees undealt cards.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_session_draw(p_wager_id uuid, p_count int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_wstate text;
  v_shoe jsonb;
  v_drawn jsonb;
BEGIN
  SELECT w.creator, w.state INTO v_creator, v_wstate
  FROM public.hatchling_stakes_wagers w WHERE w.id = p_wager_id;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  IF v_wstate <> 'in_progress' THEN
    RAISE EXCEPTION 'wager not in progress';
  END IF;
  IF p_count IS NULL OR p_count < 1 OR p_count > 12 THEN
    RAISE EXCEPTION 'bad draw count';
  END IF;

  SELECT shoe INTO v_shoe FROM public.hatchling_stakes_game_sessions
  WHERE wager_id = p_wager_id FOR UPDATE;
  IF jsonb_array_length(v_shoe) < p_count THEN
    RAISE EXCEPTION 'shoe exhausted';
  END IF;

  v_drawn := (SELECT jsonb_agg(e ORDER BY o)
              FROM jsonb_array_elements(v_shoe) WITH ORDINALITY AS t(e, o)
              WHERE o <= p_count);

  UPDATE public.hatchling_stakes_game_sessions
  SET shoe = (SELECT jsonb_agg(e ORDER BY o)
              FROM jsonb_array_elements(v_shoe) WITH ORDINALITY AS t(e, o)
              WHERE o > p_count),
      transcript = transcript || jsonb_build_object('t', 'draw', 'n', p_count,
                                                    'at', now()::text),
      updated_at = now()
  WHERE wager_id = p_wager_id;

  RETURN v_drawn;
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_session_draw(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_session_draw(uuid, int) TO authenticated;

-- Append a game event to the server transcript + optionally update the score.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_session_append(
  p_wager_id uuid, p_event jsonb, p_player_score int, p_hands_played int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_wstate text;
BEGIN
  SELECT w.creator, w.state INTO v_creator, v_wstate
  FROM public.hatchling_stakes_wagers w WHERE w.id = p_wager_id;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  IF v_wstate <> 'in_progress' THEN
    RAISE EXCEPTION 'wager not in progress';
  END IF;
  UPDATE public.hatchling_stakes_game_sessions
  SET transcript = transcript || COALESCE(p_event, '{}'::jsonb),
      player_score = COALESCE(p_player_score, player_score),
      hands_played = COALESCE(p_hands_played, hands_played),
      updated_at = now()
  WHERE wager_id = p_wager_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_session_append(uuid, jsonb, int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_session_append(uuid, jsonb, int, int) TO authenticated;

-- Atomic settlement: one winner, exactly once. Appends ownership events for both
-- assets, transfers canonical ownership, releases locks, completes the wager.
-- Idempotent: replays return the original receipt.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_settle(
  p_wager_id uuid, p_winner uuid, p_player_score int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_creator uuid;
  v_player_asset text;
  v_npc_asset text;
  v_seq int;
  v_npc uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  SELECT state, creator INTO v_state, v_creator
  FROM public.hatchling_stakes_wagers WHERE id = p_wager_id FOR UPDATE;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  IF v_state = 'complete' THEN
    RETURN jsonb_build_object('wager_id', p_wager_id, 'state', 'complete', 'replay', true,
      'winner', (SELECT winner FROM public.hatchling_stakes_game_sessions WHERE wager_id = p_wager_id));
  END IF;
  IF v_state <> 'in_progress' THEN
    RAISE EXCEPTION 'wager not settleable';
  END IF;
  IF p_winner <> auth.uid() AND p_winner <> v_npc THEN
    RAISE EXCEPTION 'bad winner';
  END IF;

  SELECT asset_key INTO v_player_asset FROM public.hatchling_stakes_wager_entries
  WHERE wager_id = p_wager_id AND actor = auth.uid();
  SELECT asset_key INTO v_npc_asset FROM public.hatchling_stakes_wager_entries
  WHERE wager_id = p_wager_id AND actor = v_npc;

  UPDATE public.hatchling_stakes_wagers SET state = 'settling', updated_at = now()
  WHERE id = p_wager_id;

  -- Ownership ledger: winner takes both.
  SELECT COALESCE(max(seq), 0) + 1 INTO v_seq FROM public.hatchling_stakes_ownership_events
  WHERE asset_key = v_player_asset;
  INSERT INTO public.hatchling_stakes_ownership_events (asset_key, from_user, to_user, reason, seq)
  VALUES (v_player_asset, auth.uid(), p_winner, 'wager_settlement', v_seq);
  SELECT COALESCE(max(seq), 0) + 1 INTO v_seq FROM public.hatchling_stakes_ownership_events
  WHERE asset_key = v_npc_asset;
  INSERT INTO public.hatchling_stakes_ownership_events (asset_key, from_user, to_user, reason, seq)
  VALUES (v_npc_asset, v_npc, p_winner, 'wager_settlement', v_seq);

  UPDATE public.hatchling_stakes_animals
  SET owner = p_winner, state = 'active'
  WHERE asset_key IN (v_player_asset, v_npc_asset);

  DELETE FROM public.hatchling_stakes_wager_locks WHERE wager_id = p_wager_id;
  UPDATE public.hatchling_stakes_npc_inventory SET state = 'awarded'
  WHERE asset_key = v_npc_asset;

  UPDATE public.hatchling_stakes_game_sessions
  SET winner = p_winner, player_score = p_player_score, state = 'complete', updated_at = now()
  WHERE wager_id = p_wager_id;

  INSERT INTO public.hatchling_stakes_wager_events (wager_id, seq, type, payload_hash, payload)
  VALUES (p_wager_id,
          (SELECT COALESCE(max(seq), 0) + 1 FROM public.hatchling_stakes_wager_events WHERE wager_id = p_wager_id),
          'settled', encode(digest(p_wager_id::text || p_winner::text, 'sha256'), 'hex'),
          jsonb_build_object('winner', p_winner, 'player_score', p_player_score));

  UPDATE public.hatchling_stakes_wagers SET state = 'complete', updated_at = now()
  WHERE id = p_wager_id;

  RETURN jsonb_build_object('wager_id', p_wager_id, 'state', 'complete',
                            'winner', p_winner, 'player_score', p_player_score,
                            'player_is_winner', p_winner = auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_settle(uuid, uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_settle(uuid, uuid, int) TO authenticated;

-- Void: platform fault or tie — unlock both assets, refund the token, no winner.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_void(p_wager_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_creator uuid;
BEGIN
  SELECT state, creator INTO v_state, v_creator
  FROM public.hatchling_stakes_wagers WHERE id = p_wager_id FOR UPDATE;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  IF v_state IN ('complete', 'void') THEN
    RETURN true;
  END IF;

  UPDATE public.hatchling_stakes_animals SET state = 'active'
  WHERE asset_key IN (SELECT asset_key FROM public.hatchling_stakes_wager_locks WHERE wager_id = p_wager_id);
  DELETE FROM public.hatchling_stakes_wager_locks WHERE wager_id = p_wager_id;
  UPDATE public.hatchling_stakes_npc_inventory SET state = 'available'
  WHERE asset_key IN (SELECT npc_asset_key FROM public.hatchling_stakes_wagers WHERE id = p_wager_id)
    AND state = 'staked';

  UPDATE public.hatchling_stakes_tokens
  SET status = 'refunded', updated_at = now()
  WHERE wager_id = p_wager_id AND status IN ('reserved', 'consumed');

  UPDATE public.hatchling_stakes_game_sessions SET state = 'voided', updated_at = now()
  WHERE wager_id = p_wager_id;

  INSERT INTO public.hatchling_stakes_wager_events (wager_id, seq, type, payload_hash, payload)
  VALUES (p_wager_id,
          (SELECT COALESCE(max(seq), 0) + 1 FROM public.hatchling_stakes_wager_events WHERE wager_id = p_wager_id),
          'voided', encode(digest(p_wager_id::text || coalesce(p_reason,''), 'sha256'), 'hex'),
          jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)));

  UPDATE public.hatchling_stakes_wagers SET state = 'void', updated_at = now()
  WHERE id = p_wager_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_void(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_void(uuid, text) TO authenticated;

-- Wager history for the caller (receipts).CREATE OR REPLACE FUNCTION public.hatchling_stakes_history(p_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'wager_id', w.id, 'mode', w.mode, 'game', w.game, 'state', w.state,
      'rule_version', w.rule_version, 'created_at', w.created_at,
      'player_asset', (SELECT asset_key FROM public.hatchling_stakes_wager_entries e
                       WHERE e.wager_id = w.id AND e.actor = auth.uid()),
      'npc_asset', w.npc_asset_key,
      'winner', s.winner, 'player_score', s.player_score, 'target', s.target_score,
      'hands_played', s.hands_played,
      'player_is_winner', s.winner = auth.uid()
    ) ORDER BY w.created_at DESC)
    FROM public.hatchling_stakes_wagers w
    LEFT JOIN public.hatchling_stakes_game_sessions s ON s.wager_id = w.id
    WHERE w.creator = auth.uid()
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_history(int) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_history(int) TO authenticated;

-- ============================================================================
-- 3. CARD ART BUCKET (public; art uploaded separately, never served from repo)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('arcade-card-art', 'arcade-card-art', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "card art public read" ON storage.objects;
CREATE POLICY "card art public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'arcade-card-art');

-- ============================================================================
-- 4. GAME SERVICE SUPPORT (in-progress hand state + public session projection)
-- ============================================================================

ALTER TABLE hatchling_stakes_game_sessions
  ADD COLUMN IF NOT EXISTS current_hand jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Public session projection for the wager creator: everything EXCEPT the shoe.
-- The browser never learns undealt cards.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_session_public(p_wager_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  SELECT w.creator INTO v_creator FROM public.hatchling_stakes_wagers w WHERE w.id = p_wager_id;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  RETURN (
    SELECT jsonb_build_object(
      'wager_id', w.id,
      'wager_state', w.state,
      'mode', w.mode,
      'game', w.game,
      'rule_version', w.rule_version,
      'npc_asset_key', w.npc_asset_key,
      'npc_name', (SELECT a.trait_snapshot->>'name'
                  FROM public.hatchling_stakes_animals a WHERE a.asset_key = w.npc_asset_key),
      'tier', (SELECT e.snapshot->>'tier' FROM public.hatchling_stakes_wager_entries e
               WHERE e.wager_id = w.id AND e.actor = auth.uid()),
      'player_asset_key', (SELECT e.asset_key FROM public.hatchling_stakes_wager_entries e
                           WHERE e.wager_id = w.id AND e.actor = auth.uid()),
      'player_asset_name', (SELECT e.snapshot->'snapshot'->>'name'
                            FROM public.hatchling_stakes_wager_entries e
                            WHERE e.wager_id = w.id AND e.actor = auth.uid()),
      'session_state', s.state,
      'player_score', s.player_score,
      'target_score', s.target_score,
      'hands_played', s.hands_played,
      'base_bet', s.base_bet,
      'winner', s.winner,
      'current_hand', s.current_hand,
      'transcript', s.transcript,
      'seed_commitment', s.seed_commitment
    )
    FROM public.hatchling_stakes_wagers w
    JOIN public.hatchling_stakes_game_sessions s ON s.wager_id = w.id
    WHERE w.id = p_wager_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_session_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_session_public(uuid) TO authenticated;

-- Store/replace the in-progress hand (trusted game service only, creator-scoped).
CREATE OR REPLACE FUNCTION public.hatchling_stakes_session_set_hand(p_wager_id uuid, p_hand jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_wstate text;
BEGIN
  SELECT w.creator, w.state INTO v_creator, v_wstate
  FROM public.hatchling_stakes_wagers w WHERE w.id = p_wager_id;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  IF v_wstate <> 'in_progress' THEN
    RAISE EXCEPTION 'wager not in progress';
  END IF;
  UPDATE public.hatchling_stakes_game_sessions
  SET current_hand = COALESCE(p_hand, '{}'::jsonb), updated_at = now()
  WHERE wager_id = p_wager_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_session_set_hand(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_session_set_hand(uuid, jsonb) TO authenticated;
