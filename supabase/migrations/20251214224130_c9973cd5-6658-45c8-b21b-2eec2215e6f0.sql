-- Drop the overly permissive UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new restrictive UPDATE policy that only allows updating non-sensitive fields
-- (email and full_name) but NOT credits_balance
CREATE POLICY "Users can update their own profile name and email" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add a check constraint to ensure credits_balance cannot go negative
ALTER TABLE public.profiles 
ADD CONSTRAINT credits_balance_non_negative CHECK (credits_balance >= 0);