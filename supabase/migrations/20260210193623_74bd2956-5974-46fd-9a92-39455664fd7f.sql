-- Revoke public execution of increment_credits to prevent client-side RPC calls
REVOKE EXECUTE ON FUNCTION public.increment_credits FROM PUBLIC, anon, authenticated;

-- Only grant to service_role (used by edge functions)
GRANT EXECUTE ON FUNCTION public.increment_credits TO service_role;