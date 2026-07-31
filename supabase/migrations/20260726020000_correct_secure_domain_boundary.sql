-- Corrective hardening for the secure study/profile domain boundary.
-- This migration is additive and intentionally does not reset legacy XP, token,
-- achievement, inventory, or other economy state.

-- Canonical settings are required at the database boundary. Existing rows from
-- the original '{}' default are upgraded without touching economy state.
alter table public.profiles alter column settings set default
  '{"themePreference":"system","dailyGoalMinutes":15,"autoAdvance":false,"notifications":{"streak":true,"goalComplete":true,"xpMilestone":false}}'::jsonb;

update public.profiles
set settings = '{"themePreference":"system","dailyGoalMinutes":15,"autoAdvance":false,"notifications":{"streak":true,"goalComplete":true,"xpMilestone":false}}'::jsonb
where settings = '{}'::jsonb;

create or replace function public.validate_profile_secure_fields()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.display_name is not null and (
    pg_catalog.char_length(new.display_name) > 120
    or new.display_name ~ '[[:cntrl:]]'
  ) then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;

  if new.bio is null or pg_catalog.char_length(new.bio) > 500 or new.bio ~ '[[:cntrl:]]' then
    raise exception 'invalid_bio' using errcode = '22023';
  end if;

  if new.settings is null
    or pg_catalog.jsonb_typeof(new.settings) <> 'object'
    or not (new.settings ?& array['themePreference','dailyGoalMinutes','autoAdvance','notifications'])
    or new.settings - array['themePreference','dailyGoalMinutes','autoAdvance','notifications'] <> '{}'::jsonb
    or new.settings->>'themePreference' not in ('light','dark','system')
    or pg_catalog.jsonb_typeof(new.settings->'dailyGoalMinutes') <> 'number'
    or (new.settings->>'dailyGoalMinutes')::numeric <> pg_catalog.trunc((new.settings->>'dailyGoalMinutes')::numeric)
    or (new.settings->>'dailyGoalMinutes')::integer not in (5,10,15,20,30)
    or pg_catalog.jsonb_typeof(new.settings->'autoAdvance') <> 'boolean'
    or pg_catalog.jsonb_typeof(new.settings->'notifications') <> 'object'
    or not (new.settings->'notifications' ?& array['streak','goalComplete','xpMilestone'])
    or (new.settings->'notifications') - array['streak','goalComplete','xpMilestone'] <> '{}'::jsonb
    or pg_catalog.jsonb_typeof(new.settings->'notifications'->'streak') <> 'boolean'
    or pg_catalog.jsonb_typeof(new.settings->'notifications'->'goalComplete') <> 'boolean'
    or pg_catalog.jsonb_typeof(new.settings->'notifications'->'xpMilestone') <> 'boolean'
  then
    raise exception 'invalid_settings' using errcode = '22023';
  end if;

  -- pg_timezone_names is the server catalog authority. Requiring UTC or a
  -- region-style name excludes ambiguous abbreviations such as CST/PST.
  if new.time_zone is null
    or pg_catalog.char_length(new.time_zone) > 64
    or (new.time_zone <> 'UTC' and new.time_zone !~ '^[A-Za-z][A-Za-z0-9_+.-]*/[A-Za-z0-9_+.-]+(?:/[A-Za-z0-9_+.-]+)*$')
    or not exists (
      select 1 from pg_catalog.pg_timezone_names zone where zone.name = new.time_zone
    )
  then
    raise exception 'invalid_time_zone' using errcode = '22023';
  end if;

  return new;
end;
$function$;

drop trigger if exists profiles_validate_time_zone on public.profiles;
drop trigger if exists profiles_validate_secure_fields on public.profiles;
create trigger profiles_validate_secure_fields
  before insert or update of display_name, bio, settings, time_zone on public.profiles
  for each row execute function public.validate_profile_secure_fields();

