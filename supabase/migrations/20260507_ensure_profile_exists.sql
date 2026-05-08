-- Defense in depth: even if the handle_new_user trigger fails to fire
-- (RLS quirk, Auth UI bypass, OAuth race), the client can call this
-- self-service RPC after every login to guarantee a profile row with the
-- correct 50-credit grant exists.
--
-- Idempotent: if the row already exists, the function is a no-op and
-- returns the user's current credits. If it didn't, it creates the row
-- with credits_balance=50 and returns 50.
--
-- Restricted to the calling auth user so this can't be used to provision
-- credits for other accounts.

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

  -- Get email from auth.users for the email column on profiles.
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Try to insert. If it conflicts on user_id, do nothing — the existing
  -- row is the source of truth.
  INSERT INTO public.profiles (user_id, email, full_name, credits_balance)
  VALUES (v_user_id, v_email, '', 50)
  ON CONFLICT (user_id) DO NOTHING;

  -- Read back whatever the row currently holds (50 if we just created
  -- it, the existing balance otherwise).
  SELECT credits_balance INTO v_existing
  FROM public.profiles
  WHERE user_id = v_user_id;

  RETURN COALESCE(v_existing, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO authenticated;
