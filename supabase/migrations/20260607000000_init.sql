-- 1000 Words — initial schema.
--
-- Cards (the static 1000-word decks) are bundled in the app, NOT stored here.
-- Only per-user state lives in Postgres: profile, per-card scheduling state, and
-- an append-only review log. Every table is locked down with row-level security
-- so a user can only ever touch rows where user_id = auth.uid().

-- ----------------------------------------------------------------------------
-- profiles: one row per user, created automatically on signup (trigger below).
-- ----------------------------------------------------------------------------
create table public.profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  display_name     text,
  settings         jsonb       not null default '{}'::jsonb,
  streak_count     integer     not null default 0,
  xp               integer     not null default 0,
  last_active_date date,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- card_progress: FSRS scheduling state, one row per (user, card).
-- Mirrors the engine's FsrsState. card_id matches the bundled Card.id.
-- ----------------------------------------------------------------------------
create table public.card_progress (
  user_id        uuid             not null references auth.users (id) on delete cascade,
  card_id        text             not null,
  lang_pair      text             not null,
  due            timestamptz      not null,
  stability      double precision not null,
  difficulty     double precision not null,
  elapsed_days   double precision not null default 0,
  scheduled_days double precision not null default 0,
  reps           integer          not null default 0,
  lapses         integer          not null default 0,
  state          smallint         not null default 0,
  last_review    timestamptz,
  updated_at     timestamptz      not null default now(),
  primary key (user_id, card_id)
);

-- Fast "what's due for this deck right now" lookups.
create index card_progress_due_idx
  on public.card_progress (user_id, lang_pair, due);

-- ----------------------------------------------------------------------------
-- review_logs: append-only history. Powers stats now and FSRS optimization later.
-- ----------------------------------------------------------------------------
create table public.review_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  card_id     text        not null,
  rating      smallint    not null,
  reviewed_at timestamptz not null default now(),
  elapsed_ms  integer
);

create index review_logs_user_idx
  on public.review_logs (user_id, reviewed_at);

-- ----------------------------------------------------------------------------
-- Row-level security: users can only access their own rows.
-- ----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.card_progress enable row level security;
alter table public.review_logs   enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy card_progress_select_own on public.card_progress
  for select using (auth.uid() = user_id);
create policy card_progress_insert_own on public.card_progress
  for insert with check (auth.uid() = user_id);
create policy card_progress_update_own on public.card_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy card_progress_delete_own on public.card_progress
  for delete using (auth.uid() = user_id);

-- review_logs is append-only: select + insert own rows, no update/delete policy.
create policy review_logs_select_own on public.review_logs
  for select using (auth.uid() = user_id);
create policy review_logs_insert_own on public.review_logs
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Auto-provision a profile row whenever a new auth user signs up.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
