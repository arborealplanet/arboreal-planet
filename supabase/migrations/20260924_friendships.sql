-- Reciprocal keeper friendships: request -> pending -> accepted.
-- Declining, cancelling or unfriending deletes the row so a fresh request can be sent later.
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
);

create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

drop policy if exists "Friendship parties can read" on public.friendships;
create policy "Friendship parties can read"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Accepted friendships are public" on public.friendships;
create policy "Accepted friendships are public"
  on public.friendships for select
  using (status = 'accepted');

drop policy if exists "Users can request friendships" on public.friendships;
create policy "Users can request friendships"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Friendship parties can update" on public.friendships;
create policy "Friendship parties can update"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Friendship parties can delete" on public.friendships;
create policy "Friendship parties can delete"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
