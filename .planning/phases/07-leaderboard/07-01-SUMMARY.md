---
phase: 07-leaderboard
plan: "01"
subsystem: data-layer
status: complete
tags: [leaderboard, supabase-rpc, security-definer, repository-pattern, typescript]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/20260624000000_leaderboard_rpc.sql
    - packages/app/src/data/leaderboard/supabaseLeaderboardRepository.ts
    - packages/app/src/data/leaderboard/mockLeaderboardRepository.ts
    - LeaderboardEntry and LeaderboardRepository interfaces in data/types.ts
  affects:
    - packages/app/src/App.tsx (leaderboardRepo injected)
    - packages/app/src/data/types.ts (AppContextValue extended)
tech_stack:
  added:
    - SQL SECURITY DEFINER RPC function for cross-user aggregation
  patterns:
    - supabase*Repository + mock*Repository factory pattern
    - get_leaderboard / get_current_user_rank Supabase RPC
    - level = FLOOR(xp/250)+1 (consistent in SQL and TypeScript)
key_files:
  created:
    - supabase/migrations/20260624000000_leaderboard_rpc.sql
    - packages/app/src/data/leaderboard/supabaseLeaderboardRepository.ts
    - packages/app/src/data/leaderboard/mockLeaderboardRepository.ts
  modified:
    - packages/app/src/data/types.ts
    - packages/app/src/App.tsx
decisions:
  - "SECURITY DEFINER with set search_path='' matches increment_xp pattern from migration 20260622"
  - "LEAST(n, 100) caps leaderboard size at DB level — no JS enforcement needed"
  - "rank=-1 sentinel for getCurrentUserEntry when user is outside top-N window"
  - "App.tsx leaderboard wiring done in plan 01 (not plan 02) to fix TypeScript compile"
metrics:
  duration: "4m"
  completed: "2026-06-25T01:51:36Z"
  tasks_completed: 3
  files_created: 3
  files_modified: 2
---

# Phase 07 Plan 01: Leaderboard Data Layer Summary

## One-liner

Leaderboard data layer: SECURITY DEFINER SQL RPC computing `level*achievementCount` rank, TypeScript interfaces, and Supabase + mock repository factories with 12-entry fixture.

## What Was Built

### Task 1: SQL Migration — `supabase/migrations/20260624000000_leaderboard_rpc.sql`

Two SQL functions using the `SECURITY DEFINER / set search_path = ''` pattern established by `increment_xp`:

- **`get_leaderboard(n integer default 50)`** — returns up to LEAST(n, 100) rows ordered by `rank_value DESC, xp DESC`. Computes `level = FLOOR(xp::float / 250)::int + 1`, `achievement_count = COUNT(ua.achievement_id)`, `rank_value = level * achievement_count`. Pivots equipped cosmetic slots via `MAX(CASE WHEN ue.slot = ...)`.
- **`get_current_user_rank(uid uuid)`** — same computation with a `WHERE p.user_id = uid` filter and no LIMIT. Used to pin the calling user's entry when they fall outside top-50.
- Both functions: `grant execute ... to authenticated`.

### Task 2: TypeScript Interfaces — `packages/app/src/data/types.ts`

Added after the StatsRepository section:

- **`LeaderboardEntry`** (11 fields): `userId`, `displayName`, `xp`, `level`, `achievementCount`, `rankValue`, `rank`, `equippedBorderId`, `equippedBadgeId`, `equippedAvatarId`.
- **`LeaderboardRepository`**: `getTopN(n): Promise<LeaderboardEntry[]>`, `getCurrentUserEntry(userId): Promise<LeaderboardEntry | null>`.
- **`AppContextValue.leaderboardRepo: LeaderboardRepository`** added.

### Task 3: Repository Implementations

**`supabaseLeaderboardRepository.ts`**:
- `getTopN(n)` calls `supabase.rpc("get_leaderboard", { n })`, maps snake_case rows to camelCase `LeaderboardEntry`, assigns rank as `index + 1`.
- `getCurrentUserEntry(userId)` calls `supabase.rpc("get_current_user_rank", { uid: userId })`, assigns `rank = -1` as sentinel (user outside top-N; UI shows "You" without number).

**`mockLeaderboardRepository.ts`**:
- `xpToLevel(xp) = Math.floor(xp / 250) + 1` — identical formula to SQL.
- 12 fixture entries with multilingual names (Yuki Tanaka, Amara Osei, Priya Sharma, Fatima Al-Hassan, Lena Müller, Omar Diallo, Hana Kim, Nguyen Van An, Sofia Rossi, Ivan Petrov, Carlos Mendez + demo user).
- Demo user: `userId = currentUserId`, `xp = 2840`, `level = 12`, `achievementCount = 2`, `rankValue = 24`, placed at rank 6.
- Fixture sorted by `rankValue DESC, xp DESC` before rank assignment.

## Verification Evidence

```
TypeScript:    PASS (0 errors)
security definer count in migration: 2 (one per function)
get_current_user_rank in migration:  3 occurrences
createSupabaseLeaderboardRepository exported: 1
createMockLeaderboardRepository exported:     1
leaderboardRepo in types.ts:                  1
pnpm review: all checks pass (lint, typecheck, test, content-validate, build)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wired leaderboardRepo in App.tsx in plan 01 instead of plan 02**

- **Found during:** Task 2
- **Issue:** Adding `leaderboardRepo: LeaderboardRepository` to `AppContextValue` immediately caused TypeScript errors in `App.tsx` (property missing in both demo and production `useMemo` branches). The plan says App.tsx wiring is in plan 02, but leaving it would fail `tsc --noEmit` — the Task 2 done criteria.
- **Fix:** Added imports for both factory functions and injected `leaderboardRepo` into both branches of `appContextValue` in `App.tsx`.
- **Files modified:** `packages/app/src/App.tsx`
- **Commit:** `a0e9c69`

No other deviations — plan executed as written for all other aspects.

## Known Stubs

None. The mock repository returns fully-wired fixture data with all fields populated. No placeholder text or empty-data stubs present.

## Threat Surface Scan

No new threat surface beyond what the plan's `<threat_model>` already covers. The SQL functions are read-only (`language sql` — implicitly `STABLE`/read-only semantics), return only the columns listed in the STRIDE register, and use `set search_path = ''` to prevent search-path injection.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `3bda398` | feat(07-01): add leaderboard SQL migration with get_leaderboard and get_current_user_rank RPCs |
| 2 | `a0e9c69` | feat(07-01): add LeaderboardEntry, LeaderboardRepository types and wire into AppContextValue |
| 3 | `3b5e120` | feat(07-01): implement supabaseLeaderboardRepository and mockLeaderboardRepository |

## Self-Check: PASSED

- [x] `supabase/migrations/20260624000000_leaderboard_rpc.sql` exists with 2 SECURITY DEFINER functions
- [x] `packages/app/src/data/leaderboard/supabaseLeaderboardRepository.ts` exists, exports `createSupabaseLeaderboardRepository`
- [x] `packages/app/src/data/leaderboard/mockLeaderboardRepository.ts` exists, exports `createMockLeaderboardRepository`, 12 entries, demo user xp=2840
- [x] `packages/app/src/data/types.ts` contains `LeaderboardRepository` (2 occurrences), `LeaderboardEntry` (11 fields), `leaderboardRepo` on `AppContextValue`
- [x] All 3 task commits present in git log
- [x] `pnpm review` passes all 5 checks
