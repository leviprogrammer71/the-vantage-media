-- Brand Kits — one per user. Powers the /create flow's branded end card.
-- Run in the Supabase SQL editor.

create table if not exists public.brand_kits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  brokerage text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  logo_url text,
  headshot_url text,
  color_primary text not null default '#8C3F2E',
  color_secondary text not null default '#1A1714',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brand_kits enable row level security;

drop policy if exists "own brand kit read" on public.brand_kits;
create policy "own brand kit read" on public.brand_kits
  for select using (auth.uid() = user_id);

drop policy if exists "own brand kit write" on public.brand_kits;
create policy "own brand kit write" on public.brand_kits
  for insert with check (auth.uid() = user_id);

drop policy if exists "own brand kit update" on public.brand_kits;
create policy "own brand kit update" on public.brand_kits
  for update using (auth.uid() = user_id);

create or replace function public.touch_brand_kit_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists brand_kits_touch on public.brand_kits;
create trigger brand_kits_touch before update on public.brand_kits
  for each row execute function public.touch_brand_kit_updated_at();

-- Public bucket for logos / headshots (small images).
insert into storage.buckets (id, name, public)
  values ('brand-assets', 'brand-assets', true)
  on conflict (id) do nothing;

drop policy if exists "brand assets public read" on storage.objects;
create policy "brand assets public read" on storage.objects
  for select using (bucket_id = 'brand-assets');

drop policy if exists "brand assets own write" on storage.objects;
create policy "brand assets own write" on storage.objects
  for insert with check (
    bucket_id = 'brand-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "brand assets own update" on storage.objects;
create policy "brand assets own update" on storage.objects
  for update using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
