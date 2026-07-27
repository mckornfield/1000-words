-- Secure domain-command boundary for study, gamification, shop, and leaderboard.
-- This migration intentionally supersedes the transitional client-callable reward RPCs.

alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists time_zone text not null default 'UTC';

create or replace function public.validate_profile_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.time_zone is null or length(new.time_zone) > 64 or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.time_zone
  ) then
    raise exception 'invalid_time_zone' using errcode = '22023';
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_validate_time_zone on public.profiles;
create trigger profiles_validate_time_zone
  before insert or update of time_zone on public.profiles
  for each row execute function public.validate_profile_time_zone();

alter table public.review_logs
  add column if not exists review_id uuid,
  add column if not exists session_id uuid,
  add column if not exists lang_pair text,
  add column if not exists next_state jsonb;
create unique index if not exists review_logs_user_review_id_key
  on public.review_logs (user_id, review_id) where review_id is not null;
create index if not exists review_logs_user_session_idx
  on public.review_logs (user_id, session_id) where session_id is not null;

create table if not exists public.study_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  lang_pair text not null,
  requested_started_at timestamptz not null,
  requested_completed_at timestamptz not null,
  completed_at timestamptz not null default clock_timestamp(),
  local_study_date date not null,
  result jsonb not null,
  primary key (user_id, session_id)
);

