---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Phase 7 UI-SPEC approved
last_updated: "2026-06-25T02:08:38.139Z"
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 50
---

# STATE — 1000 Words

> Reconstructed from artifacts on 2026-06-23 (STATE.md was absent)

## Project Reference

**What This Is**: A spaced-repetition language-learning app with FSRS scheduling, XP/Token economy, achievement system, cosmetics shop, and leaderboard.

**Core Value**: The progression loop must close — studying → XP → level → achievements unlock shop items → items visibly customize profile.

## Current Position

**Milestone**: Milestone 2 — Progression Loop (Achievements, Tokens, Shop, Leaderboard)

**Phase**: In progress — no formal GSD phase structure; using .agent_notes/ workflow

**Status**: WORKING — uncommitted in-progress changes on main branch

## Recent Decisions

| Decision | Outcome |
|----------|---------|
| Phases 0-6 (Lane A→B integration) | ✅ Committed via PR #20 + #21 |
| Token balance on profiles table (not separate wallet) | Implemented — migration 20260623000000_add_tokens.sql |
| Achievement unlock check client-side via pure achievementEngine.ts | Implemented — pure function, no I/O |
| Achievement prerequisite chaining via data (prerequisiteId field) | Implemented in engine |
| Leaderboard uses SECURITY DEFINER RPCs (get_leaderboard, get_current_user_rank) for cross-user aggregation | Implemented — plan 07-01 |
| Level formula FLOOR(xp/250)+1 consistent in SQL and TypeScript mock | Established in plan 07-01 |
| rank=-1 sentinel for getCurrentUserEntry when user is outside top-N window | Established in plan 07-01 |
| D-08: No NavBar tab for /leaderboard — route registered only in router.ts | Established in plan 07-02 |
| D-09: getParentRoute('/leaderboard') returns '/dashboard' enabling back-button | Established in plan 07-02 |

## In-Progress Work (Uncommitted)

- `achievementEngine.ts` — new pure achievement evaluation engine
- `supabase/migrations/20260623000000_add_tokens.sql` — tokens column + add_tokens/spend_tokens SQL functions
- `data/types.ts` — `tokens` field on AppProfile, `addTokens`/`spendTokens` on ProfileRepository
- `data/profile/supabaseProfileRepository.ts` — addTokens/spendTokens implementations
- `data/profile/mockProfileRepository.ts` — mock addTokens/spendTokens
- `data/account/schema.ts` — schema updates
- `data/account/mock/demo-account-data.json` — demo data updates
- `features/achievements/AchievementsGallery.tsx` — wired to real data, locked/unlocked states
- `features/achievements/AchievementDetail.tsx` — progress, criteria, rarity detail
- `features/lessons/StudySession.tsx` — achievement check integration

## Pending Todos

- [ ] Shop items show lock state (blurred + lock icon) when unlock achievement not met
- [ ] Token balance visible in UI; items purchasable with Tokens
- [ ] Equipped cosmetics (frame, badge, avatar) displayed on ProfileOverview
- [ ] Equipped cosmetics displayed during study session
- [ ] Leaderboard page with ranking formula Level × Achievements = RankValue
- [ ] Leaderboard backed by Supabase
- [ ] placeholder.svg path correction in LoginPage.tsx (src="/placeholder.svg" → /assets/images/placeholder.svg)
- [ ] Initial curated achievement set with milestone names that unlock shop item chunks

## Session Continuity

Last session: 2026-06-25T02:08:38.132Z
Stopped at: Completed 07-02-PLAN.md — router wiring and App.tsx integration for /leaderboard
Resume file: .planning/phases/07-leaderboard/07-03-PLAN.md

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 07 P01 | 4m | 3 tasks | 5 files |
| Phase 07 P02 | 3m | 2 tasks | 3 files |
