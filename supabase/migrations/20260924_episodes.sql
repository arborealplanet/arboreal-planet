-- Arboreal Planet TV: community episodes.
-- Public can read PUBLISHED episodes; publishing is done by staff through /api/admin/episodes.
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  episode_number integer,
  submitted_by text,
  submitted_by_profile_id uuid,
  featured boolean not null default false,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists episodes_status_published_idx on public.episodes (status, published_at desc);
create index if not exists episodes_slug_idx on public.episodes (slug);

alter table public.episodes enable row level security;

drop policy if exists "Published episodes are public" on public.episodes;
create policy "Published episodes are public"
  on public.episodes for select
  using (status = 'PUBLISHED');

-- Staff writes. Only created when the live profiles table exposes a role column;
-- the admin API surfaces the Supabase error if writes are denied, so this stays diagnosable.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    drop policy if exists "Staff can manage episodes" on public.episodes;
    create policy "Staff can manage episodes"
      on public.episodes for all
      using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'owner')))
      with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'owner')));
  else
    raise notice 'episodes: public.profiles(role) not found; skipping staff write policy. Verify the live admin path before publishing.';
  end if;
end $$;