-- CHECK constraints document and enforce the non-catalog portions even when a
-- future table owner bypasses the trigger. Invalid legacy custom settings make
-- this migration fail loudly rather than being silently discarded.
alter table public.profiles
  add constraint profiles_display_name_valid check (
    display_name is null or (
      pg_catalog.char_length(display_name) <= 120 and display_name !~ '[[:cntrl:]]'
    )
  ) not valid,
  add constraint profiles_bio_valid check (
    bio is not null and pg_catalog.char_length(bio) <= 500 and bio !~ '[[:cntrl:]]'
  ) not valid,
  add constraint profiles_settings_shape_valid check (
    pg_catalog.jsonb_typeof(settings) = 'object'
    and settings ?& array['themePreference','dailyGoalMinutes','autoAdvance','notifications']
    and settings - array['themePreference','dailyGoalMinutes','autoAdvance','notifications'] = '{}'::jsonb
    and settings->>'themePreference' in ('light','dark','system')
    and pg_catalog.jsonb_typeof(settings->'dailyGoalMinutes') = 'number'
    and (settings->>'dailyGoalMinutes')::numeric = pg_catalog.trunc((settings->>'dailyGoalMinutes')::numeric)
    and (settings->>'dailyGoalMinutes')::integer in (5,10,15,20,30)
    and pg_catalog.jsonb_typeof(settings->'autoAdvance') = 'boolean'
    and pg_catalog.jsonb_typeof(settings->'notifications') = 'object'
    and settings->'notifications' ?& array['streak','goalComplete','xpMilestone']
    and (settings->'notifications') - array['streak','goalComplete','xpMilestone'] = '{}'::jsonb
    and pg_catalog.jsonb_typeof(settings->'notifications'->'streak') = 'boolean'
    and pg_catalog.jsonb_typeof(settings->'notifications'->'goalComplete') = 'boolean'
    and pg_catalog.jsonb_typeof(settings->'notifications'->'xpMilestone') = 'boolean'
  ) not valid;

alter table public.profiles validate constraint profiles_display_name_valid;
alter table public.profiles validate constraint profiles_bio_valid;
alter table public.profiles validate constraint profiles_settings_shape_valid;

-- RLS decides which row; column privileges decide which profile fields may be
-- changed. The prior migration accidentally removed the UPDATE policy entirely.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
revoke update on table public.profiles from authenticated;
grant update (display_name, bio, settings, time_zone) on table public.profiles to authenticated;

alter table public.review_logs
  add column if not exists reward_eligible boolean not null default false;

-- A card may supply reward evidence at most once in a session. Failure here is
-- deliberate if the short-lived predecessor migration already accepted corrupt
-- duplicate evidence.
create unique index if not exists review_logs_user_session_card_key
  on public.review_logs (user_id, session_id, card_id)
  where session_id is not null;

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
  v_prior_progress public.card_progress%rowtype;
  v_expected_prefix text;
  v_card_number integer;
  v_rating_name text;