create table if not exists public.user_learning_totals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cards_reviewed bigint not null default 0 check (cards_reviewed >= 0),
  sessions_completed bigint not null default 0 check (sessions_completed >= 0),
  minutes_studied bigint not null default 0 check (minutes_studied >= 0),
  perfect_sessions bigint not null default 0 check (perfect_sessions >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievement_catalog (
  achievement_id text primary key,
  xp_reward integer not null check (xp_reward >= 0),
  criteria_type text not null,
  criteria_target integer not null check (criteria_target > 0),
  prerequisite_id text references public.achievement_catalog (achievement_id),
  enabled boolean not null default true
);

insert into public.achievement_catalog (achievement_id, xp_reward, criteria_type, criteria_target, prerequisite_id) values
  ('Ach-001', 100,  'sessions_completed',   1,   null),
  ('Ach-002', 280,  'streak_days',          7,   null),
  ('Ach-003', 400,  'xp_total',             500, null),
  ('Ach-004', 350,  'cards_reviewed_total', 100, null),
  ('Ach-005', 600,  'sessions_completed',   5,   'Ach-001'),
  ('Ach-006', 1200, 'streak_days',          30,  'Ach-002'),
  ('Ach-007', 450,  'sessions_completed',   3,   null),
  ('Ach-008', 500,  'perfect_sessions',     1,   null),
  ('Ach-009', 200,  'local_hour_after',     22,  null),
  ('Ach-010', 200,  'local_hour_before',    8,   null),
  ('Ach-011', 550,  'sessions_completed',   5,   'Ach-007'),
  ('Ach-012', 750,  'cards_reviewed_total', 500, null)
on conflict (achievement_id) do update set
  xp_reward = excluded.xp_reward,
  criteria_type = excluded.criteria_type,
  criteria_target = excluded.criteria_target,
  prerequisite_id = excluded.prerequisite_id,
  enabled = true;

create table if not exists public.store_catalog (
  item_id text primary key,
  slot text not null check (slot in ('profile_picture', 'profile_border', 'profile_accent')),
  token_cost integer not null check (token_cost >= 0),
  achievement_id_required text references public.achievement_catalog (achievement_id),
  enabled boolean not null default true
);

insert into public.store_catalog (item_id, slot, token_cost, achievement_id_required) values
  ('StoreAvatar-001', 'profile_picture', 120, null),
  ('StoreAvatar-002', 'profile_picture', 160, 'Ach-002'),
  ('StoreAvatar-003', 'profile_picture', 240, 'Ach-004'),
  ('Border-001',      'profile_border',   90, null),
  ('Border-002',      'profile_border',  110, 'Ach-003'),
  ('Border-003',      'profile_border',   70, 'Ach-001'),
  ('Accent-001',      'profile_accent',   60, 'Ach-003'),
  ('Accent-002',      'profile_accent',  180, 'Ach-006'),
  ('Accent-003',      'profile_accent',  140, 'Ach-010'),
  ('Border-004',      'profile_border',  300, 'Ach-012')
on conflict (item_id) do update set
  slot = excluded.slot,
  token_cost = excluded.token_cost,
  achievement_id_required = excluded.achievement_id_required,
  enabled = true;

create table if not exists public.purchase_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  item_id text not null references public.store_catalog (item_id),
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table public.study_sessions enable row level security;
alter table public.user_learning_totals enable row level security;
alter table public.achievement_catalog enable row level security;
alter table public.store_catalog enable row level security;
alter table public.purchase_requests enable row level security;

drop policy if exists study_sessions_select_own on public.study_sessions;
create policy study_sessions_select_own on public.study_sessions for select using (auth.uid() = user_id);
drop policy if exists learning_totals_select_own on public.user_learning_totals;
create policy learning_totals_select_own on public.user_learning_totals for select using (auth.uid() = user_id);
drop policy if exists purchase_requests_select_own on public.purchase_requests;
create policy purchase_requests_select_own on public.purchase_requests for select using (auth.uid() = user_id);

-- The browser may read its state but only domain commands can mutate it.
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists card_progress_insert_own on public.card_progress;
drop policy if exists card_progress_update_own on public.card_progress;
drop policy if exists card_progress_delete_own on public.card_progress;
drop policy if exists review_logs_insert_own on public.review_logs;
drop policy if exists ua_insert_own on public.user_achievements;
drop policy if exists inv_insert_own on public.user_inventory;
drop policy if exists eq_insert_own on public.user_equipped;
drop policy if exists eq_update_own on public.user_equipped;
drop policy if exists dg_insert_own on public.user_daily_goals;
drop policy if exists dg_update_own on public.user_daily_goals;

revoke insert on table public.profiles from authenticated;
revoke update on table public.profiles from authenticated;
grant update (display_name, bio, settings, time_zone) on table public.profiles to authenticated;
revoke insert, update, delete on table public.card_progress from authenticated;
revoke insert, update, delete on table public.review_logs from authenticated;
revoke insert, update, delete on table public.user_achievements from authenticated;
revoke insert, update, delete on table public.user_inventory from authenticated;
revoke insert, update, delete on table public.user_equipped from authenticated;
revoke insert, update, delete on table public.user_daily_goals from authenticated;
revoke insert, update, delete on table public.study_sessions from authenticated;
revoke insert, update, delete on table public.user_learning_totals from authenticated;
revoke all on table public.achievement_catalog from anon, authenticated;
revoke all on table public.store_catalog from anon, authenticated;
revoke insert, update, delete on table public.purchase_requests from authenticated;

grant select on table public.study_sessions, public.user_learning_totals, public.purchase_requests to authenticated;

create or replace function public.record_card_review(
  p_review_id uuid,
  p_session_id uuid,
  p_lang_pair text,
  p_card_id text,
  p_rating integer,
  p_elapsed_ms integer,
  p_next_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_existing public.review_logs%rowtype;
  v_rating_name text;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_review_id is null or p_session_id is null then raise exception 'invalid_id' using errcode = '22023'; end if;
  if p_lang_pair is null or p_lang_pair not in ('en-es','en-zh','en-ko','en-ja') then raise exception 'invalid_lang_pair' using errcode = '22023'; end if;
  if p_card_id is null or length(p_card_id) > 128
    or p_card_id !~ ('^' || pg_catalog.split_part(p_lang_pair, '-', 2) || '-[0-9]{4}$')
  then raise exception 'invalid_card_id' using errcode = '22023'; end if;
  if p_rating is null or p_rating not between 1 and 4 then raise exception 'invalid_rating' using errcode = '22023'; end if;
  if p_elapsed_ms is null or p_elapsed_ms < 0 or p_elapsed_ms > 600000 then raise exception 'invalid_elapsed_ms' using errcode = '22023'; end if;
  if p_next_state is null or jsonb_typeof(p_next_state) <> 'object'
    or not (p_next_state ?& array['due','stability','difficulty','elapsedDays','scheduledDays','learningSteps','reps','lapses','state','lastReview'])
    or jsonb_typeof(p_next_state->'due') <> 'string'
    or jsonb_typeof(p_next_state->'stability') <> 'number'
    or jsonb_typeof(p_next_state->'difficulty') <> 'number'
    or jsonb_typeof(p_next_state->'elapsedDays') <> 'number'
    or jsonb_typeof(p_next_state->'scheduledDays') <> 'number'
    or jsonb_typeof(p_next_state->'learningSteps') <> 'number'
    or jsonb_typeof(p_next_state->'reps') <> 'number'
    or jsonb_typeof(p_next_state->'lapses') <> 'number'
    or jsonb_typeof(p_next_state->'state') <> 'number'
    or jsonb_typeof(p_next_state->'lastReview') not in ('string', 'null')
  then raise exception 'invalid_next_state' using errcode = '22023'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || p_session_id::text, 0));

  select * into v_existing from public.review_logs
    where user_id = v_actor and review_id = p_review_id for update;
  if found then
    if v_existing.session_id is distinct from p_session_id
      or v_existing.lang_pair is distinct from p_lang_pair
      or v_existing.card_id is distinct from p_card_id
      or v_existing.rating is distinct from p_rating
      or v_existing.elapsed_ms is distinct from p_elapsed_ms
      or v_existing.next_state is distinct from p_next_state
    then raise exception 'idempotency_conflict' using errcode = '23505'; end if;
    v_rating_name := (array['again','hard','good','easy'])[v_existing.rating];
    return jsonb_build_object(
      'reviewId', v_existing.review_id, 'sessionId', v_existing.session_id,
      'cardId', v_existing.card_id, 'rating', v_rating_name,
      'reviewedAt', v_existing.reviewed_at, 'progress', v_existing.next_state,
      'replayed', true
    );
  end if;

  if exists (select 1 from public.study_sessions where user_id = v_actor and session_id = p_session_id) then
    raise exception 'session_completed' using errcode = '55000';
  end if;

  perform (p_next_state->>'due')::timestamptz;
  perform nullif(p_next_state->>'lastReview', '')::timestamptz;
  if (p_next_state->>'stability')::double precision < 0 or (p_next_state->>'stability')::double precision > 36500
    or (p_next_state->>'difficulty')::double precision < 0 or (p_next_state->>'difficulty')::double precision > 10
    or (p_next_state->>'elapsedDays')::double precision < 0 or (p_next_state->>'elapsedDays')::double precision > 36500
    or (p_next_state->>'scheduledDays')::double precision < 0 or (p_next_state->>'scheduledDays')::double precision > 36500
    or (p_next_state->>'learningSteps')::numeric <> pg_catalog.trunc((p_next_state->>'learningSteps')::numeric)
    or (p_next_state->>'learningSteps')::integer not between 0 and 100
    or (p_next_state->>'reps')::numeric <> pg_catalog.trunc((p_next_state->>'reps')::numeric)
    or (p_next_state->>'reps')::integer not between 0 and 1000000
    or (p_next_state->>'lapses')::numeric <> pg_catalog.trunc((p_next_state->>'lapses')::numeric)
    or (p_next_state->>'lapses')::integer not between 0 and 1000000
    or (p_next_state->>'state')::numeric <> pg_catalog.trunc((p_next_state->>'state')::numeric)
    or (p_next_state->>'state')::integer not between 0 and 3
  then raise exception 'invalid_next_state' using errcode = '22023'; end if;

  insert into public.review_logs (user_id, review_id, session_id, lang_pair, card_id, rating, reviewed_at, elapsed_ms, next_state)
  values (v_actor, p_review_id, p_session_id, p_lang_pair, p_card_id, p_rating, v_now, p_elapsed_ms, p_next_state);

  insert into public.card_progress (
    user_id, card_id, lang_pair, due, stability, difficulty, elapsed_days,
    scheduled_days, learning_steps, reps, lapses, state, last_review, updated_at
  ) values (
    v_actor, p_card_id, p_lang_pair, (p_next_state->>'due')::timestamptz,
    (p_next_state->>'stability')::double precision, (p_next_state->>'difficulty')::double precision,
    (p_next_state->>'elapsedDays')::double precision, (p_next_state->>'scheduledDays')::double precision,
    (p_next_state->>'learningSteps')::integer, (p_next_state->>'reps')::integer,
    (p_next_state->>'lapses')::integer, (p_next_state->>'state')::smallint,
    nullif(p_next_state->>'lastReview', '')::timestamptz, v_now
  ) on conflict (user_id, card_id) do update set
    lang_pair = excluded.lang_pair, due = excluded.due, stability = excluded.stability,
    difficulty = excluded.difficulty, elapsed_days = excluded.elapsed_days,
    scheduled_days = excluded.scheduled_days, learning_steps = excluded.learning_steps,
    reps = excluded.reps, lapses = excluded.lapses, state = excluded.state,
    last_review = excluded.last_review, updated_at = excluded.updated_at;

  v_rating_name := (array['again','hard','good','easy'])[p_rating];
  v_result := jsonb_build_object(
    'reviewId', p_review_id, 'sessionId', p_session_id, 'cardId', p_card_id,
    'rating', v_rating_name, 'reviewedAt', v_now, 'progress', p_next_state, 'replayed', false
  );
  return v_result;
