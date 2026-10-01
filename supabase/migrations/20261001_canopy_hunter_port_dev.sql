-- Canopy Hunter River Port — private playtest gate.
--
-- The river port stop (Phase 1 of the port expansion) ships gated to
-- specific users while it is tuned. Everyone else keeps the standard
-- mid-expedition flow. Access is handed out with rows only.

create table if not exists public.canopy_hunter_port_devs (
  user_id uuid primary key,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.canopy_hunter_port_devs enable row level security;

-- True when the signed-in user may see the river port stop. Service role
-- only under the hood (SECURITY DEFINER); players cannot read the table.
create or replace function public.canopy_hunter_port_dev()
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (
       select 1 from public.canopy_hunter_port_devs x
       where x.user_id = auth.uid()
     );
$$;

revoke all on function public.canopy_hunter_port_dev() from public, anon;
grant execute on function public.canopy_hunter_port_dev() to authenticated;

-- Seed: Gage's user. Mature runs only; no-op when the user is absent.
insert into public.canopy_hunter_port_devs (user_id, reason)
select id, 'Owner playtest gate — remove the row to revoke.'
from auth.users
where email in ('gageallanbunn@gmail.com', 'arborealsbybunn@gmail.com')
on conflict (user_id) do nothing;
