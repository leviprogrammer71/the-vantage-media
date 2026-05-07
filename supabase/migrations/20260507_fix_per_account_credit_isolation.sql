-- Per-account credit isolation fix — May 2026
-- ----------------------------------------------------------------------------
-- Bug report: every new and old account shows the same credit balance as the
-- admin account. Root causes audited:
--
--   A. handle_new_user trigger may have been disabled or failed to fire for
--      some signups, leaving those accounts without a profile row. Without
--      a profile row, the client query returns null and the UI silently
--      falls back to showing whatever cached value is around.
--
--   B. credits_balance column default was bumped to 50 in the prior
--      migration but ALTER COLUMN SET DEFAULT only affects new rows, not
--      existing ones. Profiles created during the old default-3 era still
--      have 3 credits unless they were manually corrected.
--
--   C. There are two competing credit sources — profiles.credits_balance
--      (read by useCredits, written by deduct_credits RPC and Stripe
--      webhook) and user_credits.credits (read by Pricing.tsx and
--      WelcomeModal). They drift independently.
--
-- This migration:
--   1. Re-asserts handle_new_user with idempotent UPSERT semantics so it
--      always lands a row even if it fires twice.
--   2. Backfills profile rows for any auth.users that lack one.
--   3. Drops the user_credits second-source-of-truth approach by mirroring
--      profiles.credits_balance into user_credits.credits whenever the
--      profile changes — making profiles the single canonical source.
--   4. Provides a diagnostic RPC list_account_credits() the user can call
--      to inspect every user's balance.
--   5. Provides a one-shot reset_all_to_signup_grant_plus_purchases() RPC
--      that recomputes every account from the ledger: 50 + sum(paid
--      purchases recorded in credit_transactions) - sum(deductions).
--
-- All idempotent — safe to re-run.

-- 1. Bulletproof signup trigger ------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- UPSERT not INSERT: if a row already exists for this user_id (e.g. a
  -- prior partial signup), update the email and full_name but DO NOT touch
  -- credits_balance — they may already have purchased credits.
  INSERT INTO public.profiles (user_id, email, full_name, credits_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    50
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

-- Re-attach the trigger in case it was dropped
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill: any auth.users without a profiles row gets one with 50 credits
INSERT INTO public.profiles (user_id, email, full_name, credits_balance)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'full_name', ''), 50
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Mirror profiles → user_credits so the legacy reads in Pricing.tsx /
--    WelcomeModal stop showing stale numbers. user_credits is now a
--    READ-ONLY mirror of profiles.credits_balance.
CREATE OR REPLACE FUNCTION public.sync_user_credits_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.user_id, NEW.credits_balance)
  ON CONFLICT (user_id) DO UPDATE SET credits = EXCLUDED.credits;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_to_user_credits_sync ON public.profiles;
CREATE TRIGGER profiles_to_user_credits_sync
  AFTER INSERT OR UPDATE OF credits_balance ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_credits_from_profile();

-- One-time backfill of user_credits from profiles
INSERT INTO public.user_credits (user_id, credits)
SELECT user_id, credits_balance FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET credits = EXCLUDED.credits;

-- 4. Diagnostic — list every user's actual credit balance + paid purchases.
--    Usage from the SQL editor (service role):
--      SELECT * FROM public.list_account_credits() ORDER BY purchased DESC;
CREATE OR REPLACE FUNCTION public.list_account_credits()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  credits_balance INTEGER,
  purchased INTEGER,
  used INTEGER,
  expected INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.email,
    p.credits_balance,
    COALESCE(SUM(CASE WHEN ct.credits_amount > 0 THEN ct.credits_amount END), 0)::INTEGER AS purchased,
    COALESCE(-SUM(CASE WHEN ct.credits_amount < 0 THEN ct.credits_amount END), 0)::INTEGER AS used,
    (50
      + COALESCE(SUM(CASE WHEN ct.credits_amount > 0 THEN ct.credits_amount END), 0)::INTEGER
      - COALESCE(-SUM(CASE WHEN ct.credits_amount < 0 THEN ct.credits_amount END), 0)::INTEGER
    ) AS expected
  FROM public.profiles p
  LEFT JOIN public.credit_transactions ct ON ct.user_id = p.user_id
  GROUP BY p.user_id, p.email, p.credits_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_account_credits FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_account_credits TO service_role;

-- 5. One-shot bulk reset — recompute every account to the canonical formula:
--      50 (signup grant) + sum(positive ledger entries) - sum(negative ledger entries)
--    This corrects any accounts that drifted (whether they have admin's
--    number or anything else wrong). Run once after this migration applies.
CREATE OR REPLACE FUNCTION public.reset_all_to_signup_grant_plus_purchases()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE public.profiles p
  SET credits_balance = GREATEST(
    0,
    50 + COALESCE(
      (SELECT SUM(credits_amount) FROM public.credit_transactions
       WHERE user_id = p.user_id),
      0
    )
  ),
  updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_all_to_signup_grant_plus_purchases FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_to_signup_grant_plus_purchases TO service_role;
