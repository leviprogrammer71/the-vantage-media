-- Signup grant 50 → 60 — May 2026
-- ----------------------------------------------------------------------------
-- Bumps the new-account credit grant from 50 to 60.
--
-- Scope:
--   - New signups (via handle_new_user trigger): 60 credits + 12-month expiry
--   - ensure_profile_exists RPC (login safety net): 60 credits + expiry
--   - Column default: 60 (so any path bypassing the trigger still gets 60)
--   - Existing untouched accounts (still at 50, no spend yet): +10 top-up
--     so early customers aren't worse off than new ones.
--
-- Idempotent — safe to re-run.

-- 1. Bump the column default.
ALTER TABLE public.profiles
  ALTER COLUMN credits_balance SET DEFAULT 60;

-- 2. handle_new_user — new signups land with 60 credits.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, credits_balance, credits_expire_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    60,
    NOW() + INTERVAL '12 months'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

-- 3. ensure_profile_exists — login safety net also grants 60.
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_existing INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.profiles (user_id, email, full_name, credits_balance, credits_expire_at)
  VALUES (v_user_id, v_email, '', 60, NOW() + INTERVAL '12 months')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT credits_balance INTO v_existing
  FROM public.profiles
  WHERE user_id = v_user_id;

  RETURN COALESCE(v_existing, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO authenticated;

-- 4. Top-up existing untouched accounts. Anyone still on 50 credits with no
--    spend (i.e. no negative ledger entries) gets bumped to 60 so they're not
--    worse off than tomorrow's signups. Customers who already used credits
--    keep their current balance — we only round up the un-activated ones.
UPDATE public.profiles p
SET credits_balance = 60,
    updated_at = NOW()
WHERE credits_balance = 50
  AND NOT EXISTS (
    SELECT 1 FROM public.credit_transactions ct
    WHERE ct.user_id = p.user_id
      AND ct.credits_amount < 0
  );

-- 5. Also mirror to user_credits if that legacy table is in use.
UPDATE public.user_credits uc
SET credits = 60,
    updated_at = NOW()
WHERE credits = 50
  AND NOT EXISTS (
    SELECT 1 FROM public.credit_transactions ct
    WHERE ct.user_id = uc.user_id
      AND ct.credits_amount < 0
  );
