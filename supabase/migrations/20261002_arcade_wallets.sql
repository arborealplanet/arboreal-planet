-- Arcade token wallets follow the account, not the device.
-- One row per keeper. The app seeds the row from the device balance on first
-- sign-in (greatest-wins, so a fresh device never wipes earned tokens) and
-- then applies every earn/spend as an atomic delta.

CREATE TABLE public.arcade_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arcade_wallets ENABLE ROW LEVEL SECURITY;

-- Keepers read and grow only their own wallet; the RPCs below do the writes.
CREATE POLICY arcade_wallets_own_select ON public.arcade_wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY arcade_wallets_own_insert ON public.arcade_wallets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY arcade_wallets_own_update ON public.arcade_wallets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.arcade_wallets TO authenticated;

-- RLS does not cover TRUNCATE; keep bulk wipes owner-only.
REVOKE TRUNCATE ON public.arcade_wallets FROM anon, authenticated;

-- First-sync seed: adopt the larger of the server balance and the device
-- balance, so signing in on a new device never wipes earned tokens.
CREATE OR REPLACE FUNCTION public.arcade_wallet_seed(p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_balance integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.';
  END IF;
  INSERT INTO public.arcade_wallets (user_id, balance)
  VALUES (uid, greatest(0, coalesce(p_amount, 0)))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = greatest(
          public.arcade_wallets.balance,
          greatest(0, coalesce(p_amount, 0))
        ),
        updated_at = now()
  RETURNING balance INTO v_balance;
  RETURN v_balance;
END
$$;

-- Every earn/spend lands here: atomic, clamped at zero so a balance can
-- never go negative no matter how many devices spend at once.
CREATE OR REPLACE FUNCTION public.arcade_wallet_delta(p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_balance integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.';
  END IF;
  INSERT INTO public.arcade_wallets (user_id, balance)
  VALUES (uid, greatest(0, coalesce(p_delta, 0)))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = greatest(0, public.arcade_wallets.balance + coalesce(p_delta, 0)),
        updated_at = now()
  RETURNING balance INTO v_balance;
  RETURN v_balance;
END
$$;

GRANT EXECUTE ON FUNCTION public.arcade_wallet_seed(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arcade_wallet_delta(integer) TO authenticated;
