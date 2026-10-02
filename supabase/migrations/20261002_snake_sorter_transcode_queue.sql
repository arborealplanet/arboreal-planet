-- Snake Sorter transcode queue.
--
-- Video contributions land in Google Drive (service account). A background
-- worker claims queued jobs, transcodes each original into a reviewable
-- converted copy, stores it back in Drive, and marks the job done — the
-- whole pipeline runs with zero touches until a human opens the review queue.
--
-- Locked down: no direct table access for anon/authenticated. The worker
-- talks through the two SECURITY DEFINER functions below, fronted by a
-- shared-secret API route.

create table if not exists public.snake_sorter_transcode_queue (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.snake_sorter_contributions(id) on delete cascade,
  drive_file_id text not null,
  status text not null default 'queued'
    check (status in ('queued', 'claimed', 'done', 'failed')),
  attempts int not null default 0,
  error text,
  converted_drive_file_id text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz
);

create index if not exists snake_sorter_transcode_queue_status_idx
  on public.snake_sorter_transcode_queue (status, created_at)
  where status = 'queued';

revoke all on public.snake_sorter_transcode_queue from anon, authenticated;

-- Row-level security ON (policies below are dead without it), then the
-- narrow grants the policies filter. anon gets nothing.
alter table public.snake_sorter_transcode_queue enable row level security;
grant select, insert on public.snake_sorter_transcode_queue to authenticated;

-- Contributors may read their own jobs (to see transcode status); the owner
-- may read all. Mirrors the contributions SELECT policy.
create policy "transcode queue select own or owner"
  on public.snake_sorter_transcode_queue
  for select to authenticated
  using (
    exists (
      select 1
      from public.snake_sorter_contributions c
      where c.id = public.snake_sorter_transcode_queue.contribution_id
        and (
          c.contributor_user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'owner'
          )
        )
    )
  );

-- Contributors may file a ticket for their own contributions (the upload
-- route writes one when a Drive upload completes).
create policy "transcode queue insert own"
  on public.snake_sorter_transcode_queue
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.snake_sorter_contributions c
      where c.id = public.snake_sorter_transcode_queue.contribution_id
        and c.contributor_user_id = auth.uid()
    )
  );

-- Claim the oldest queued job (or a stale claim older than 30 minutes).
-- Self-healing: first files tickets for any pending_review Drive video
-- missing one (e.g. the ticket insert was lost), then claims.
-- SKIP LOCKED keeps concurrent workers from double-claiming.
create or replace function public.transcode_claim_job()
returns table (job_id uuid, contribution_id uuid, drive_file_id text, attempts int)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  insert into public.snake_sorter_transcode_queue (contribution_id, drive_file_id, status)
  select c.id, substring(c.storage_path from 8), 'queued'
  from public.snake_sorter_contributions c
  where c.media_type = 'video'
    and c.storage_path like 'gdrive:%'
    and c.status = 'pending_review'
    and not exists (
      select 1
      from public.snake_sorter_transcode_queue q
      where q.contribution_id = c.id
        and q.status in ('queued', 'claimed', 'done')
    );

  select q.id into target_id
  from public.snake_sorter_transcode_queue q
  where q.status = 'queued'
     or (q.status = 'claimed' and q.claimed_at < now() - interval '30 minutes')
  order by q.created_at
  limit 1
  for update skip locked;

  if target_id is null then
    return;
  end if;

  update public.snake_sorter_transcode_queue
  set status = 'claimed',
      claimed_at = now(),
      attempts = attempts + 1
  where id = target_id;

  return query
  select q.id, q.contribution_id, q.drive_file_id, q.attempts
  from public.snake_sorter_transcode_queue q
  where q.id = target_id;
end;
$$;

revoke all on function public.transcode_claim_job() from public, anon, authenticated;
grant execute on function public.transcode_claim_job() to anon, authenticated;

-- Mark a claimed job done (converted file id) or failed (error message).
create or replace function public.transcode_complete_job(
  p_job_id uuid,
  p_converted_drive_file_id text,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update public.snake_sorter_transcode_queue
  set status = case when p_error is null then 'done' else 'failed' end,
      converted_drive_file_id = p_converted_drive_file_id,
      error = p_error,
      completed_at = now()
  where id = p_job_id
    and status = 'claimed';
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

revoke all on function public.transcode_complete_job(uuid, text, text) from public, anon, authenticated;
grant execute on function public.transcode_complete_job(uuid, text, text) to anon, authenticated;

-- Public job count for the lightweight watcher: returns only how many jobs
-- are queued, no data. Lets a tiny polling script decide whether to wake
-- the worker without any secret.
create or replace function public.transcode_queued_count()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.snake_sorter_transcode_queue
  where status = 'queued';
$$;

revoke all on function public.transcode_queued_count() from public;
grant execute on function public.transcode_queued_count() to anon, authenticated;
