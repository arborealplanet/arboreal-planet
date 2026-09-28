-- Snake Duels: keeper-vs-keeper Texas Hold'em for Hatchling Stakes.
--
-- SECURITY DESIGN (server-authoritative):
--   * The deck is shuffled INSIDE the database (Fisher-Yates over
--     pgcrypto's gen_random_bytes) when a challenge is accepted. No caller
--     ever supplies a deck.
--   * The board is run out and hands are evaluated INSIDE the database
--     (plpgsql port of the Hold'em evaluator; 21 five-card combos per
--     seven-card hand). No caller proposes a winner, a board, or hand names.
--   * Hole cards and the deck are never returned to the browser — only the
--     duelist's own hole cards while the duel is live, and the board plus
--     both holes after the duel is complete.
-- Because all game logic runs in SECURITY DEFINER functions, a malicious
-- client calling the RPCs directly cannot rig the deal or forge a result.
--
-- Flow:
--   create  -> open (48h challenge link, creator's snake + token escrowed)
--   accept  -> in_progress (opponent's snake + token escrowed, deck dealt)
--   decide x2 -> settling -> settle -> complete
-- A fold ends the duel as soon as it is recorded: the other snake wins by
-- forfeit. (The both-fold tie branch in settle is defensive only — decide
-- moves to settling on the first fold, so both decisions can never both be
-- 'fold' through the current API.) Ties on the board return both snakes and
-- mark both tokens refunded.
--
-- Depends on the live Hatchling Stakes tables (created by earlier
-- migrations): hatchling_stakes_config, hatchling_stakes_wagers,
-- hatchling_stakes_wager_entries, hatchling_stakes_wager_locks,
-- hatchling_stakes_animals, hatchling_stakes_tokens,
-- hatchling_stakes_token_exemptions, hatchling_stakes_ownership_events.

-- ---------------------------------------------------------------------------
-- Duel ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.snake_duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL DEFAULT 'open'
    CHECK (state IN ('open', 'in_progress', 'settling', 'complete', 'expired', 'void')),
  tier text NOT NULL CHECK (tier IN ('sprout', 'vine', 'canopy')),
  challenger uuid NOT NULL,
  opponent uuid,
  challenger_snake text NOT NULL,
  opponent_snake text,
  challenger_hole jsonb,
  opponent_hole jsonb,
  deck jsonb,
  challenger_decision text CHECK (challenger_decision IN ('run', 'fold')),
  opponent_decision text CHECK (opponent_decision IN ('run', 'fold')),
  winner uuid,
  win_reason text CHECK (win_reason IN ('fold', 'showdown', 'tie')),
  winning_hand text,
  wager_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '48 hours'
);

CREATE INDEX IF NOT EXISTS snake_duels_challenger_idx ON public.snake_duels (challenger, state);
CREATE INDEX IF NOT EXISTS snake_duels_opponent_idx ON public.snake_duels (opponent, state);
CREATE INDEX IF NOT EXISTS snake_duels_state_idx ON public.snake_duels (state, expires_at);

ALTER TABLE public.snake_duels ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'snake_duels' AND policyname = 'snake_duels_no_direct_access') THEN
    CREATE POLICY snake_duels_no_direct_access ON public.snake_duels
      FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Server-side card engine (mirrors src/lib/poker/duel-eval.ts, tested there)
-- ---------------------------------------------------------------------------

-- Friendly rank names shared by the evaluator.
CREATE OR REPLACE FUNCTION public.snake_duels_rank_name(p_rank int)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$ SELECT CASE p_rank
  WHEN 14 THEN 'Ace' WHEN 13 THEN 'King' WHEN 12 THEN 'Queen' WHEN 11 THEN 'Jack'
  ELSE p_rank::text END $$;

-- Evaluated 5-card hand. score is a lexicographic int[] (higher wins),
-- name is the display string ("Pair of Aces", "Flush, King high", ...).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'snake_duels_eval') THEN
    CREATE TYPE public.snake_duels_eval AS (score int[], name text);
  END IF;
END $$;

-- Compare two eval scores: 1 / 0 / -1.
CREATE OR REPLACE FUNCTION public.snake_duels_cmp_score(a int[], b int[])
RETURNS int
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $func$
DECLARE
  i int;
  n int;
  d int;
BEGIN
  n := greatest(coalesce(array_length(a, 1), 0), coalesce(array_length(b, 1), 0));
  FOR i IN 1..n LOOP
    d := coalesce(a[i], 0) - coalesce(b[i], 0);
    IF d <> 0 THEN
      RETURN CASE WHEN d > 0 THEN 1 ELSE -1 END;
    END IF;
  END LOOP;
  RETURN 0;
END;
$func$;

