-- Stripe webhook idempotency: dedup columns on credit_transactions.
--
-- The webhook receives `checkout.session.completed` and `invoice.paid` events
-- and credits the user's profile. Stripe will retry an event up to 3 days if
-- our endpoint returns 5xx, so we need a unique key to dedup on.
--
-- This migration is idempotent (safe to run multiple times).

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_event_id text;

-- Unique indexes (partial — only enforce uniqueness when the column is set,
-- so existing rows without these fields don't conflict).
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_stripe_session_id_unique
  ON public.credit_transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_stripe_invoice_id_unique
  ON public.credit_transactions (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- Lookup index on event_id (not unique — same event can produce two transaction
-- rows in edge cases, but we want the lookup to be fast for debugging).
CREATE INDEX IF NOT EXISTS credit_transactions_stripe_event_id_idx
  ON public.credit_transactions (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;
