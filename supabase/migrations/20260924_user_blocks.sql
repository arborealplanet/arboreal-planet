-- Global user blocking: a block stops follows, friend requests and direct
-- messages in both directions. Idempotent: safe to re-run.
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_id),
  constraint user_blocks_unique_pair unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Block parties can read" on public.user_blocks;
create policy "Block parties can read"
  on public.user_blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users can block" on public.user_blocks;
create policy "Users can block"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Blockers can unblock" on public.user_blocks;
create policy "Blockers can unblock"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);
