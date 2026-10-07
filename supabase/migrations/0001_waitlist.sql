-- Waitlist schema. Apply in the Supabase SQL editor or with `supabase db push`.
-- After applying, store the SHA-256 hex of your WAITLIST_RPC_TOKEN:
--   insert into private.settings (key, value) values ('rpc_token_sha256', '<sha256 hex of token>');

create extension if not exists citext with schema extensions;

create table public.waitlist (
  id bigint generated always as identity primary key,
  email extensions.citext not null unique
    check (char_length(email::text) <= 254 and email::text ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  created_at timestamptz not null default now()
);

create table public.waitlist_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index waitlist_attempts_ip_time_idx on public.waitlist_attempts (ip_hash, created_at);
create index waitlist_attempts_time_idx on public.waitlist_attempts (created_at);

-- RLS on with no policies, and no grants: neither table is reachable through the public API.
alter table public.waitlist enable row level security;
alter table public.waitlist_attempts enable row level security;
revoke all on public.waitlist, public.waitlist_attempts from anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  key text primary key,
  value text not null
);

-- Callable with the publishable key, but only by a caller holding the server-side token.
-- Duplicates are a silent no-op so the API can't reveal whether an address is already listed.
create function public.join_waitlist(p_token text, p_email text, p_ip_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
  recent int;
begin
  select value into expected from private.settings where key = 'rpc_token_sha256';
  if expected is null or p_token is null
     or encode(sha256(convert_to(p_token, 'UTF8')), 'hex') <> expected then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_email is null or char_length(p_email) > 254
     or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     or p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    return 'invalid';
  end if;

  select count(*) into recent
  from public.waitlist_attempts
  where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes';

  if recent >= 5 then
    return 'rate_limited';
  end if;

  insert into public.waitlist_attempts (ip_hash) values (p_ip_hash);
  delete from public.waitlist_attempts where created_at < now() - interval '1 day';

  insert into public.waitlist (email) values (lower(trim(p_email)))
  on conflict (email) do nothing;

  return 'ok';
end;
$$;

revoke execute on function public.join_waitlist(text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text) to anon, service_role;
