-- ─────────────────────────────────────────────────────────────────────────
-- SIGNUP MODE TOGGLE — open vs invite-only A/B (June 6, 2026)
--
-- Lets you flip the whole site between OPEN signup and INVITE-ONLY instantly
-- from the SQL editor, no redeploy:
--   UPDATE public.app_settings SET value='open'   WHERE key='signup_mode';
--   UPDATE public.app_settings SET value='invite' WHERE key='signup_mode';
--
-- Every signup is still attributed through invite_code_redemptions:
--   • invite mode → the real code the user entered
--   • open mode   → auto-tagged with the 'OPEN' code
-- so you can compare volume + downstream activation per variant.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Default: keep current behaviour (invite-only).
INSERT INTO public.app_settings (key, value)
VALUES ('signup_mode', 'invite')
ON CONFLICT (key) DO NOTHING;

-- Anon-readable single-key getter (no table exposure).
CREATE OR REPLACE FUNCTION public.get_app_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT value FROM public.app_settings WHERE key = p_key;
$$;
GRANT EXECUTE ON FUNCTION public.get_app_setting(TEXT) TO anon, authenticated;

-- Attribution code for the OPEN variant (so open signups show up in
-- invite_code_redemptions alongside invite signups for clean comparison).
INSERT INTO public.invite_codes (code, label, bonus_credits, max_uses)
VALUES ('OPEN', 'Open signup (experiment)', 0, NULL)
ON CONFLICT (code) DO NOTHING;
