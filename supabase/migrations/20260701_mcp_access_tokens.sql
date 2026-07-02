-- ─────────────────────────────────────────────────────────────────────────
-- MCP ACCESS TOKENS (July 1, 2026)
--
-- Per-account connector tokens so an agent can connect The Vantage to Claude
-- (or any MCP client) and generate reels without logging into the dashboard.
--
-- Security model:
--   • The full token (vtg_live_<48 hex>) is shown to the user EXACTLY ONCE,
--     at creation. We store only its SHA-256 hash — a leaked DB row cannot be
--     turned back into a working token.
--   • create/list/revoke run as the signed-in user (auth.uid()).
--   • resolve_mcp_token is SERVICE-ROLE ONLY: the hosted MCP server calls it
--     with the service key to turn a presented token into a user_id. It is
--     never granted to anon/authenticated, so it can't be brute-forced from
--     the browser.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mcp_access_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- First chars of the token for display, e.g. "vtg_live_ab12cd34".
  token_prefix  text not null,
  -- SHA-256 hex of the full token. Unique so lookups are O(1) and exact.
  token_hash    text not null unique,
  -- Human label the user can set ("Claude — work laptop").
  label         text not null default 'Claude connector',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked       boolean not null default false
);

create index if not exists mcp_access_tokens_user_idx
  on public.mcp_access_tokens (user_id) where revoked = false;

alter table public.mcp_access_tokens enable row level security;

-- Owners may read their own token metadata (never the hash secret in practice,
-- but the hash is useless without the original token anyway).
drop policy if exists "own tokens are readable" on public.mcp_access_tokens;
create policy "own tokens are readable"
  on public.mcp_access_tokens for select
  using (auth.uid() = user_id);

-- All writes go through the SECURITY DEFINER RPCs below, so no direct
-- insert/update/delete policies are granted to clients.

-- ── create_mcp_token(label) ───────────────────────────────────────────────
-- Mints a new token for the current user and returns the FULL token once.
create or replace function public.create_mcp_token(p_label text default 'Claude connector')
returns table (id uuid, token text, token_prefix text, label text, created_at timestamptz)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_uid uuid := auth.uid();
  v_secret text;
  v_full text;
  v_prefix text;
  v_hash text;
  v_id uuid;
  v_label text := coalesce(nullif(trim(p_label), ''), 'Claude connector');
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- 48 hex chars of entropy.
  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  v_full   := 'vtg_live_' || v_secret;
  v_prefix := left(v_full, 17);  -- "vtg_live_" + 8 chars
  v_hash   := encode(extensions.digest(v_full, 'sha256'), 'hex');

  insert into public.mcp_access_tokens (user_id, token_prefix, token_hash, label)
  values (v_uid, v_prefix, v_hash, v_label)
  returning public.mcp_access_tokens.id into v_id;

  return query
    select v_id, v_full, v_prefix, v_label, now();
end;
$$;

-- ── list_mcp_tokens() ──────────────────────────────────────────────────────
create or replace function public.list_mcp_tokens()
returns table (
  id uuid, token_prefix text, label text,
  created_at timestamptz, last_used_at timestamptz, revoked boolean
)
language sql
security definer
set search_path to 'public'
as $$
  select id, token_prefix, label, created_at, last_used_at, revoked
  from public.mcp_access_tokens
  where user_id = auth.uid()
  order by created_at desc;
$$;

-- ── revoke_mcp_token(id) ───────────────────────────────────────────────────
create or replace function public.revoke_mcp_token(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  update public.mcp_access_tokens
    set revoked = true
    where id = p_id and user_id = v_uid;
  return found;
end;
$$;

-- ── resolve_mcp_token(token) — SERVICE ROLE ONLY ───────────────────────────
-- Turns a presented token into a user_id, bumps last_used_at. Returns NULL if
-- the token is unknown or revoked.
create or replace function public.resolve_mcp_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_hash text;
  v_user uuid;
begin
  if p_token is null or p_token = '' then
    return null;
  end if;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  update public.mcp_access_tokens
    set last_used_at = now()
    where token_hash = v_hash and revoked = false
    returning user_id into v_user;

  return v_user;  -- NULL when no live token matched
end;
$$;

-- ── Grants ────────────────────────────────────────────────────────────────
grant execute on function public.create_mcp_token(text)  to authenticated;
grant execute on function public.list_mcp_tokens()        to authenticated;
grant execute on function public.revoke_mcp_token(uuid)   to authenticated;

-- resolve is NOT granted to anon/authenticated — service role only.
revoke all on function public.resolve_mcp_token(text) from public, anon, authenticated;
grant execute on function public.resolve_mcp_token(text) to service_role;
