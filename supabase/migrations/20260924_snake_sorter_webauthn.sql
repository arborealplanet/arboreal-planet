-- Snake Sorter biometric (WebAuthn) unlock support.
--
-- Adds per-user WebAuthn credentials (fingerprint / Face ID / platform
-- authenticator) as an alternative to the PIN at /snake-sorter/unlock.
--
-- IMPORTANT - verify before applying:
--   unlock_snake_sorter_webauthn() below mirrors the session creation of the
--   existing unlock_snake_sorter(p_pin) RPC. Confirm the target table name and
--   columns (snake_sorter_unlock_sessions(user_id, session_token, expires_at))
--   against the live unlock_snake_sorter definition before running
--   `supabase db push`. Postgres DDL is transactional: if the names are wrong
--   the migration fails cleanly and nothing is applied.

create table if not exists public.snake_sorter_webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  label text,
  created_at timestamptz not null default now()
);

create index if not exists snake_sorter_webauthn_credentials_user_id_idx
  on public.snake_sorter_webauthn_credentials (user_id);

alter table public.snake_sorter_webauthn_credentials enable row level security;

drop policy if exists "Users manage their own webauthn credentials"
  on public.snake_sorter_webauthn_credentials;
create policy "Users manage their own webauthn credentials"
  on public.snake_sorter_webauthn_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Verify the unlock-sessions table shape this migration assumes. The
-- existing PIN unlock RPC (unlock_snake_sorter(p_pin)) is the source of
-- truth; if it stores sessions differently, stop here with a clear error
-- instead of creating a broken RPC. DDL is transactional, so nothing is
-- applied when this fails.
do $$
declare
  v_missing text[];
begin
  select array_agg(expected.c)
  into v_missing
  from (values ('user_id'), ('session_token'), ('expires_at')) as expected(c)
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'snake_sorter_unlock_sessions'
      and column_name = expected.c
  );
  if v_missing is not null then
    raise exception 'snake_sorter_unlock_sessions is missing columns: %. Verify against the live unlock_snake_sorter(p_pin) definition before applying this migration.', array_to_string(v_missing, ', ');
  end if;
end $$;

-- Mint an unlock session after a successful WebAuthn authentication ceremony.
-- Called only after the application server has verified the WebAuthn
-- assertion; the function itself performs no cryptographic checks.
create or replace function public.unlock_snake_sorter_webauthn()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.snake_sorter_unlock_sessions (user_id, session_token, expires_at)
  values (auth.uid(), v_token, now() + interval '12 hours');
  return v_token;
end;
$$;

revoke all on function public.unlock_snake_sorter_webauthn() from public;
grant execute on function public.unlock_snake_sorter_webauthn() to authenticated;