end;
$function$;

create or replace function public.complete_study_session(
  p_session_id uuid,
  p_lang_pair text,
  p_started_at timestamptz,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_profile public.profiles%rowtype;
  v_prior public.study_sessions%rowtype;
  v_time_zone text;
  v_local_date date;
  v_local_hour integer;
  v_cards integer;
  v_correct integer;
  v_duration_seconds integer;
  v_minutes integer;
  v_accuracy integer;
  v_review_xp integer;
  v_achievement_xp integer := 0;
  v_total_xp integer;
  v_totals public.user_learning_totals%rowtype;
  v_achievement record;
  v_earned_at timestamptz;
  v_unlocked jsonb := '[]'::jsonb;
  v_goals jsonb;
  v_profile_json jsonb;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_session_id is null then raise exception 'invalid_session_id' using errcode = '22023'; end if;
  if p_lang_pair is null or p_lang_pair not in ('en-es','en-zh','en-ko','en-ja') then raise exception 'invalid_lang_pair' using errcode = '22023'; end if;
  if p_started_at is null or p_completed_at is null or p_completed_at < p_started_at
    or p_completed_at - p_started_at > interval '4 hours'
    or p_completed_at < v_now - interval '5 minutes'
    or p_completed_at > v_now + interval '5 minutes'
  then raise exception 'invalid_session_duration' using errcode = '22023'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || p_session_id::text, 0));
  select * into v_prior from public.study_sessions
    where user_id = v_actor and session_id = p_session_id for update;
  if found then
    if v_prior.lang_pair is distinct from p_lang_pair
      or v_prior.requested_started_at is distinct from p_started_at
      or v_prior.requested_completed_at is distinct from p_completed_at
    then raise exception 'idempotency_conflict' using errcode = '23505'; end if;
    return jsonb_set(v_prior.result, '{replayed}', 'true'::jsonb, true);
  end if;

  select * into v_profile from public.profiles where user_id = v_actor for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  v_time_zone := coalesce(v_profile.time_zone, 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_time_zone) then
    raise exception 'invalid_profile_time_zone' using errcode = '22023';
  end if;
  v_local_date := (p_completed_at at time zone v_time_zone)::date;
  v_local_hour := extract(hour from p_completed_at at time zone v_time_zone)::integer;

  select count(*)::integer,
    count(*) filter (where rating in (3,4))::integer,
    coalesce(sum(elapsed_ms), 0)::integer / 1000,
    coalesce(sum(case rating when 1 then 0 when 2 then 5 when 3 then 10 when 4 then 15 end), 0)::integer
  into v_cards, v_correct, v_duration_seconds, v_review_xp
  from public.review_logs
  where user_id = v_actor and session_id = p_session_id and lang_pair = p_lang_pair;
  if v_cards = 0 then raise exception 'empty_session' using errcode = '22023'; end if;
  if exists (select 1 from public.review_logs where user_id = v_actor and session_id = p_session_id and lang_pair <> p_lang_pair) then
    raise exception 'session_language_mismatch' using errcode = '22023';
  end if;
  v_minutes := floor(v_duration_seconds / 60.0)::integer;
  v_accuracy := round((v_correct::numeric * 100) / v_cards)::integer;

  if v_profile.last_active_date is null then
    v_profile.streak_count := 1;
  elsif v_local_date = v_profile.last_active_date + 1 then
    v_profile.streak_count := v_profile.streak_count + 1;
  elsif v_local_date > v_profile.last_active_date + 1 then
    v_profile.streak_count := 1;
  end if;
  if v_profile.last_active_date is null or v_local_date > v_profile.last_active_date then
    v_profile.last_active_date := v_local_date;
  end if;

  insert into public.user_learning_totals (user_id, cards_reviewed, sessions_completed, minutes_studied, perfect_sessions)
  values (v_actor, v_cards, 1, v_minutes, case when v_accuracy = 100 then 1 else 0 end)
  on conflict (user_id) do update set
    cards_reviewed = public.user_learning_totals.cards_reviewed + excluded.cards_reviewed,
    sessions_completed = public.user_learning_totals.sessions_completed + 1,
    minutes_studied = public.user_learning_totals.minutes_studied + excluded.minutes_studied,
    perfect_sessions = public.user_learning_totals.perfect_sessions + excluded.perfect_sessions,
    updated_at = v_now
  returning * into v_totals;

  for v_achievement in
    select ac.achievement_id, ac.xp_reward
    from public.achievement_catalog ac
    where ac.enabled
      and not exists (select 1 from public.user_achievements ua where ua.user_id = v_actor and ua.achievement_id = ac.achievement_id)
      and (ac.prerequisite_id is null or exists (
        select 1 from public.user_achievements prerequisite
        where prerequisite.user_id = v_actor and prerequisite.achievement_id = ac.prerequisite_id
      ))
      and case ac.criteria_type
        when 'sessions_completed' then v_totals.sessions_completed >= ac.criteria_target
        when 'streak_days' then v_profile.streak_count >= ac.criteria_target
        when 'xp_total' then v_profile.xp + v_review_xp >= ac.criteria_target
        when 'cards_reviewed_total' then v_totals.cards_reviewed >= ac.criteria_target
        when 'perfect_sessions' then v_totals.perfect_sessions >= ac.criteria_target
        when 'local_hour_after' then v_local_hour >= ac.criteria_target
        when 'local_hour_before' then v_local_hour < ac.criteria_target
        else false
      end
    order by ac.achievement_id
  loop
    v_earned_at := null;
    insert into public.user_achievements (user_id, achievement_id, earned_at)
      values (v_actor, v_achievement.achievement_id, v_now)
      on conflict do nothing returning earned_at into v_earned_at;
    if v_earned_at is not null then
      v_achievement_xp := v_achievement_xp + v_achievement.xp_reward;
      v_unlocked := v_unlocked || jsonb_build_array(jsonb_build_object(
        'achievementId', v_achievement.achievement_id, 'earnedAt', v_earned_at
      ));
    end if;
  end loop;

  v_total_xp := v_review_xp + v_achievement_xp;
  update public.profiles set
    xp = xp + v_total_xp,
    streak_count = v_profile.streak_count,
    last_active_date = v_profile.last_active_date
  where user_id = v_actor
  returning * into v_profile;

  insert into public.user_daily_goals (user_id, goal_date, goal_type, target, current) values
    (v_actor, v_local_date, 'cards_reviewed', 20, v_cards),
    (v_actor, v_local_date, 'minutes_studied', 15, v_minutes),
    (v_actor, v_local_date, 'lessons_completed', 1, 1)
  on conflict (user_id, goal_date, goal_type) do update set
    current = public.user_daily_goals.current + excluded.current;

  select coalesce(jsonb_agg(jsonb_build_object(
    'goalType', goal_type, 'target', target, 'current', current, 'goalDate', goal_date
  ) order by goal_type), '[]'::jsonb) into v_goals
  from public.user_daily_goals where user_id = v_actor and goal_date = v_local_date;

  v_profile_json := jsonb_build_object(
    'userId', v_profile.user_id, 'displayName', coalesce(v_profile.display_name, ''),
    'bio', coalesce(v_profile.bio, ''), 'xp', v_profile.xp, 'tokens', v_profile.tokens,
    'streakCount', v_profile.streak_count, 'lastActiveDate', v_profile.last_active_date,
    'createdAt', v_profile.created_at, 'timeZone', v_profile.time_zone,
    'settings', jsonb_build_object(
      'themePreference', case when v_profile.settings->>'themePreference' in ('light','dark','system')
        then v_profile.settings->>'themePreference' else 'system' end,
      'dailyGoalMinutes', case when (v_profile.settings->>'dailyGoalMinutes') ~ '^[0-9]+$'
        then (v_profile.settings->>'dailyGoalMinutes')::integer else 15 end,
      'autoAdvance', case when jsonb_typeof(v_profile.settings->'autoAdvance') = 'boolean'
        then (v_profile.settings->>'autoAdvance')::boolean else false end,
      'notifications', jsonb_build_object(
        'streak', case when v_profile.settings->'notifications'->>'streak' in ('true','false')
          then (v_profile.settings->'notifications'->>'streak')::boolean else true end,
        'goalComplete', case when v_profile.settings->'notifications'->>'goalComplete' in ('true','false')
          then (v_profile.settings->'notifications'->>'goalComplete')::boolean else true end,
        'xpMilestone', case when v_profile.settings->'notifications'->>'xpMilestone' in ('true','false')
          then (v_profile.settings->'notifications'->>'xpMilestone')::boolean else false end
      )
    )
  );
  v_result := jsonb_build_object(
    'sessionId', p_session_id, 'completedAt', p_completed_at, 'localStudyDate', v_local_date,
    'cardsReviewed', v_cards, 'durationSeconds', v_duration_seconds, 'accuracy', v_accuracy,
    'reviewXp', v_review_xp, 'achievementXp', v_achievement_xp, 'totalXpAwarded', v_total_xp,
    'profile', v_profile_json, 'goals', v_goals,
    'totals', jsonb_build_object(
      'cardsReviewed', v_totals.cards_reviewed, 'sessionsCompleted', v_totals.sessions_completed,
      'minutesStudied', v_totals.minutes_studied, 'perfectSessions', v_totals.perfect_sessions
    ),
    'unlockedAchievements', v_unlocked, 'replayed', false
  );

  insert into public.study_sessions (
    user_id, session_id, lang_pair, requested_started_at, requested_completed_at,
    completed_at, local_study_date, result
  ) values (v_actor, p_session_id, p_lang_pair, p_started_at, p_completed_at, v_now, v_local_date, v_result);
  return v_result;