-- Evaluate one 5-card hand. Cards are "As"-style strings ("10d" for ten).
CREATE OR REPLACE FUNCTION public.snake_duels_eval5(p_cards text[])
RETURNS public.snake_duels_eval
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $func$
DECLARE
  c text;
  rank_txt text;
  v_rank int;
  sr int[] := '{}';      -- ranks sorted desc
  v_suits text[] := '{}';
  i int; j int; tmp int;
  v_flush boolean;
  v_uniq int[] := '{}';  -- distinct ranks desc
  v_straight int := 0;
  v_counts int[] := array_fill(0, ARRAY[15]);
  v_grank int[] := '{}'; -- group ranks: count desc, then rank desc
  v_gcount int[] := '{}';
  v_score int[];
  v_name text;
  v_kickers int[];
BEGIN
  IF coalesce(array_length(p_cards, 1), 0) <> 5 THEN
    RAISE EXCEPTION 'eval5 needs exactly 5 cards';
  END IF;
  FOREACH c IN ARRAY p_cards LOOP
    rank_txt := substring(c from 1 for char_length(c) - 1);
    v_rank := CASE upper(rank_txt)
      WHEN 'A' THEN 14 WHEN 'K' THEN 13 WHEN 'Q' THEN 12 WHEN 'J' THEN 11
      ELSE rank_txt::int END;
    sr := sr || v_rank;
    v_suits := v_suits || lower(right(c, 1));
  END LOOP;
  -- insertion sort, descending
  FOR i IN 2..5 LOOP
    tmp := sr[i]; j := i - 1;
    WHILE j >= 1 AND sr[j] < tmp LOOP sr[j + 1] := sr[j]; j := j - 1; END LOOP;
    sr[j + 1] := tmp;
  END LOOP;
  v_flush := v_suits[1] = v_suits[2] AND v_suits[2] = v_suits[3]
         AND v_suits[3] = v_suits[4] AND v_suits[4] = v_suits[5];
  FOR i IN 1..5 LOOP
    IF i = 1 OR sr[i] <> sr[i - 1] THEN v_uniq := v_uniq || sr[i]; END IF;
  END LOOP;
  IF array_length(v_uniq, 1) = 5 THEN
    IF v_uniq[1] - v_uniq[5] = 4 THEN v_straight := v_uniq[1];
    ELSIF v_uniq[1] = 14 AND v_uniq[2] = 5 THEN v_straight := 5; END IF;
  END IF;
  FOR i IN 1..5 LOOP v_counts[sr[i]] := v_counts[sr[i]] + 1; END LOOP;
  FOR i IN REVERSE 4..1 LOOP
    FOR v_rank IN REVERSE 2..14 LOOP
      IF v_counts[v_rank] = i THEN
        v_grank := v_grank || v_rank;
        v_gcount := v_gcount || i;
      END IF;
    END LOOP;
  END LOOP;

  IF v_straight > 0 AND v_flush THEN
    v_score := ARRAY[8, v_straight];
    v_name := CASE WHEN v_straight = 14 THEN 'Royal Flush'
      ELSE 'Straight Flush, ' || public.snake_duels_rank_name(v_straight) || ' high' END;
  ELSIF v_gcount[1] = 4 THEN
    v_kickers := '{}';
    FOR i IN 1..5 LOOP IF sr[i] <> v_grank[1] THEN v_kickers := v_kickers || sr[i]; END IF; END LOOP;
    v_score := ARRAY[7, v_grank[1], v_kickers[1]];
    v_name := 'Four of a Kind, ' || public.snake_duels_rank_name(v_grank[1]) || 's';
  ELSIF v_gcount[1] = 3 AND v_gcount[2] = 2 THEN
    v_score := ARRAY[6, v_grank[1], v_grank[2]];
    v_name := 'Full House, ' || public.snake_duels_rank_name(v_grank[1]) || 's over '
           || public.snake_duels_rank_name(v_grank[2]) || 's';
  ELSIF v_flush THEN
    v_score := ARRAY[5] || sr;
    v_name := 'Flush, ' || public.snake_duels_rank_name(sr[1]) || ' high';
  ELSIF v_straight > 0 THEN
    v_score := ARRAY[4, v_straight];
    v_name := 'Straight, ' || public.snake_duels_rank_name(v_straight) || ' high';
  ELSIF v_gcount[1] = 3 THEN
    v_kickers := '{}';
    FOR i IN 1..5 LOOP IF sr[i] <> v_grank[1] THEN v_kickers := v_kickers || sr[i]; END IF; END LOOP;
    v_score := ARRAY[3, v_grank[1]] || v_kickers;
    v_name := 'Three of a Kind, ' || public.snake_duels_rank_name(v_grank[1]) || 's';
  ELSIF v_gcount[1] = 2 AND v_gcount[2] = 2 THEN
    v_kickers := '{}';
    FOR i IN 1..5 LOOP
      IF sr[i] <> v_grank[1] AND sr[i] <> v_grank[2] THEN v_kickers := v_kickers || sr[i]; END IF;
    END LOOP;
    v_score := ARRAY[2, v_grank[1], v_grank[2]] || v_kickers;
    v_name := 'Two Pair, ' || public.snake_duels_rank_name(v_grank[1]) || 's and '
           || public.snake_duels_rank_name(v_grank[2]) || 's';
  ELSIF v_gcount[1] = 2 THEN
    v_kickers := '{}';
    FOR i IN 1..5 LOOP IF sr[i] <> v_grank[1] THEN v_kickers := v_kickers || sr[i]; END IF; END LOOP;
    v_score := ARRAY[1, v_grank[1]] || v_kickers;
    v_name := 'Pair of ' || public.snake_duels_rank_name(v_grank[1]) || 's';
  ELSE
    v_score := ARRAY[0] || sr;
    v_name := public.snake_duels_rank_name(sr[1]) || ' high';
  END IF;
  RETURN (v_score, v_name)::public.snake_duels_eval;
