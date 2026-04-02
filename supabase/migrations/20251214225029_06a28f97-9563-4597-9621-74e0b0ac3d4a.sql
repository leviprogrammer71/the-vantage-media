-- Make the property-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'property-photos';

-- Improve increment_credits function with validation and audit comments
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Only call from trusted server context with service role key
  -- NEVER expose via RPC policies - this function bypasses RLS
  
  -- Validate amount is positive to prevent abuse
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;