-- Add tokens currency to profiles
alter table public.profiles
  add column if not exists tokens integer not null default 0;

-- Atomic add function — mirrors increment_xp
create or replace function public.add_tokens(uid uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set tokens = tokens + amount
  where user_id = uid;
end;
$$;

-- Atomic spend function — raises on insufficient balance
create or replace function public.spend_tokens(uid uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set tokens = tokens - amount
  where user_id = uid and tokens >= amount;
  if not found then
    raise exception 'insufficient_tokens';
  end if;
end;
$$;