END;
$func$;

-- Best 5-card hand out of 7 (all 21 combos).
CREATE OR REPLACE FUNCTION public.snake_duels_eval7(p_cards text[])
RETURNS public.snake_duels_eval
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $func$
DECLARE
  a int; b int; c int; d int; e int;
  ev public.snake_duels_eval;
  best public.snake_duels_eval;
  have_best boolean := false;
BEGIN
  IF coalesce(array_length(p_cards, 1), 0) <> 7 THEN
    RAISE EXCEPTION 'eval7 needs exactly 7 cards';
  END IF;
  FOR a IN 1..3 LOOP FOR b IN a + 1..4 LOOP FOR c IN b + 1..5 LOOP
  FOR d IN c + 1..6 LOOP FOR e IN d + 1..7 LOOP
    ev := public.snake_duels_eval5(ARRAY[p_cards[a], p_cards[b], p_cards[c], p_cards[d], p_cards[e]]);
    IF NOT have_best OR public.snake_duels_cmp_score(ev.score, best.score) > 0 THEN
      best := ev; have_best := true;
    END IF;
  END LOOP; END LOOP; END LOOP; END LOOP; END LOOP;
  RETURN best;
END;
$func$;

-- CSPRNG-shuffled 52-card deck. Called only from inside SECURITY DEFINER
-- functions; never exposed to callers. pgcrypto lives in the "extensions"
-- schema on this project (see 20260927_stakes_search_path_fix.sql).
CREATE OR REPLACE FUNCTION public.snake_duels_shuffled_deck()
RETURNS text[]
LANGUAGE plpgsql
SET search_path = public, extensions
AS $func$
DECLARE
  v_ranks text[] := ARRAY['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  v_suits text[] := ARRAY['s','h','d','c'];
  deck text[] := '{}';
  r text; s text;
  i int; j int; tmp text;
  rb bytea;
BEGIN
  FOREACH r IN ARRAY v_ranks LOOP
    FOREACH s IN ARRAY v_suits LOOP
      deck := deck || (r || s);
    END LOOP;
  END LOOP;
  FOR i IN REVERSE 52..2 LOOP
    rb := gen_random_bytes(2);
    j := 1 + ((get_byte(rb, 0) * 256 + get_byte(rb, 1)) % i);
    tmp := deck[i]; deck[i] := deck[j]; deck[j] := tmp;
  END LOOP;
  RETURN deck;
END;
$func$;
REVOKE ALL ON FUNCTION public.snake_duels_shuffled_deck() FROM public;

-- ---------------------------------------------------------------------------
-- Duel state machine
-- ---------------------------------------------------------------------------
-- Widen the wager game allowlist for duels. The repo's base migration only
-- knew ('blackjack','draw'); no code references any other wager game value.
-- Same DO-block pattern as 20260927_stakes_claimed_source.sql.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hatchling_stakes_wagers_game_check') THEN
    ALTER TABLE public.hatchling_stakes_wagers DROP CONSTRAINT hatchling_stakes_wagers_game_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hatchling_stakes_wagers_game_check') THEN
    ALTER TABLE public.hatchling_stakes_wagers ADD CONSTRAINT hatchling_stakes_wagers_game_check
      CHECK (game IN ('blackjack', 'draw', 'duel'));
  END IF;
END $$;

-- Create a challenge. The challenger's snake + one weekly token are escrowed.
-- The duel tier comes from the snake's registered tier. Returns the duel id
-- (the challenge link).
CREATE OR REPLACE FUNCTION public.snake_duels_create(p_asset_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_wager uuid;
  v_duel_id uuid;
  v_week text := to_char(date_trunc('week', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD');
  v_token_slot int;
  v_exempt boolean;
  v_tier text;
  v_snapshot jsonb;
  v_cfg text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT value INTO v_cfg FROM public.hatchling_stakes_config WHERE key = 'duels_enabled';
  IF v_cfg IS NOT NULL AND v_cfg <> 'true' THEN RAISE EXCEPTION 'keeper duels are paused'; END IF;

  -- Same animal gate as the Den: you stake a snake you produced and own,
  -- from the claim/registry sources, currently idle.
  SELECT tier, trait_snapshot INTO v_tier, v_snapshot
  FROM public.hatchling_stakes_animals
  WHERE asset_key = p_asset_key AND producer = v_uid AND owner = v_uid
    AND source IN ('breeder-registered', 'inventory-claim') AND state = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'snake not available'; END IF;
  IF v_tier NOT IN ('sprout', 'vine', 'canopy') THEN RAISE EXCEPTION 'bad tier'; END IF;
  IF EXISTS (SELECT 1 FROM public.hatchling_stakes_wager_locks
             WHERE asset_key = p_asset_key AND state = 'active') THEN
    RAISE EXCEPTION 'snake is locked in another game';
  END IF;

  -- One weekly token, reserved (not consumed) until the duel settles.
  -- Exempt accounts (founder/testing) skip the token ledger entirely.
  SELECT EXISTS (
    SELECT 1 FROM public.hatchling_stakes_token_exemptions WHERE user_id = v_uid
  ) INTO v_exempt;
  IF NOT v_exempt THEN
    INSERT INTO public.hatchling_stakes_tokens (user_id, week_key, slot)
    VALUES (v_uid, v_week, 1), (v_uid, v_week, 2)
    ON CONFLICT (user_id, week_key, slot) DO NOTHING;
    SELECT slot INTO v_token_slot FROM public.hatchling_stakes_tokens
    WHERE user_id = v_uid AND week_key = v_week AND status = 'available'
    ORDER BY slot LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'no duel token available'; END IF;
  END IF;

  INSERT INTO public.hatchling_stakes_wagers (mode, game, state, creator)
  VALUES ('keeper', 'duel', 'in_progress', v_uid) RETURNING id INTO v_wager;
  INSERT INTO public.hatchling_stakes_wager_entries (wager_id, actor, asset_key, snapshot)
  VALUES (v_wager, v_uid, p_asset_key,
          jsonb_build_object('tier', v_tier, 'snapshot', v_snapshot, 'side', 'challenger'));
  INSERT INTO public.hatchling_stakes_wager_locks (asset_key, wager_id)
  VALUES (p_asset_key, v_wager);
  UPDATE public.hatchling_stakes_animals SET state = 'staked' WHERE asset_key = p_asset_key;
  INSERT INTO public.hatchling_stakes_wager_events (wager_id, seq, type, payload_hash, payload)
  VALUES (v_wager, 1, 'duel_opened', encode(digest(v_wager::text, 'sha256'), 'hex'),
          jsonb_build_object('challenger_asset', p_asset_key, 'tier', v_tier));

  IF NOT v_exempt THEN
    UPDATE public.hatchling_stakes_tokens
    SET status = 'reserved', wager_id = v_wager, updated_at = now()
    WHERE user_id = v_uid AND week_key = v_week AND slot = v_token_slot;
  END IF;

  INSERT INTO public.snake_duels (tier, challenger, challenger_snake, wager_id)
  VALUES (v_tier, v_uid, p_asset_key, v_wager)
  RETURNING id INTO v_duel_id;
  RETURN v_duel_id;
END;
$$;
REVOKE ALL ON FUNCTION public.snake_duels_create(text) FROM public;
GRANT EXECUTE ON FUNCTION public.snake_duels_create(text) TO authenticated;

-- Accept an open challenge. The deck is shuffled server-side and dealt here;
-- the caller supplies only their snake. Returns the public duel state.
CREATE OR REPLACE FUNCTION public.snake_duels_accept(p_duel_id uuid, p_asset_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  d record;
  v_week text := to_char(date_trunc('week', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD');
  v_token_slot int;
  v_exempt boolean;
  v_tier text;
  v_snapshot jsonb;
  v_deck text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found'; END IF;
  PERFORM public.snake_duels_expire(p_duel_id);
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id;
  IF d.state <> 'open' THEN RAISE EXCEPTION 'challenge not open'; END IF;
  IF d.challenger = v_uid THEN RAISE EXCEPTION 'cannot accept your own challenge'; END IF;

  SELECT tier, trait_snapshot INTO v_tier, v_snapshot
  FROM public.hatchling_stakes_animals
  WHERE asset_key = p_asset_key AND producer = v_uid AND owner = v_uid
    AND source IN ('breeder-registered', 'inventory-claim') AND state = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'snake not available'; END IF;
  IF v_tier <> d.tier THEN RAISE EXCEPTION 'tier must match'; END IF;
  IF EXISTS (SELECT 1 FROM public.hatchling_stakes_wager_locks
             WHERE asset_key = p_asset_key AND state = 'active') THEN
    RAISE EXCEPTION 'snake is locked in another game';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.hatchling_stakes_token_exemptions WHERE user_id = v_uid
  ) INTO v_exempt;
  IF NOT v_exempt THEN
    INSERT INTO public.hatchling_stakes_tokens (user_id, week_key, slot)
    VALUES (v_uid, v_week, 1), (v_uid, v_week, 2)
    ON CONFLICT (user_id, week_key, slot) DO NOTHING;
    SELECT slot INTO v_token_slot FROM public.hatchling_stakes_tokens
    WHERE user_id = v_uid AND week_key = v_week AND status = 'available'
    ORDER BY slot LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'no duel token available'; END IF;
  END IF;

  INSERT INTO public.hatchling_stakes_wager_entries (wager_id, actor, asset_key, snapshot)
  VALUES (d.wager_id, v_uid, p_asset_key,
          jsonb_build_object('tier', v_tier, 'snapshot', v_snapshot, 'side', 'opponent'));
  INSERT INTO public.hatchling_stakes_wager_locks (asset_key, wager_id)
  VALUES (p_asset_key, d.wager_id);
  UPDATE public.hatchling_stakes_animals SET state = 'staked' WHERE asset_key = p_asset_key;
  INSERT INTO public.hatchling_stakes_wager_events (wager_id, seq, type, payload_hash, payload)
  VALUES (d.wager_id,
          (SELECT coalesce(max(seq), 0) + 1 FROM public.hatchling_stakes_wager_events WHERE wager_id = d.wager_id),
          'duel_started', encode(digest(d.wager_id::text || p_asset_key, 'sha256'), 'hex'),
          jsonb_build_object('opponent_asset', p_asset_key, 'tier', v_tier));

  IF NOT v_exempt THEN
    UPDATE public.hatchling_stakes_tokens
    SET status = 'reserved', wager_id = d.wager_id, updated_at = now()
    WHERE user_id = v_uid AND week_key = v_week AND slot = v_token_slot;
  END IF;

  -- The house shuffle: no caller input, no caller visibility.
  v_deck := public.snake_duels_shuffled_deck();
  UPDATE public.snake_duels
  SET state = 'in_progress',
      opponent = v_uid,
      opponent_snake = p_asset_key,
      challenger_hole = to_jsonb(v_deck[1:2]),
      opponent_hole = to_jsonb(v_deck[3:4]),
      deck = to_jsonb(v_deck),
      -- a fresh 48h clock from the moment the duel actually starts
      expires_at = now() + interval '48 hours'
  WHERE id = p_duel_id;

  RETURN public.snake_duels_state(p_duel_id);
END;
$$;
REVOKE ALL ON FUNCTION public.snake_duels_accept(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.snake_duels_accept(uuid, text) TO authenticated;

-- Lock in a run/fold decision. A fold ends the duel at once (the other
-- snake wins). When both decisions are in, the duel moves to 'settling' and
-- the API route calls snake_duels_settle to finish it.
CREATE OR REPLACE FUNCTION public.snake_duels_decide(p_duel_id uuid, p_decision text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  d record;
  v_is_challenger boolean;
  v_other_decision text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF p_decision NOT IN ('run', 'fold') THEN RAISE EXCEPTION 'bad decision'; END IF;
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel not found'; END IF;
  PERFORM public.snake_duels_expire(p_duel_id);
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id;

  IF d.state = 'settling' THEN
    -- Settle retry path: the route's settle call may have failed after both
    -- decisions landed. Report ready so the route can finish the job.
    RETURN jsonb_build_object('settle_ready', true, 'state', d.state);
  END IF;
  IF d.state <> 'in_progress' THEN RAISE EXCEPTION 'duel not in progress'; END IF;
  IF v_uid <> d.challenger AND v_uid <> d.opponent THEN RAISE EXCEPTION 'not your duel'; END IF;
  v_is_challenger := (v_uid = d.challenger);

  IF v_is_challenger THEN
    IF d.challenger_decision IS NOT NULL THEN
      RETURN jsonb_build_object('settle_ready', d.opponent_decision IS NOT NULL, 'state', d.state);
    END IF;
    UPDATE public.snake_duels SET challenger_decision = p_decision WHERE id = p_duel_id;
    v_other_decision := d.opponent_decision;
  ELSE
    IF d.opponent_decision IS NOT NULL THEN
      RETURN jsonb_build_object('settle_ready', d.challenger_decision IS NOT NULL, 'state', d.state);
    END IF;
    UPDATE public.snake_duels SET opponent_decision = p_decision WHERE id = p_duel_id;
    v_other_decision := d.challenger_decision;
  END IF;

  -- A fold ends it immediately: the duel is ready to settle with one winner.
  IF p_decision = 'fold' OR v_other_decision = 'fold' THEN
    UPDATE public.snake_duels SET state = 'settling' WHERE id = p_duel_id;
    RETURN jsonb_build_object('settle_ready', true, 'state', 'settling');
  END IF;

  IF v_other_decision IS NOT NULL THEN
    UPDATE public.snake_duels SET state = 'settling' WHERE id = p_duel_id;
    RETURN jsonb_build_object('settle_ready', true, 'state', 'settling');
  END IF;
  RETURN jsonb_build_object('settle_ready', false, 'state', 'in_progress');
END;
$$;
REVOKE ALL ON FUNCTION public.snake_duels_decide(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.snake_duels_decide(uuid, text) TO authenticated;

-- Settle a duel whose decisions are final. Fully server-side: the outcome is
-- computed here from the stored deck and decisions — callers pass nothing
-- but the duel id. Idempotent: replays return the recorded result.
CREATE OR REPLACE FUNCTION public.snake_duels_settle(p_duel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  d record;
  v_uid uuid := auth.uid();
  v_ch_hole text[];
  v_op_hole text[];
  v_board text[];
  v_ch7 text[];
  v_op7 text[];
  v_chev public.snake_duels_eval;
  v_opev public.snake_duels_eval;
  v_cmp int;
  v_winner uuid := NULL;
  v_win_reason text;
  v_hand_name text := NULL;
  v_ch_asset text;
  v_op_asset text;
  v_seq int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel not found'; END IF;

  -- Idempotent replay: a double-submit or retry returns the recorded result.
  IF d.state = 'complete' THEN
    RETURN jsonb_build_object(
      'duel_id', p_duel_id, 'state', 'complete', 'replay', true,
      'winner', d.winner, 'win_reason', d.win_reason, 'winning_hand', d.winning_hand);
  END IF;
  IF d.state <> 'settling' THEN RAISE EXCEPTION 'duel not ready to settle'; END IF;
  IF v_uid <> d.challenger AND v_uid <> d.opponent THEN RAISE EXCEPTION 'not your duel'; END IF;

  -- ---- compute the outcome from stored game state (no caller input) ----
  IF d.challenger_decision = 'fold' AND d.opponent_decision = 'fold' THEN
    -- Defensive only (unreachable via decide): both folded, so nobody pays.
    -- Snakes go home, tokens refunded.
    v_win_reason := 'tie';
    v_hand_name := 'Both players folded — stakes returned';
  ELSIF d.challenger_decision = 'fold' THEN
    v_winner := d.opponent; v_win_reason := 'fold';
  ELSIF d.opponent_decision = 'fold' THEN
    v_winner := d.challenger; v_win_reason := 'fold';
  ELSE
    -- Showdown: run out the board from the stored deck, evaluate in-database.
    SELECT array_agg(x ORDER BY ord) INTO v_board
    FROM jsonb_array_elements_text(d.deck) WITH ORDINALITY AS t(x, ord)
    WHERE ord BETWEEN 5 AND 9;
    SELECT array_agg(x ORDER BY ord) INTO v_ch_hole
    FROM jsonb_array_elements_text(d.challenger_hole) WITH ORDINALITY AS t(x, ord);
    SELECT array_agg(x ORDER BY ord) INTO v_op_hole
    FROM jsonb_array_elements_text(d.opponent_hole) WITH ORDINALITY AS t(x, ord);
    v_ch7 := v_ch_hole || v_board;
    v_op7 := v_op_hole || v_board;
    v_chev := public.snake_duels_eval7(v_ch7);
    v_opev := public.snake_duels_eval7(v_op7);
    v_cmp := public.snake_duels_cmp_score(v_chev.score, v_opev.score);
    IF v_cmp > 0 THEN
      v_winner := d.challenger; v_win_reason := 'showdown'; v_hand_name := v_chev.name;
    ELSIF v_cmp < 0 THEN
      v_winner := d.opponent; v_win_reason := 'showdown'; v_hand_name := v_opev.name;
    ELSE
      v_win_reason := 'tie'; v_hand_name := 'Tied board: ' || v_chev.name;
    END IF;
  END IF;

  -- ---- settle the ledger (same escrow semantics as Den wagers) ----
  v_ch_asset := d.challenger_snake;
  v_op_asset := d.opponent_snake;

  IF v_winner IS NULL THEN
    -- Tie (including both-fold): escrow never moved ownership, so each snake
    -- just goes back to 'active'. Tokens are marked refunded, matching the
    -- Den void ledger.
    UPDATE public.hatchling_stakes_animals SET state = 'active'
    WHERE asset_key IN (v_ch_asset, v_op_asset);
    UPDATE public.hatchling_stakes_tokens SET status = 'refunded', updated_at = now()
    WHERE wager_id = d.wager_id AND status = 'reserved';
    UPDATE public.hatchling_stakes_wagers SET state = 'complete', updated_at = now()
    WHERE id = d.wager_id;
  ELSE
    -- Winner takes both snakes; both tokens are spent.
    UPDATE public.hatchling_stakes_animals SET state = 'active', owner = v_winner
    WHERE asset_key IN (v_ch_asset, v_op_asset);
    SELECT coalesce(max(seq), 0) + 1 INTO v_seq
    FROM public.hatchling_stakes_ownership_events WHERE asset_key = v_ch_asset;
    INSERT INTO public.hatchling_stakes_ownership_events (asset_key, from_user, to_user, reason, seq)
    VALUES (v_ch_asset, d.challenger, v_winner, 'wager_settlement', v_seq);
    SELECT coalesce(max(seq), 0) + 1 INTO v_seq
    FROM public.hatchling_stakes_ownership_events WHERE asset_key = v_op_asset;
    INSERT INTO public.hatchling_stakes_ownership_events (asset_key, from_user, to_user, reason, seq)
    VALUES (v_op_asset, d.opponent, v_winner, 'wager_settlement', v_seq);
    UPDATE public.hatchling_stakes_tokens SET status = 'consumed', updated_at = now()
    WHERE wager_id = d.wager_id AND status = 'reserved';
    UPDATE public.hatchling_stakes_wagers SET state = 'complete', updated_at = now()
    WHERE id = d.wager_id;
  END IF;
  DELETE FROM public.hatchling_stakes_wager_locks WHERE wager_id = d.wager_id;
  INSERT INTO public.hatchling_stakes_wager_events (wager_id, seq, type, payload_hash, payload)
  VALUES (d.wager_id,
          (SELECT coalesce(max(seq), 0) + 1 FROM public.hatchling_stakes_wager_events WHERE wager_id = d.wager_id),
          'duel_settled', encode(digest(d.id::text || coalesce(v_winner::text, 'tie'), 'sha256'), 'hex'),
          jsonb_build_object('winner', v_winner, 'win_reason', v_win_reason, 'winning_hand', v_hand_name));

  UPDATE public.snake_duels
  SET state = 'complete', winner = v_winner, win_reason = v_win_reason, winning_hand = v_hand_name
  WHERE id = p_duel_id;

  RETURN jsonb_build_object(
    'duel_id', p_duel_id, 'state', 'complete', 'replay', false,
    'winner', v_winner, 'win_reason', v_win_reason, 'winning_hand', v_hand_name,
    'board', CASE WHEN v_win_reason = 'showdown' OR v_win_reason = 'tie'
                  THEN coalesce(to_jsonb(v_board), '[]'::jsonb) ELSE '[]'::jsonb END);
END;
$$;
REVOKE ALL ON FUNCTION public.snake_duels_settle(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.snake_duels_settle(uuid) TO authenticated;

-- Challenger backs out of an unaccepted challenge. Snake unlocks, token freed.
CREATE OR REPLACE FUNCTION public.snake_duels_void(p_duel_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
BEGIN
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel not found'; END IF;
  IF d.state <> 'open' THEN RAISE EXCEPTION 'challenge not open'; END IF;
  IF d.challenger <> auth.uid() THEN RAISE EXCEPTION 'not your challenge'; END IF;
  UPDATE public.hatchling_stakes_animals SET state = 'active'
  WHERE asset_key = d.challenger_snake;
  DELETE FROM public.hatchling_stakes_wager_locks WHERE wager_id = d.wager_id;
  UPDATE public.hatchling_stakes_tokens SET status = 'refunded', updated_at = now()
  WHERE wager_id = d.wager_id AND status = 'reserved';
  UPDATE public.hatchling_stakes_wagers SET state = 'void', updated_at = now()
  WHERE id = d.wager_id;
  UPDATE public.snake_duels SET state = 'void' WHERE id = p_duel_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.snake_duels_void(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.snake_duels_void(uuid) TO authenticated;

-- Expire a duel whose clock ran out. Open: challenger's snake unlocks and
-- token is freed. In progress: both snakes go home and both tokens refunded.
CREATE OR REPLACE FUNCTION public.snake_duels_expire(p_duel_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
BEGIN
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF d.state NOT IN ('open', 'in_progress') THEN RETURN false; END IF;
  IF d.expires_at > now() THEN RETURN false; END IF;

  IF d.state = 'open' THEN
    UPDATE public.hatchling_stakes_animals SET state = 'active'
    WHERE asset_key = d.challenger_snake;
  ELSE
    UPDATE public.hatchling_stakes_animals SET state = 'active'
    WHERE asset_key IN (d.challenger_snake, d.opponent_snake);
  END IF;
  DELETE FROM public.hatchling_stakes_wager_locks WHERE wager_id = d.wager_id;
  UPDATE public.hatchling_stakes_tokens SET status = 'refunded', updated_at = now()
  WHERE wager_id = d.wager_id AND status = 'reserved';
  UPDATE public.hatchling_stakes_wagers SET state = 'void', updated_at = now()
  WHERE id = d.wager_id;
  UPDATE public.snake_duels SET state = 'expired' WHERE id = p_duel_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.snake_duels_expire(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.snake_duels_expire(uuid) TO authenticated;

-- Public duel state. Strangers see the tier and challenge terms on an open
-- challenge, and nothing else while it is live. Duelists see their own hole
-- cards while live; after completion, both holes and the board stay
-- participant-only (a duel's cards are never public).
CREATE OR REPLACE FUNCTION public.snake_duels_state(p_duel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  v_uid uuid := auth.uid();
  v_is_challenger boolean;
  v_is_opponent boolean;
  v_ch_name text;
  v_op_name text;
BEGIN
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel not found'; END IF;
  PERFORM public.snake_duels_expire(p_duel_id);
  SELECT * INTO d FROM public.snake_duels WHERE id = p_duel_id;
  v_is_challenger := (v_uid = d.challenger);
  v_is_opponent := (v_uid = d.opponent);
  -- Snake display names from the registry snapshots (asset keys are not names).
  SELECT trait_snapshot->>'name' INTO v_ch_name
  FROM public.hatchling_stakes_animals WHERE asset_key = d.challenger_snake;
  SELECT trait_snapshot->>'name' INTO v_op_name
  FROM public.hatchling_stakes_animals WHERE asset_key = d.opponent_snake;
  RETURN jsonb_build_object(
    'id', d.id,
    'state', d.state,
    'tier', d.tier,
    'challenger', CASE WHEN v_is_challenger OR v_is_opponent THEN d.challenger END,
    'opponent', CASE WHEN v_is_challenger OR v_is_opponent THEN d.opponent END,
    'challenger_snake', CASE
       WHEN v_is_challenger OR v_is_opponent THEN d.challenger_snake
       WHEN d.state = 'open' THEN d.challenger_snake END,
    'opponent_snake', CASE WHEN v_is_challenger OR v_is_opponent THEN d.opponent_snake END,
    'challenger_snake_name', CASE
       WHEN v_is_challenger OR v_is_opponent THEN v_ch_name
       WHEN d.state = 'open' THEN v_ch_name END,
    'opponent_snake_name', CASE WHEN v_is_challenger OR v_is_opponent THEN v_op_name END,
    'challenger_decided', d.challenger_decision IS NOT NULL,
    'opponent_decided', d.opponent_decision IS NOT NULL,
    'created_at', d.created_at,
    'expires_at', d.expires_at,
    'winner', d.winner,
    'win_reason', d.win_reason,
    'winning_hand', d.winning_hand,
    'is_challenger', v_is_challenger,
    'is_opponent', v_is_opponent,
    'can_accept', d.state = 'open' AND NOT v_is_challenger AND v_uid IS NOT NULL,
    'my_hole', CASE
       WHEN d.state IN ('in_progress', 'settling')
            AND ((v_is_challenger AND d.challenger_hole IS NOT NULL)
              OR (v_is_opponent AND d.opponent_hole IS NOT NULL)) THEN
         CASE WHEN v_is_challenger THEN d.challenger_hole ELSE d.opponent_hole END
       WHEN d.state = 'complete' AND (v_is_challenger OR v_is_opponent) THEN
         CASE WHEN v_is_challenger THEN d.challenger_hole ELSE d.opponent_hole END
       END,
    'my_decision', CASE WHEN v_is_challenger THEN d.challenger_decision
                        WHEN v_is_opponent THEN d.opponent_decision END,
    'my_snake', CASE WHEN v_is_challenger THEN d.challenger_snake
                     WHEN v_is_opponent THEN d.opponent_snake END,
    'board', CASE WHEN d.state = 'complete' AND d.deck IS NOT NULL
                   AND (v_is_challenger OR v_is_opponent)
                  THEN (SELECT jsonb_agg(x ORDER BY ord)
                        FROM jsonb_array_elements_text(d.deck) WITH ORDINALITY AS t(x, ord)
                        WHERE ord BETWEEN 5 AND 9)
             END,
    'challenger_hole', CASE WHEN d.state = 'complete' AND (v_is_challenger OR v_is_opponent)
                            THEN d.challenger_hole END,
    'opponent_hole', CASE WHEN d.state = 'complete' AND (v_is_challenger OR v_is_opponent)
                          THEN d.opponent_hole END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.snake_duels_state(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.snake_duels_state(uuid) TO authenticated;
