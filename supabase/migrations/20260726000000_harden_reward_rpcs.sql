-- Harden the legacy reward/balance helpers until higher-level domain RPCs
-- replace them. Every function targets auth.uid(), validates its delta, and
-- returns the authoritative balance. Retire the caller-controlled signatures.

alter table public.profiles
  add column if not exists tokens integer not null default 0;

-- Existing installations may predate these checks. Fail migration rather than
-- silently preserving corrupt negative balances.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_xp_nonnegative'
  ) then
    alter table public.profiles
      add constraint profiles_xp_nonnegative check (xp >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_tokens_nonnegative'
  ) then
    alter table public.profiles
      add constraint profiles_tokens_nonnegative check (tokens >= 0) not valid;
  end if;
end
$$;

alter table public.profiles validate constraint profiles_xp_nonnegative;
alter table public.profiles validate constraint profiles_tokens_nonnegative;

drop function if exists public.increment_xp(uuid, integer);
drop function if exists public.add_tokens(uuid, integer);
drop function if exists public.spend_tokens(uuid, integer);

create or replace function public.increment_xp(delta integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  next_xp integer;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if delta is null or delta <= 0 then
    raise exception 'invalid_xp_delta' using errcode = '22023';
  end if;

  update public.profiles
  set xp = xp + delta
  where user_id = actor
  returning xp into next_xp;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  return next_xp;
end;
$$;

create or replace function public.add_tokens(amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  next_tokens integer;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if amount is null or amount <= 0 then
    raise exception 'invalid_token_amount' using errcode = '22023';
  end if;

  update public.profiles
  set tokens = tokens + amount
  where user_id = actor
  returning tokens into next_tokens;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  return next_tokens;
end;
$$;

create or replace function public.spend_tokens(amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  next_tokens integer;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if amount is null or amount <= 0 then
    raise exception 'invalid_token_amount' using errcode = '22023';
  end if;

  update public.profiles
  set tokens = tokens - amount
  where user_id = actor and tokens >= amount
  returning tokens into next_tokens;

  if not found then
    if not exists (select 1 from public.profiles where user_id = actor) then
      raise exception 'profile_not_found' using errcode = 'P0002';
    end if;
    raise exception 'insufficient_tokens' using errcode = 'P0001';
  end if;
  return next_tokens;
end;
$$;

revoke all on function public.increment_xp(integer) from public;
revoke all on function public.add_tokens(integer) from public;
revoke all on function public.spend_tokens(integer) from public;
revoke all on function public.increment_xp(integer) from anon;
revoke all on function public.add_tokens(integer) from anon;
revoke all on function public.spend_tokens(integer) from anon;
grant execute on function public.increment_xp(integer) to authenticated;
grant execute on function public.add_tokens(integer) to authenticated;
grant execute on function public.spend_tokens(integer) to authenticated;