end;
$function$;

create or replace function public.purchase_item(p_item_id text, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_item public.store_catalog%rowtype;
  v_prior public.purchase_requests%rowtype;
  v_purchased_at timestamptz;
  v_balance integer;
  v_status text;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'invalid_request_id' using errcode = '22023'; end if;
  if p_item_id is null or length(p_item_id) < 1 or length(p_item_id) > 128 then raise exception 'invalid_item_id' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':purchase:' || p_request_id::text, 0));
  select * into v_prior from public.purchase_requests
    where user_id = v_actor and request_id = p_request_id for update;
  if found then
    if v_prior.item_id is distinct from p_item_id then raise exception 'idempotency_conflict' using errcode = '23505'; end if;
    return jsonb_set(v_prior.result, '{replayed}', 'true'::jsonb, true);
  end if;
  select * into v_item from public.store_catalog where item_id = p_item_id and enabled;
  if not found then raise exception 'item_not_found' using errcode = 'P0002'; end if;
  if v_item.achievement_id_required is not null and not exists (
    select 1 from public.user_achievements where user_id = v_actor and achievement_id = v_item.achievement_id_required
  ) then raise exception 'achievement_required' using errcode = '42501'; end if;

  select tokens into v_balance from public.profiles where user_id = v_actor for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select purchased_at into v_purchased_at from public.user_inventory
    where user_id = v_actor and item_id = p_item_id;
  if found then
    v_status := 'already_owned';
  else
    if v_balance < v_item.token_cost then raise exception 'insufficient_tokens' using errcode = 'P0001'; end if;
    update public.profiles set tokens = tokens - v_item.token_cost where user_id = v_actor returning tokens into v_balance;
    v_purchased_at := clock_timestamp();
    insert into public.user_inventory (user_id, item_id, purchased_at) values (v_actor, p_item_id, v_purchased_at);
    v_status := 'purchased';
  end if;
  v_result := jsonb_build_object(
    'requestId', p_request_id, 'itemId', p_item_id, 'tokenCost', v_item.token_cost,
    'balance', v_balance, 'inventoryRecord', jsonb_build_object('itemId', p_item_id, 'purchasedAt', v_purchased_at),
    'status', v_status, 'replayed', false
  );
  insert into public.purchase_requests (user_id, request_id, item_id, result) values (v_actor, p_request_id, p_item_id, v_result);
  return v_result;
