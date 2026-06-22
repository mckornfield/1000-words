-- User state tables for achievements, shop inventory, equipped cosmetics,
-- and daily goal progress. Static definitions (achievement catalog, store
-- item catalog) live in client code; only per-user state lives here.

-- ----------------------------------------------------------------------------
-- user_achievements: which achievements a user has earned.
-- ----------------------------------------------------------------------------
create table public.user_achievements (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  achievement_id text        not null,
  earned_at      timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy ua_select_own on public.user_achievements
  for select using (auth.uid() = user_id);
create policy ua_insert_own on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- user_inventory: purchased cosmetic items.
-- ----------------------------------------------------------------------------
create table public.user_inventory (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  item_id      text        not null,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.user_inventory enable row level security;

create policy inv_select_own on public.user_inventory
  for select using (auth.uid() = user_id);
create policy inv_insert_own on public.user_inventory
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- user_equipped: one equipped item per cosmetic slot.
-- Slot values: 'profile_picture' | 'profile_border' | 'profile_accent'
-- ----------------------------------------------------------------------------
create table public.user_equipped (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  slot       text        not null,
  item_id    text        not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.user_equipped enable row level security;

create policy eq_select_own on public.user_equipped
  for select using (auth.uid() = user_id);
create policy eq_insert_own on public.user_equipped
  for insert with check (auth.uid() = user_id);
create policy eq_update_own on public.user_equipped
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- user_daily_goals: per-day goal progress.
-- One row per (user, date, goal_type). Naturally resets each calendar day
-- because new rows are inserted for each new date.
-- goal_type values: 'cards_reviewed' | 'minutes_studied' | 'lessons_completed'
-- ----------------------------------------------------------------------------
create table public.user_daily_goals (
  user_id    uuid    not null references auth.users (id) on delete cascade,
  goal_date  date    not null default current_date,
  goal_type  text    not null,
  target     integer not null,
  current    integer not null default 0,
  primary key (user_id, goal_date, goal_type)
);

alter table public.user_daily_goals enable row level security;

create policy dg_select_own on public.user_daily_goals
  for select using (auth.uid() = user_id);
create policy dg_insert_own on public.user_daily_goals
  for insert with check (auth.uid() = user_id);
create policy dg_update_own on public.user_daily_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- increment_xp: atomic XP addition to avoid race conditions when concurrent
-- study sessions complete at the same time.
-- ----------------------------------------------------------------------------
create or replace function public.increment_xp(uid uuid, delta integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set xp = xp + delta where user_id = uid;
$$;
