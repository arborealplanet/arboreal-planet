-- Unlimited snake housing spaces for listed accounts (founder/testing).
--
-- Mirrors the canopy_hunter_exemptions pattern: a server-side allowlist
-- consulted by the Keeper housing rules (status route, game client, shop,
-- home status, and the save API's server-side capacity check). Everyone
-- else keeps the enclosure-based housing model.

create table if not exists public.keeper_unlimited_spaces (
  user_id uuid primary key,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.keeper_unlimited_spaces enable row level security;

-- True when the signed-in user has unlimited snake housing spaces.
create or replace function public.keeper_has_unlimited_spaces()
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (
       select 1 from public.keeper_unlimited_spaces x
       where x.user_id = auth.uid()
     );
$$;

revoke all on function public.keeper_has_unlimited_spaces() from public, anon;
grant execute on function public.keeper_has_unlimited_spaces() to authenticated;

-- Seed: Gage's account only. (The 2026-09-27 founder-exemption fix confirmed
-- arborealsbybunn@gmail.com is the real auth account.)
insert into public.keeper_unlimited_spaces (user_id, reason)
select id, 'founder: unlimited snake housing spaces'
from auth.users
where lower(email) = 'arborealsbybunn@gmail.com'
on conflict (user_id) do nothing;
