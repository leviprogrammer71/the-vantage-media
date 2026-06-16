-- ─────────────────────────────────────────────────────────────────────────
-- INVITE CODES — private access + per-creator attribution + optional bonus
-- June 6, 2026
--
-- Powers the "comment VANTAGE → DM a code → enter code to sign up" funnel.
--   • invite_codes            — the codes you hand out (per creator/campaign)
--   • invite_code_redemptions — who redeemed what (1 code per user)
--   • code_requests           — capture for people who want a code
--
-- Codes do NOT replace the standard 60-credit signup grant (handle_new_user
-- still fires). A code is the ACCESS GATE + ATTRIBUTION, and can optionally
-- grant BONUS credits on top of the 60. Tables are locked down (RLS on, no
-- public policies) — only the SECURITY DEFINER functions below touch them,
-- so codes stay secret and can't be enumerated by the client.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- Normalise a code: uppercase, strip whitespace.
CREATE OR REPLACE FUNCTION public.norm_code(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(regexp_replace(COALESCE(p, ''), '\s', '', 'g'))
$$;

-- 1. The codes themselves.
CREATE TABLE IF NOT EXISTS public.invite_codes (
  code          TEXT PRIMARY KEY,
  label         TEXT,                          -- campaign / creator name, for your tracking
  bonus_credits INTEGER NOT NULL DEFAULT 0,    -- extra credits on top of the standard 60
  max_uses      INTEGER,                       -- NULL = unlimited
  used_count    INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Redemptions — one code per user (UNIQUE user_id), with attribution.
CREATE TABLE IF NOT EXISTS public.invite_code_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  user_id     UUID NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_code ON public.invite_code_redemptions (code);

-- 3. "Request a code" capture — for people without one.
CREATE TABLE IF NOT EXISTS public.code_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  name       TEXT,
  note       TEXT,
  source     TEXT,
  fulfilled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lock the tables. No policies = no direct client access; the functions below
-- (SECURITY DEFINER) are the only way in.
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_requests ENABLE ROW LEVEL SECURITY;

-- 4. check_invite_code — validate without side effects (anon, used pre-signup).
CREATE OR REPLACE FUNCTION public.check_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c RECORD; v TEXT := public.norm_code(p_code);
BEGIN
  IF v = '' THEN RETURN jsonb_build_object('valid', false, 'reason', 'empty'); END IF;
  SELECT * INTO c FROM public.invite_codes WHERE code = v;
  IF NOT FOUND OR NOT c.active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'exhausted');
  END IF;
  RETURN jsonb_build_object('valid', true, 'label', c.label, 'bonus_credits', c.bonus_credits);
END; $$;
GRANT EXECUTE ON FUNCTION public.check_invite_code(TEXT) TO anon, authenticated;

-- 5. redeem_invite_code — record redemption + grant bonus (idempotent per user).
CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v TEXT := public.norm_code(p_code);
  c RECORD;
  v_already INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF v = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'empty'); END IF;

  -- One code per user — if they've already redeemed one, no-op success.
  SELECT 1 INTO v_already FROM public.invite_code_redemptions WHERE user_id = v_user;
  IF FOUND THEN RETURN jsonb_build_object('ok', true, 'reason', 'already_redeemed'); END IF;

  SELECT * INTO c FROM public.invite_codes WHERE code = v FOR UPDATE;
  IF NOT FOUND OR NOT c.active THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  INSERT INTO public.invite_code_redemptions (code, user_id) VALUES (v, v_user);
  UPDATE public.invite_codes SET used_count = used_count + 1 WHERE code = v;

  IF c.bonus_credits > 0 THEN
    UPDATE public.profiles
      SET credits_balance = credits_balance + c.bonus_credits, updated_at = NOW()
      WHERE user_id = v_user;
    -- Best-effort ledger entry; never let a schema mismatch abort the grant.
    BEGIN
      INSERT INTO public.credit_transactions (user_id, credits_amount, reason)
      VALUES (v_user, c.bonus_credits, 'invite_code:' || v);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'bonus_credits', c.bonus_credits, 'label', c.label);
END; $$;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT) TO authenticated;

-- 6. request_invite_code — capture interest from people without a code (anon).
CREATE OR REPLACE FUNCTION public.request_invite_code(
  p_email TEXT, p_name TEXT, p_note TEXT, p_source TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(p_email, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_required');
  END IF;
  INSERT INTO public.code_requests (email, name, note, source)
  VALUES (lower(p_email), p_name, p_note, p_source);
  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.request_invite_code(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 7. Seed starter codes. Add more any time from the Supabase SQL editor:
--    INSERT INTO public.invite_codes (code, label, bonus_credits, max_uses)
--    VALUES ('HEATHER', 'Creator · Heather Tucker', 40, NULL);
INSERT INTO public.invite_codes (code, label, bonus_credits, max_uses) VALUES
  ('VANTAGE',  'IG comment-gate · general',  0,   NULL),
  ('LAUNCH',   'Launch / waitlist',          40,  500),
  ('INSIDER',  'Hand-picked DM invites',     40,  NULL),
  ('AGENT',    'Listing-agent funnel',       20,  NULL),
  ('CREATOR',  'Reseller / photographer',    60,  NULL)
ON CONFLICT (code) DO NOTHING;
