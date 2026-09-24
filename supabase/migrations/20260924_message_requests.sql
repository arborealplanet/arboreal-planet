-- Message requests: conversations started by strangers land in a Requests section
-- of the recipient's inbox instead of the main list, until accepted.
-- Idempotent: safe to re-run. NOTE: run against the live database.
-- conversation_id is intentionally FK-free: the conversations table definition
-- is not in this repo (it is managed by live RPCs).

create table if not exists public.message_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique,
  requester_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint message_requests_no_self check (requester_id <> recipient_id)
);

create index if not exists message_requests_recipient_idx on public.message_requests (recipient_id, status);
create index if not exists message_requests_requester_idx on public.message_requests (requester_id, status);
create index if not exists message_requests_conversation_idx on public.message_requests (conversation_id);

alter table public.message_requests enable row level security;

drop policy if exists "Request parties can read" on public.message_requests;
create policy "Request parties can read"
  on public.message_requests for select
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Requesters can create requests" on public.message_requests;
create policy "Requesters can create requests"
  on public.message_requests for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Recipients can decide requests" on public.message_requests;
create policy "Recipients can decide requests"
  on public.message_requests for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
