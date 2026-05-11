-- Credit expiry — May 2026
-- ----------------------------------------------------------------------------
-- Adds a 12-month rolling expiration to every credit balance.
--
-- Policy:
--   - New signup: credits_expire_at = NOW() + 12 months
--   - Stripe purchase: webhook extends credits_expire_at to NOW() + 12 months
--     (i.e. every paid purchase resets the clock — industry standard, same
--     pattern as airline miles).
--   - Expired credits: a nightly cleanup zeroes balances where
--     credits_expire_at < NOW(). For now we just expose the date in the UI
--     so customers can see and act; the cron can be enabled later.
--
-- Idempotent — safe to re-run.

-- 1. Add the column (NULL = "never expires" for grandfathered accounts).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_expire_at TIMESTAMPTZ;

-- 2. Backfill: every existing profile gets a 12-month window starting now.
UPDATE public.profiles
SET credits_expire_at = NOW() + INTERVAL '12 months'
WHERE credits_expire_at IS NULL;

-- 3. handle_new_user trigger — set expiry on signup grant.
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
    50,
    NOW() + INTERVAL '12 months'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

-- 4. ensure_profile_exists RPC — sets expiry when bootstrapping a profile.
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
  VALUES (v_user_id, v_email, '', 50, NOW() + INTERVAL '12 months')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT credits_balance INTO v_existing
  FROM public.profiles
  WHERE user_id = v_user_id;

  RETURN COALESCE(v_existing, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO authenticated;

-- 5. Server-side helper used by stripe-webhook to extend expiry on purchase.
CREATE OR REPLACE FUNCTION public.extend_credits_expiry(
  p_user_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_expiry TIMESTAMPTZ;
BEGIN
  v_new_expiry := NOW() + (p_months || ' months')::INTERVAL;
  UPDATE public.profiles
  SET credits_expire_at = v_new_expiry,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  RETURN v_new_expiry;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.extend_credits_expiry FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extend_credits_expiry TO service_role;

-- 6. Optional admin job — zero balances whose expiry has passed. Call from a
--    cron (pg_cron extension) once it's enabled. Until then this is just an
--    available tool; the UI is the source of warning for users.
CREATE OR REPLACE FUNCTION public.expire_stale_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE public.profiles
  SET credits_balance = 0,
      updated_at = NOW()
  WHERE credits_expire_at IS NOT NULL
    AND credits_expire_at < NOW()
    AND credits_balance > 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_stale_credits FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_credits TO service_role;
