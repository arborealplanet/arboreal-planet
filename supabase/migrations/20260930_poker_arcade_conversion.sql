-- Arcade cashier: convert lifesap into arcade tokens.
-- Debits the caller's bankroll directly (no game round is opened) and records the
-- debit in lifesap_ledger with reason 'arcade conversion'. The token credit happens
-- client-side in the arcade wallet; the server only burns the lifesap.
-- Rate is enforced client-side (100 lifesap = 1 token); the server only enforces
-- that the amount is a positive multiple of 100, within a per-call cap, and that
-- at least 500 lifesap stays in the stack so the keeper can keep playing.

CREATE OR REPLACE FUNCTION public.poker_convert_lifesap(p_amount bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount % 100 <> 0 THEN
    RAISE EXCEPTION 'conversion amount must be a positive multiple of 100';
  END IF;
  IF p_amount > 10000 THEN
    RAISE EXCEPTION 'conversion capped at 10000 lifesap per call';
  END IF;

  INSERT INTO public.lifesap_bankrolls (user_id, balance)
  VALUES (auth.uid(), 1000)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance FROM public.lifesap_bankrolls WHERE user_id = auth.uid();
  IF v_balance IS NULL OR v_balance - p_amount < 500 THEN
    RAISE EXCEPTION 'insufficient lifesap (500 must stay in your stack)';
  END IF;

  UPDATE public.lifesap_bankrolls
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = auth.uid();

  INSERT INTO public.lifesap_ledger (user_id, delta, balance_after, game, round_ref, reason)
  VALUES (auth.uid(), -p_amount, v_balance - p_amount, 'cashier', NULL, 'arcade conversion');

  RETURN v_balance - p_amount;
END;
$$;
REVOKE ALL ON FUNCTION public.poker_convert_lifesap(bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.poker_convert_lifesap(bigint) TO authenticated;
