-- Bust-out bailout: a signed-in keeper whose stack falls under 100 lifesap can
-- claim a top-up back to 500 once per calendar day (server UTC). This keeps a
-- busted player in the game without creating a farmable token faucet: the
-- conversion floor (500 must stay in the stack) means bailout lifesap can only
-- become tokens after genuine winnings at the tables.

CREATE OR REPLACE FUNCTION public.poker_claim_bailout()
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

  IF v_balance IS NULL OR v_balance >= 100 THEN
    RAISE EXCEPTION 'bailout only when busted (under 100 lifesap)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lifesap_ledger
    WHERE user_id = auth.uid()
      AND reason = 'daily bailout'
      AND created_at >= date_trunc('day', now())
  ) THEN
    RAISE EXCEPTION 'bailout already claimed today';
  END IF;

  UPDATE public.lifesap_bankrolls
  SET balance = 500, updated_at = now()
  WHERE user_id = auth.uid();

  INSERT INTO public.lifesap_ledger (user_id, delta, balance_after, game, round_ref, reason)
  VALUES (auth.uid(), 500 - v_balance, 500, 'cashier', NULL, 'daily bailout');

  RETURN 500;
END;
$$;
REVOKE ALL ON FUNCTION public.poker_claim_bailout() FROM public;
GRANT EXECUTE ON FUNCTION public.poker_claim_bailout() TO authenticated;
