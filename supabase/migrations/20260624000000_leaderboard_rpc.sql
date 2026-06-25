-- Leaderboard RPC. SECURITY DEFINER allows cross-user aggregation without
-- widening RLS on base tables. Both functions execute as the table owner,
-- bypassing per-user RLS policies that would otherwise prevent reading
-- other users' profiles, achievements, and equipped cosmetics.
--
-- No new RLS SELECT policies are added — the SECURITY DEFINER pattern is
-- the explicit mechanism for controlled cross-user reads. See STRIDE threat
-- register T-07-01 and T-07-04 for disposition details.

-- ----------------------------------------------------------------------------
-- get_leaderboard(n): return top-n users ranked by Level × AchievementCount.
-- Calling with n > 100 is silently clamped to 100 via LEAST().
-- ----------------------------------------------------------------------------
create or replace function public.get_leaderboard(n integer default 50)
returns table (
  user_id           uuid,
  display_name      text,
  xp                integer,
  level             integer,
  achievement_count bigint,
  rank_value        bigint,
  border_item_id    text,
  badge_item_id     text,
  avatar_item_id    text
)
language sql
security definer
set search_path = ''
as $$
  select
    p.user_id,
    p.display_name,
    p.xp,
    (floor(p.xp::float / 250)::int + 1)                                  as level,
    count(ua.achievement_id)                                               as achievement_count,
    (floor(p.xp::float / 250)::int + 1) * count(ua.achievement_id)       as rank_value,
    max(case when ue.slot = 'profile_border'  then ue.item_id end)        as border_item_id,
    max(case when ue.slot = 'profile_accent'  then ue.item_id end)        as badge_item_id,
    max(case when ue.slot = 'profile_picture' then ue.item_id end)        as avatar_item_id
  from public.profiles p
    left join public.user_achievements ua on ua.user_id = p.user_id
    left join public.user_equipped     ue on ue.user_id = p.user_id
  group by p.user_id, p.display_name, p.xp
  order by rank_value desc, p.xp desc
  limit least(n, 100)
$$;

grant execute on function public.get_leaderboard(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- get_current_user_rank(uid): return the full stat row for a single user.
-- Used to pin the calling user's entry even when they fall outside top 50.
-- rank is assigned client-side (-1 sentinel) when outside the top window.
-- Same SECURITY DEFINER / search_path pattern as get_leaderboard.
-- ----------------------------------------------------------------------------
create or replace function public.get_current_user_rank(uid uuid)
returns table (
  user_id           uuid,
  display_name      text,
  xp                integer,
  level             integer,
  achievement_count bigint,
  rank_value        bigint,
  border_item_id    text,
  badge_item_id     text,
  avatar_item_id    text
)
language sql
security definer
set search_path = ''
as $$
  select
    p.user_id,
    p.display_name,
    p.xp,
    (floor(p.xp::float / 250)::int + 1)                                  as level,
    count(ua.achievement_id)                                               as achievement_count,
    (floor(p.xp::float / 250)::int + 1) * count(ua.achievement_id)       as rank_value,
    max(case when ue.slot = 'profile_border'  then ue.item_id end)        as border_item_id,
    max(case when ue.slot = 'profile_accent'  then ue.item_id end)        as badge_item_id,
    max(case when ue.slot = 'profile_picture' then ue.item_id end)        as avatar_item_id
  from public.profiles p
    left join public.user_achievements ua on ua.user_id = p.user_id
    left join public.user_equipped     ue on ue.user_id = p.user_id
  where p.user_id = uid
  group by p.user_id, p.display_name, p.xp
$$;

grant execute on function public.get_current_user_rank(uuid) to authenticated;
