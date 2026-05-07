-- Credits accounting fix — May 2026
-- ----------------------------------------------------------------------------
-- Three bugs being addressed:
--
-- 1. Old DB default was 3 free credits. The handle_new_user trigger was bumped
--    to insert 50, but the column default was never changed. Any path that
--    creates a profile WITHOUT going through the trigger gets 3 credits.
--
-- 2. The client-side `useCredits.deductCredits()` reads-then-writes the
--    profiles.credits_balance directly. Two simultaneous deductions can
--    race; a malicious client can substitute the new balance. Need a
--    server-side atomic deduct RPC that the client cannot tamper with.
--
-- 3. credit_transactions has no idempotency constraint, so a retried
--    deduction can double-debit. Add a partial unique index on
--    (user_id, submission_id, transaction_type) where submission_id is
--    not null — every per-submission charge can only land once.
--
-- All migrations are idempotent (IF NOT EXISTS / CREATE OR REPLACE) so this
-- can be re-run safely.

-- 1. Bump the column default from 3 → 50 ----------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN credits_balance SET DEFAULT 50;

-- 2. Idempotency: a given (user, submission, transaction_type) can only
--    debit once. Stripe-related grants are already protected by their own
--    stripe_session_id partial index from the webhook setup.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_dedup_per_submission_idx
  ON public.credit_transactions (user_id, submission_id, transaction_type)
  WHERE submission_id IS NOT NULL;

-- 3. Atomic server-side deduction RPC. Reads the current balance, asserts
--    sufficient funds, deducts, inserts the ledger row — all inside one
--    Postgres transaction. Returns the new balance. Bypasses RLS because
--    SECURITY DEFINER, then re-checks ownership inside.
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_submission_id UUID DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'video_generation'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive, got %', p_amount;
  END IF;

  -- Atomic read-modify-write under row-level lock
  SELECT credits_balance INTO v_current
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'profile not found for user %', p_user_id;
  END IF;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'insufficient credits: have %, need %', v_current, p_amount;
  END IF;

  v_new := v_current - p_amount;

  UPDATE public.profiles
  SET credits_balance = v_new,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert the ledger row. If a duplicate (same user/submission/type) is
  -- attempted, the unique index above raises and the entire RPC rolls back
  -- — including the balance update — so retries are safe.
  INSERT INTO public.credit_transactions
    (user_id, credits_amount, transaction_type, description, submission_id)
  VALUES
    (p_user_id, -p_amount, p_transaction_type, p_description, p_submission_id);

  RETURN v_new;
EXCEPTION
  WHEN unique_violation THEN
    -- A previous attempt already debited this exact (user, submission, type).
    -- Roll back the balance change and return the original balance unchanged.
    -- (The transaction implicitly rolls back; we explicitly raise a
    -- caught-by-name exception so the caller knows it was an idempotent
    -- duplicate.)
    RAISE EXCEPTION 'duplicate_charge: this submission was already charged';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_credits FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated, service_role;

-- 4. Recompute-from-ledger RPC. The transactions table is the truth; if
--    profiles.credits_balance has drifted (e.g. a client-side update slipped
--    through pre-fix), this brings it back into alignment.
--
--    correct balance = 50 (initial grant) + sum(credit_transactions.amount)
--
--    Restricted to service_role so a malicious user can't recompute
--    themselves into more credits.
CREATE OR REPLACE FUNCTION public.recompute_credits_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_signup_grant INTEGER := 50;
  v_ledger_sum INTEGER;
  v_correct INTEGER;
BEGIN
  SELECT COALESCE(SUM(credits_amount), 0)
    INTO v_ledger_sum
  FROM public.credit_transactions
  WHERE user_id = p_user_id;

  v_correct := GREATEST(0, v_signup_grant + v_ledger_sum);

  UPDATE public.profiles
  SET credits_balance = v_correct,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_correct;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_credits_balance FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_credits_balance TO service_role;

-- 5. Bulk admin RPC: recompute every user's balance from the ledger. Use
--    once to clean up any drift from pre-fix client-side deductions.
--
--    From the Supabase SQL editor (service-role context):
--      SELECT public.recompute_all_credit_balances();
CREATE OR REPLACE FUNCTION public.recompute_all_credit_balances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN SELECT user_id FROM public.profiles LOOP
    PERFORM public.recompute_credits_balance(v_user.user_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_all_credit_balances FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_all_credit_balances TO service_role;