end;
$function$;

create or replace function public.equip_item(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_item public.store_catalog%rowtype;
  v_replaced text;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_item_id is null or length(p_item_id) < 1 or length(p_item_id) > 128 then raise exception 'invalid_item_id' using errcode = '22023'; end if;
  select * into v_item from public.store_catalog where item_id = p_item_id and enabled;
  if not found then raise exception 'item_not_found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.user_inventory where user_id = v_actor and item_id = p_item_id) then
    raise exception 'item_not_owned' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':equip:' || v_item.slot, 0));
  select item_id into v_replaced from public.user_equipped where user_id = v_actor and slot = v_item.slot for update;
  insert into public.user_equipped (user_id, slot, item_id, updated_at)
    values (v_actor, v_item.slot, p_item_id, clock_timestamp())
    on conflict (user_id, slot) do update set item_id = excluded.item_id, updated_at = excluded.updated_at;
  return jsonb_build_object(
    'equipped', jsonb_build_object('slot', v_item.slot, 'itemId', p_item_id),
    'replacedItemId', v_replaced
  );
end;
$function$;

-- Pre-aggregate one row per user before joining to avoid achievement/equipment fan-out.
drop function if exists public.get_leaderboard(integer);
create function public.get_leaderboard(n integer default 50)
returns table (
  user_id uuid, display_name text, xp integer, level integer,
  achievement_count bigint, rank_value bigint, rank bigint,
  border_item_id text, badge_item_id text, avatar_item_id text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if n is null or n < 1 or n > 100 then raise exception 'invalid_limit' using errcode = '22023'; end if;
  return query
  with achievement_counts as (
    select ua.user_id, count(*)::bigint as achievement_count
    from public.user_achievements ua group by ua.user_id
  ), equipped_items as (
    select ue.user_id,
      max(ue.item_id) filter (where ue.slot = 'profile_border') as border_item_id,
      max(ue.item_id) filter (where ue.slot = 'profile_accent') as badge_item_id,
      max(ue.item_id) filter (where ue.slot = 'profile_picture') as avatar_item_id
    from public.user_equipped ue group by ue.user_id
  ), scored as (
    select p.user_id, coalesce(p.display_name, '') as display_name, p.xp,
      (floor(p.xp::numeric / 250)::integer + 1) as level,
      coalesce(ac.achievement_count, 0::bigint) as achievement_count,
      ((floor(p.xp::numeric / 250)::integer + 1)::bigint * coalesce(ac.achievement_count, 0::bigint)) as rank_value,
      ei.border_item_id, ei.badge_item_id, ei.avatar_item_id
    from public.profiles p
    left join achievement_counts ac on ac.user_id = p.user_id
    left join equipped_items ei on ei.user_id = p.user_id
  ), ranked as (
    select scored.*, row_number() over (order by scored.rank_value desc, scored.xp desc, scored.user_id asc)::bigint as rank
    from scored
  )
  select ranked.user_id, ranked.display_name, ranked.xp, ranked.level,
    ranked.achievement_count, ranked.rank_value, ranked.rank,
    ranked.border_item_id, ranked.badge_item_id, ranked.avatar_item_id
  from ranked order by ranked.rank limit n;
end;
$function$;

drop function if exists public.get_current_user_rank(uuid);
drop function if exists public.get_current_user_rank();
create function public.get_current_user_rank()
returns table (
  user_id uuid, display_name text, xp integer, level integer,
  achievement_count bigint, rank_value bigint, rank bigint,
  border_item_id text, badge_item_id text, avatar_item_id text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query
  with achievement_counts as (
    select ua.user_id, count(*)::bigint as achievement_count
    from public.user_achievements ua group by ua.user_id
  ), equipped_items as (
    select ue.user_id,
      max(ue.item_id) filter (where ue.slot = 'profile_border') as border_item_id,
      max(ue.item_id) filter (where ue.slot = 'profile_accent') as badge_item_id,
      max(ue.item_id) filter (where ue.slot = 'profile_picture') as avatar_item_id
    from public.user_equipped ue group by ue.user_id
  ), scored as (
    select p.user_id, coalesce(p.display_name, '') as display_name, p.xp,
      (floor(p.xp::numeric / 250)::integer + 1) as level,
      coalesce(ac.achievement_count, 0::bigint) as achievement_count,
      ((floor(p.xp::numeric / 250)::integer + 1)::bigint * coalesce(ac.achievement_count, 0::bigint)) as rank_value,
      ei.border_item_id, ei.badge_item_id, ei.avatar_item_id
    from public.profiles p
    left join achievement_counts ac on ac.user_id = p.user_id
    left join equipped_items ei on ei.user_id = p.user_id
  ), ranked as (
    select scored.*, row_number() over (order by scored.rank_value desc, scored.xp desc, scored.user_id asc)::bigint as rank
    from scored
  )
  select ranked.user_id, ranked.display_name, ranked.xp, ranked.level,
    ranked.achievement_count, ranked.rank_value, ranked.rank,
    ranked.border_item_id, ranked.badge_item_id, ranked.avatar_item_id
  from ranked where ranked.user_id = v_actor;
end;
$function$;

-- Raw reward/balance primitives are owner-only. Authenticated clients use domain commands.
revoke all on function public.increment_xp(integer) from public, anon, authenticated;
revoke all on function public.add_tokens(integer) from public, anon, authenticated;
revoke all on function public.spend_tokens(integer) from public, anon, authenticated;

revoke all on function public.record_card_review(uuid, uuid, text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.complete_study_session(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.purchase_item(text, uuid) from public, anon, authenticated;
revoke all on function public.equip_item(text) from public, anon, authenticated;
revoke all on function public.get_leaderboard(integer) from public, anon, authenticated;
revoke all on function public.get_current_user_rank() from public, anon, authenticated;
grant execute on function public.record_card_review(uuid, uuid, text, text, integer, integer, jsonb) to authenticated;
grant execute on function public.complete_study_session(uuid, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.purchase_item(text, uuid) to authenticated;
grant execute on function public.equip_item(text) to authenticated;
grant execute on function public.get_leaderboard(integer) to authenticated;
grant execute on function public.get_current_user_rank() to authenticated;
