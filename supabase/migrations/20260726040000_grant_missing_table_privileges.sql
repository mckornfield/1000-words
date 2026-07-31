-- The secure-domain-boundary migrations narrowed authenticated's direct table
-- access to specific safe columns/tables, but never granted the base SELECT
-- privilege the client needs to read its own rows. RLS policies restrict
-- *which* rows are visible; they do not substitute for the underlying GRANT,
-- so reads that were meant to keep working (profile settings, card progress,
-- review history, achievements, inventory, equipped items, daily goals) were
-- silently broken for every authenticated user.
--
-- service_role was never granted anything on these tables either. BYPASSRLS
-- skips row-level policy checks but not the base table privilege check, so
-- admin/service-role access (test seeding, support tooling) had no table
-- privileges to fall back on.

grant select on table
  public.profiles,
  public.card_progress,
  public.review_logs,
  public.user_achievements,
  public.user_inventory,
  public.user_equipped,
  public.user_daily_goals
to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.card_progress,
  public.review_logs,
  public.user_achievements,
  public.user_inventory,
  public.user_equipped,
  public.user_daily_goals,
  public.study_sessions,
  public.user_learning_totals,
  public.purchase_requests
to service_role;