begin
  if v_actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_review_id is null or p_session_id is null then raise exception 'invalid_id' using errcode = '22023'; end if;
  if p_lang_pair is null or p_lang_pair not in ('en-es','en-zh','en-ko','en-ja') then
    raise exception 'invalid_lang_pair' using errcode = '22023';
  end if;

  v_expected_prefix := case p_lang_pair
    when 'en-es' then 'es' when 'en-zh' then 'zh'
    when 'en-ko' then 'ko' when 'en-ja' then 'ja'
  end;
  if p_card_id is null or p_card_id !~ '^(es|zh|ko|ja)-[0-9]{4}$'
    or pg_catalog.split_part(p_card_id, '-', 1) <> v_expected_prefix
  then raise exception 'invalid_card_id' using errcode = '22023'; end if;
  v_card_number := pg_catalog.substring(p_card_id, 4, 4)::integer;
  if v_card_number not between 1 and 1000 then
    raise exception 'invalid_card_id' using errcode = '22023';
  end if;

  if p_rating is null or p_rating not between 1 and 4 then raise exception 'invalid_rating' using errcode = '22023'; end if;
  if p_elapsed_ms is null or p_elapsed_ms < 250 or p_elapsed_ms > 300000 then
    raise exception 'invalid_elapsed_ms' using errcode = '22023';
  end if;
  if p_next_state is null or pg_catalog.jsonb_typeof(p_next_state) <> 'object'
    or not (p_next_state ?& array['due','stability','difficulty','elapsedDays','scheduledDays','learningSteps','reps','lapses','state','lastReview'])
    or p_next_state - array['due','stability','difficulty','elapsedDays','scheduledDays','learningSteps','reps','lapses','state','lastReview'] <> '{}'::jsonb
    or pg_catalog.jsonb_typeof(p_next_state->'due') <> 'string'
    or pg_catalog.jsonb_typeof(p_next_state->'stability') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'difficulty') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'elapsedDays') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'scheduledDays') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'learningSteps') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'reps') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'lapses') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'state') <> 'number'
    or pg_catalog.jsonb_typeof(p_next_state->'lastReview') not in ('string','null')
  then raise exception 'invalid_next_state' using errcode = '22023'; end if;

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

  -- Lock both idempotency domains. The review-ID lock prevents concurrent reuse
  -- across different sessions; the session lock serializes review/completion.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':review-id:' || p_review_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':session:' || p_session_id::text, 0));

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
    return pg_catalog.jsonb_build_object(
      'reviewId', v_existing.review_id, 'sessionId', v_existing.session_id,
      'cardId', v_existing.card_id, 'rating', v_rating_name,
      'reviewedAt', v_existing.reviewed_at, 'progress', v_existing.next_state,
      'replayed', true
    );
  end if;

  if exists (select 1 from public.study_sessions where user_id = v_actor and session_id = p_session_id) then
    raise exception 'session_completed' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.review_logs
    where user_id = v_actor and session_id = p_session_id and lang_pair is distinct from p_lang_pair
  ) then raise exception 'session_language_mismatch' using errcode = '22023'; end if;
  if exists (
    select 1 from public.review_logs
    where user_id = v_actor and session_id = p_session_id and card_id = p_card_id
  ) then raise exception 'duplicate_session_card' using errcode = '23505'; end if;
  if (select count(*) from public.review_logs where user_id = v_actor and session_id = p_session_id) >= 20 then
    raise exception 'session_review_limit' using errcode = '22023';
  end if;

  select * into v_prior_progress from public.card_progress
  where user_id = v_actor and card_id = p_card_id for update;
  if found then
    if v_prior_progress.lang_pair is distinct from p_lang_pair then
      raise exception 'card_language_mismatch' using errcode = '22023';
    end if;
    if v_prior_progress.due > v_now then
      raise exception 'card_not_due' using errcode = '22023';
    end if;
  end if;

  -- Scheduling state is still supplied for FSRS parity, but it may not make the
  -- same card immediately reward-eligible again or hide repeated reviews.
  if (p_next_state->>'due')::timestamptz <= v_now then
    raise exception 'next_state_due_not_future' using errcode = '22023';
  end if;
  if nullif(p_next_state->>'lastReview', '') is null
    or nullif(p_next_state->>'lastReview', '')::timestamptz < v_now - interval '5 minutes'
    or nullif(p_next_state->>'lastReview', '')::timestamptz > v_now + interval '5 minutes'
  then raise exception 'next_state_last_review_mismatch' using errcode = '22023'; end if;
  if (p_next_state->>'reps')::integer <> coalesce(v_prior_progress.reps, 0) + 1 then
    raise exception 'next_state_reps_mismatch' using errcode = '22023';
  end if;

  insert into public.review_logs (
    user_id, review_id, session_id, lang_pair, card_id, rating,
    reviewed_at, elapsed_ms, next_state, reward_eligible
  ) values (
    v_actor, p_review_id, p_session_id, p_lang_pair, p_card_id, p_rating,
    v_now, p_elapsed_ms, p_next_state, true
  );

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
  return pg_catalog.jsonb_build_object(
    'reviewId', p_review_id, 'sessionId', p_session_id, 'cardId', p_card_id,
    'rating', v_rating_name, 'reviewedAt', v_now, 'progress', p_next_state, 'replayed', false
  );
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
  v_distinct_cards integer;
  v_correct integer;
  v_duration_seconds integer;
  v_minutes integer;
  v_accuracy integer;
  v_review_xp integer;
  v_achievement_xp integer := 0;
  v_total_xp integer;
  v_evidence_valid boolean;
  v_first_review timestamptz;
  v_last_review timestamptz;
  v_daily_goal_minutes integer;
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
  if p_lang_pair is null or p_lang_pair not in ('en-es','en-zh','en-ko','en-ja') then
    raise exception 'invalid_lang_pair' using errcode = '22023';
  end if;

  -- Replay lookup intentionally precedes freshness validation. Exact retries
  -- remain idempotent after five minutes; changed payloads always conflict.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':session:' || p_session_id::text, 0));
  select * into v_prior from public.study_sessions
  where user_id = v_actor and session_id = p_session_id for update;
  if found then
    if v_prior.lang_pair is distinct from p_lang_pair
      or v_prior.requested_started_at is distinct from p_started_at
      or v_prior.requested_completed_at is distinct from p_completed_at
    then raise exception 'idempotency_conflict' using errcode = '23505'; end if;
    return pg_catalog.jsonb_set(v_prior.result, '{replayed}', 'true'::jsonb, true);
  end if;

  if p_started_at is null or p_completed_at is null or p_completed_at <= p_started_at
    or p_completed_at - p_started_at < interval '1 second'
    or p_completed_at - p_started_at > interval '4 hours'
    or p_completed_at < v_now - interval '5 minutes'
    or p_completed_at > v_now + interval '5 minutes'
  then raise exception 'invalid_session_duration' using errcode = '22023'; end if;

  select * into v_profile from public.profiles where user_id = v_actor for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  v_time_zone := v_profile.time_zone;
  if not exists (select 1 from pg_catalog.pg_timezone_names zone where zone.name = v_time_zone) then
    raise exception 'invalid_profile_time_zone' using errcode = '22023';
  end if;
  v_local_date := (p_completed_at at time zone v_time_zone)::date;
  v_local_hour := pg_catalog.date_part('hour', p_completed_at at time zone v_time_zone)::integer;
  v_daily_goal_minutes := (v_profile.settings->>'dailyGoalMinutes')::integer;

  select count(*)::integer,
    count(distinct card_id)::integer,
    count(*) filter (where rating in (3,4))::integer,
    coalesce(sum(elapsed_ms), 0)::integer / 1000,
    coalesce(sum(case rating when 1 then 0 when 2 then 5 when 3 then 10 when 4 then 15 end), 0)::integer,
    coalesce(bool_and(reward_eligible
      and review_id is not null
      and lang_pair = p_lang_pair
      and card_id ~ ('^' || case p_lang_pair when 'en-es' then 'es' when 'en-zh' then 'zh' when 'en-ko' then 'ko' when 'en-ja' then 'ja' end || '-[0-9]{4}$')
      and pg_catalog.substring(card_id, 4, 4)::integer between 1 and 1000
    ), false),
    min(reviewed_at), max(reviewed_at)
  into v_cards, v_distinct_cards, v_correct, v_duration_seconds, v_review_xp,
    v_evidence_valid, v_first_review, v_last_review
  from public.review_logs
  where user_id = v_actor and session_id = p_session_id;

  if v_cards < 1 or v_cards > 20 or v_distinct_cards <> v_cards or not v_evidence_valid then
    raise exception 'invalid_reward_evidence' using errcode = '22023';
  end if;
  if v_first_review < p_started_at - interval '1 minute'
    or v_last_review > p_completed_at + interval '1 minute'
    or v_duration_seconds > pg_catalog.ceil(pg_catalog.date_part('epoch', p_completed_at - p_started_at))::integer + 5
  then raise exception 'invalid_session_timing' using errcode = '22023'; end if;

  v_minutes := pg_catalog.floor(v_duration_seconds / 60.0)::integer;
  v_accuracy := pg_catalog.round((v_correct::numeric * 100) / v_cards)::integer;

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
      v_unlocked := v_unlocked || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
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
    (v_actor, v_local_date, 'minutes_studied', v_daily_goal_minutes, v_minutes),
    (v_actor, v_local_date, 'lessons_completed', 1, 1)
  on conflict (user_id, goal_date, goal_type) do update set
    current = public.user_daily_goals.current + excluded.current,
    target = excluded.target;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'goalType', goal_type, 'target', target, 'current', current, 'goalDate', goal_date
  ) order by goal_type), '[]'::jsonb) into v_goals
  from public.user_daily_goals where user_id = v_actor and goal_date = v_local_date;

  v_profile_json := pg_catalog.jsonb_build_object(
    'userId', v_profile.user_id, 'displayName', coalesce(v_profile.display_name, ''),
    'bio', v_profile.bio, 'xp', v_profile.xp, 'tokens', v_profile.tokens,
    'streakCount', v_profile.streak_count, 'lastActiveDate', v_profile.last_active_date,
    'createdAt', v_profile.created_at, 'timeZone', v_profile.time_zone,
    'settings', v_profile.settings
  );
  v_result := pg_catalog.jsonb_build_object(
    'sessionId', p_session_id, 'completedAt', p_completed_at, 'localStudyDate', v_local_date,
    'cardsReviewed', v_cards, 'durationSeconds', v_duration_seconds, 'accuracy', v_accuracy,
    'reviewXp', v_review_xp, 'achievementXp', v_achievement_xp, 'totalXpAwarded', v_total_xp,
    'profile', v_profile_json, 'goals', v_goals,
    'totals', pg_catalog.jsonb_build_object(
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

-- Preserve the domain boundary after CREATE OR REPLACE and retain exact grants.
revoke all on function public.increment_xp(integer) from public, anon, authenticated;
revoke all on function public.add_tokens(integer) from public, anon, authenticated;
revoke all on function public.spend_tokens(integer) from public, anon, authenticated;
revoke all on function public.record_card_review(uuid, uuid, text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.complete_study_session(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.record_card_review(uuid, uuid, text, text, integer, integer, jsonb) to authenticated;
grant execute on function public.complete_study_session(uuid, text, timestamptz, timestamptz) to authenticated;
revoke insert, update, delete on table public.review_logs from authenticated;
revoke insert, update, delete on table public.user_achievements from authenticated;
revoke insert, update, delete on table public.user_inventory from authenticated;
revoke insert, update, delete on table public.user_equipped from authenticated;

comment on column public.review_logs.reward_eligible is
  'True only for evidence accepted by the hardened record_card_review command; legacy/unverified rows cannot mint rewards.';
comment on column public.profiles.tokens is
  'Legacy economy balance preserved by this migration. A pre-release catalog/balance audit remains an operational gate; never reset balances in schema migration.';
