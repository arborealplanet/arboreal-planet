-- Event RSVPs: keepers can mark themselves Interested or Going on published events.
-- One RSVP per user per event (status flips between the two).
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('interested', 'going')),
  created_at timestamptz not null default now(),
  constraint event_rsvps_unique_user_event unique (event_id, user_id)
);

create index if not exists event_rsvps_event_idx on public.event_rsvps (event_id, status);

alter table public.event_rsvps enable row level security;

drop policy if exists "Event RSVPs are public" on public.event_rsvps;
create policy "Event RSVPs are public"
  on public.event_rsvps for select
  using (true);

drop policy if exists "Users can RSVP" on public.event_rsvps;
create policy "Users can RSVP"
  on public.event_rsvps for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their RSVP" on public.event_rsvps;
create policy "Users can update their RSVP"
  on public.event_rsvps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their RSVP" on public.event_rsvps;
create policy "Users can remove their RSVP"
  on public.event_rsvps for delete
  using (auth.uid() = user_id);
