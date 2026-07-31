-- Durable equip command identity and safe profile auto-provisioning.
-- Equip request rows retain the original command/result so response-loss retries
-- return the exact authoritative replacement identity without mutating again.

create table public.equip_requests (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  request_id uuid not null,
  item_id text not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_id, request_id)
);

alter table public.equip_requests enable row level security;
revoke all on table public.equip_requests from public, anon, authenticated;

create or replace function public.equip_item(
  p_item_id text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_item public.store_catalog%rowtype;
  v_prior public.equip_requests%rowtype;
  v_replaced text;
  v_result jsonb;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'invalid_request_id' using errcode = '22023';
  end if;
  if p_item_id is null or pg_catalog.length(p_item_id) < 1 or pg_catalog.length(p_item_id) > 128 then
    raise exception 'invalid_item_id' using errcode = '22023';
  end if;

  -- One lock namespace per authenticated request makes both exact replay and
  -- changed-command conflict deterministic even when calls arrive together.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_actor::text || ':equip-request:' || p_request_id::text, 0)
  );
  select * into v_prior
  from public.equip_requests
  where user_id = v_actor and request_id = p_request_id
  for update;
  if found then
    if v_prior.item_id is distinct from p_item_id then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;
    return pg_catalog.jsonb_set(v_prior.result, '{replayed}', 'true'::jsonb, true);
  end if;

  -- Slot and ownership are catalog/server authority, never caller inputs.
  select * into v_item
  from public.store_catalog
  where item_id = p_item_id and enabled;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.user_inventory
    where user_id = v_actor and item_id = p_item_id
  ) then
    raise exception 'item_not_owned' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_actor::text || ':equip-slot:' || v_item.slot, 0)
  );
  select item_id into v_replaced
  from public.user_equipped
  where user_id = v_actor and slot = v_item.slot
  for update;

  insert into public.user_equipped (user_id, slot, item_id, updated_at)
  values (v_actor, v_item.slot, p_item_id, clock_timestamp())
  on conflict (user_id, slot) do update
    set item_id = excluded.item_id, updated_at = excluded.updated_at;

  v_result := pg_catalog.jsonb_build_object(
    'requestId', p_request_id,
    'itemId', p_item_id,
    'equipped', pg_catalog.jsonb_build_object('slot', v_item.slot, 'itemId', p_item_id),
    'replacedItemId', v_replaced,
    'replayed', false
  );
  insert into public.equip_requests (user_id, request_id, item_id, result)
  values (v_actor, p_request_id, p_item_id, v_result);
  return v_result;
end;
$function$;

-- Metadata is accepted only when it already satisfies the profile boundary.
-- Otherwise a bounded email fallback is used; malformed/absent values become
-- null rather than aborting an otherwise valid auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_metadata_name text := pg_catalog.btrim(new.raw_user_meta_data->>'display_name');
  v_display_name text;
begin
  if v_metadata_name is not null
    and v_metadata_name <> ''
    and pg_catalog.char_length(v_metadata_name) <= 120
    and v_metadata_name !~ '[[:cntrl:]]'
  then
    v_display_name := v_metadata_name;
  elsif new.email is not null and new.email !~ '[[:cntrl:]]' then
    v_display_name := pg_catalog.substring(new.email, 1, 120);
  else
    v_display_name := null;
  end if;

  insert into public.profiles (user_id, display_name)
  values (new.id, v_display_name);
  return new;
end;
$function$;

-- CREATE FUNCTION grants PUBLIC by default. Revoke every exact overload,
-- including the obsolete one-argument signature, then expose only the durable
-- authenticated command.
revoke all on function public.equip_item(text) from public, anon, authenticated;
revoke all on function public.equip_item(text, uuid) from public, anon, authenticated;
grant execute on function public.equip_item(text, uuid) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

comment on table public.equip_requests is
  'Auth-bound durable command/result storage for exact equip replay and idempotency conflicts.';
