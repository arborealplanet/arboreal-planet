-- Event codes for the Arcade: the owner creates codes (rows in event_codes);
-- players redeem them once per account via the redeem_event_code RPC.
-- reward_kind: 'cash' (Arboreal Keeper cash), 'tokens' (arcade tokens), or
-- 'enclosure' (one enclosure of reward_value type added to the Keeper save).
-- Codes are never readable by players directly — redemption goes through the
-- SECURITY DEFINER function so active codes can't be enumerated.

CREATE TABLE public.event_codes (
  code text PRIMARY KEY,
  reward_kind text NOT NULL CHECK (reward_kind IN ('cash', 'tokens', 'enclosure')),
  reward_amount integer,
  reward_value text,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_claims integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_code_claims (
  code text NOT NULL REFERENCES public.event_codes(code) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);

ALTER TABLE public.event_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_code_claims ENABLE ROW LEVEL SECURITY;

-- Codes are managed by staff only; players never read this table.
CREATE POLICY event_codes_staff_all ON public.event_codes
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner'));

-- Players may see their own claims; staff may see all.
CREATE POLICY event_code_claims_select ON public.event_code_claims
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_codes TO authenticated;
GRANT SELECT ON public.event_code_claims TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_event_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_code public.event_codes%ROWTYPE;
  v_claims integer;
  v_state jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in to redeem a code.');
  END IF;

  SELECT * INTO v_code FROM public.event_codes WHERE code = upper(btrim(p_code));
  IF NOT FOUND OR NOT v_code.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That code is not active.');
  END IF;
  IF v_code.starts_at IS NOT NULL AND now() < v_code.starts_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That code has not started yet.');
  END IF;
  IF v_code.expires_at IS NOT NULL AND now() > v_code.expires_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That code has expired.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.event_code_claims c WHERE c.code = v_code.code AND c.user_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already claimed this code.');
  END IF;
  IF v_code.max_claims IS NOT NULL THEN
    SELECT count(*) INTO v_claims FROM public.event_code_claims c WHERE c.code = v_code.code;
    IF v_claims >= v_code.max_claims THEN
      RETURN jsonb_build_object('ok', false, 'error', 'That code is fully claimed.');
    END IF;
  END IF;

  IF v_code.reward_kind IN ('cash', 'enclosure') THEN
    SELECT state::jsonb INTO v_state FROM public.chondro_game_saves WHERE user_id = uid;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Start Arboreal Keeper first, then redeem this code.');
    END IF;
    IF v_code.reward_kind = 'cash' THEN
      v_state := jsonb_set(
        v_state,
        '{cash}',
        to_jsonb(coalesce((v_state ->> 'cash')::numeric, 0) + coalesce(v_code.reward_amount, 0)),
        true
      );
    ELSE
      v_state := jsonb_set(
        v_state,
        ARRAY['enclosures', v_code.reward_value],
        to_jsonb(coalesce((v_state -> 'enclosures' ->> v_code.reward_value)::integer, 0) + 1),
        true
      );
    END IF;
    UPDATE public.chondro_game_saves SET state = v_state, updated_at = now() WHERE user_id = uid;
  END IF;

  INSERT INTO public.event_code_claims (code, user_id) VALUES (v_code.code, uid);

  RETURN jsonb_build_object(
    'ok', true,
    'kind', v_code.reward_kind,
    'amount', v_code.reward_amount,
    'value', v_code.reward_value,
    'label', v_code.label
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.redeem_event_code(text) TO authenticated;

-- Inactive example so the table shape is obvious in the dashboard.
INSERT INTO public.event_codes (code, reward_kind, reward_amount, label, active)
VALUES ('EVENT-EXAMPLE', 'cash', 500, 'Example reward: 500 Keeper cash', false)
ON CONFLICT (code) DO NOTHING;
