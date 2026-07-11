-- ─────────────────────────────────────────────────────────────────────────
-- BLOG CMS (July 11, 2026)
--
-- Founder-managed blog: posts live in a table (not code) so the team can
-- publish articles with images and videos from an admin page. The existing
-- hard-coded posts in src/lib/blog-posts.ts stay as-is; the site merges both.
--
--   • public reads only PUBLISHED posts
--   • admins (user_roles.role = 'admin') do everything
--   • media (cover images, inline images, videos) go in the public
--     `blog-media` storage bucket
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  description  text not null default '',
  category     text not null default 'JOURNAL',
  cover        text,                       -- hero image URL
  cover_video  text,                       -- optional hero video URL
  read_time    integer not null default 5,
  keywords     text[] not null default '{}',
  -- Body = ordered array of blocks matching the site's BlogPost shape:
  -- { type: "lede"|"h2"|"p"|"ul"|"ol"|"quote"|"cta", ... }
  sections     jsonb not null default '[]'::jsonb,
  published    boolean not null default false,
  published_at date,
  author_id    uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists blog_posts_published_idx
  on public.blog_posts (published, published_at desc);

alter table public.blog_posts enable row level security;

drop policy if exists "published blog posts are public" on public.blog_posts;
create policy "published blog posts are public"
  on public.blog_posts for select
  using (published = true);

drop policy if exists "admins read all blog posts" on public.blog_posts;
create policy "admins read all blog posts"
  on public.blog_posts for select
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins manage blog posts" on public.blog_posts;
create policy "admins manage blog posts"
  on public.blog_posts for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- keep updated_at fresh
create or replace function public.touch_blog_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch
  before update on public.blog_posts
  for each row execute function public.touch_blog_updated_at();

-- ── Media storage bucket ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('blog-media', 'blog-media', true)
on conflict (id) do nothing;

drop policy if exists "public read blog media" on storage.objects;
create policy "public read blog media"
  on storage.objects for select
  using (bucket_id = 'blog-media');

drop policy if exists "admins write blog media" on storage.objects;
create policy "admins write blog media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-media' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins update blog media" on storage.objects;
create policy "admins update blog media"
  on storage.objects for update to authenticated
  using (bucket_id = 'blog-media' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins delete blog media" on storage.objects;
create policy "admins delete blog media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'blog-media' and public.has_role(auth.uid(), 'admin'));

-- ── Grant the founder the admin role so they can use the CMS immediately ──
insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role
from auth.users u
where u.email = 'lethalduke71@gmail.com'
  and not exists (
    select 1 from public.user_roles r
    where r.user_id = u.id and r.role = 'admin'
  );
