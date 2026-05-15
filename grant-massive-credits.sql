-- ─────────────────────────────────────────────────────────────────
-- MASSIVE TESTING CREDIT GRANT
-- Grants 100,000 credits to leviprogrammer71@gmail.com.
-- Pushes expiry 5 years forward (well past any ad campaign window).
-- Logs the grant in credit_transactions for audit.
-- ─────────────────────────────────────────────────────────────────
WITH target AS (
  SELECT id AS uid FROM auth.users WHERE email = 'leviprogrammer71@gmail.com'
), ledger AS (
  INSERT INTO public.credit_transactions
    (user_id, transaction_type, credits_amount, description)
  SELECT uid, 'grant', 100000, 'Ad-campaign testing pool — 100k credits May 15 2026'
  FROM target
  RETURNING user_id
)
UPDATE public.profiles
SET credits_balance = COALESCE(credits_balance, 0) + 100000,
    credits_expire_at = NOW() + INTERVAL '5 years'
WHERE user_id = (SELECT uid FROM target)
RETURNING user_id, credits_balance AS new_balance, credits_expire_at;
