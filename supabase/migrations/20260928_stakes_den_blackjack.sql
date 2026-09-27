-- Hatchling Stakes now plays the Den's single-hand blackjack (server-side)
-- instead of the 5-hand score-attack match. The full table state — including
-- the shoe — lives in bj_state and is never exposed to the browser; the
-- public projection (hole card hidden until the hand is done) is what gets
-- stored in current_hand and returned by hatchling_stakes_session_public.

ALTER TABLE public.hatchling_stakes_game_sessions
  ADD COLUMN IF NOT EXISTS bj_state jsonb;

-- Load the full server-side table for the wager creator. The shoe and the
-- dealer's hole card stay server-side: the API route projects a public view.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_bj_load(p_wager_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  SELECT creator INTO v_creator
  FROM public.hatchling_stakes_wagers WHERE id = p_wager_id;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  RETURN (SELECT bj_state FROM public.hatchling_stakes_game_sessions
          WHERE wager_id = p_wager_id);
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_bj_load(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_bj_load(uuid) TO authenticated;

-- Persist the full server-side table. Only while the wager is in progress.
CREATE OR REPLACE FUNCTION public.hatchling_stakes_bj_save(p_wager_id uuid, p_state jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_state text;
BEGIN
  SELECT creator, state INTO v_creator, v_state
  FROM public.hatchling_stakes_wagers WHERE id = p_wager_id;
  IF NOT FOUND OR v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'wager not found';
  END IF;
  IF v_state <> 'in_progress' THEN
    RAISE EXCEPTION 'wager not in progress';
  END IF;
  UPDATE public.hatchling_stakes_game_sessions
  SET bj_state = p_state, updated_at = now()
  WHERE wager_id = p_wager_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hatchling_stakes_bj_save(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.hatchling_stakes_bj_save(uuid, jsonb) TO authenticated;
