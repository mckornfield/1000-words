---
phase: 07-leaderboard
plan: "02"
subsystem: routing
status: complete
tags: [leaderboard, routing, react, app-wiring, typescript]
dependency_graph:
  requires:
    - 07-01 (LeaderboardRepository, supabaseLeaderboardRepository, mockLeaderboardRepository)
  provides:
    - /leaderboard in RoutePath union (router.ts)
    - parseRoute() handler for /leaderboard
    - getParentRoute(/leaderboard) returns /dashboard
    - getRouteBreadcrumbLabel(/leaderboard) returns "Leaderboard"
    - LeaderboardPage stub at packages/app/src/features/leaderboard/LeaderboardPage.tsx
    - App.tsx renderPage() case for /leaderboard
  affects:
    - packages/app/src/lib/router.ts
    - packages/app/src/App.tsx
    - packages/app/src/features/leaderboard/LeaderboardPage.tsx (created)
tech_stack:
  added: []
  patterns:
    - RoutePath union extension pattern
    - parseRoute() if-block pattern
    - getParentRoute() explicit case before dashboard null-return
    - Stub component pattern (replaced by plan 07-03)
key_files:
  created:
    - packages/app/src/features/leaderboard/LeaderboardPage.tsx
  modified:
    - packages/app/src/lib/router.ts
    - packages/app/src/App.tsx
decisions:
  - "D-08: No NavBar tab added for /leaderboard — route registered only in router.ts"
  - "D-09: getParentRoute('/leaderboard') returns '/dashboard' enabling back-button"
  - "Stub LeaderboardPage.tsx created with minimal export to allow App.tsx to compile ahead of plan 03"
metrics:
  duration: "3m"
  completed: "2026-06-25T01:59:40Z"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 07 Plan 02: Router Wiring and App.tsx Integration Summary

## One-liner

/leaderboard route registered in RoutePath union with parseRoute, getParentRoute (/dashboard), and breadcrumb label; App.tsx wired with LeaderboardPage import, stub component, and renderPage case.

## What Was Built

### Task 1: router.ts — /leaderboard Route Registration

Four targeted edits to `packages/app/src/lib/router.ts`:

1. **JSDoc comment**: Added `- /leaderboard (leaderboard rankings)` to the supported route patterns list.
2. **RoutePath union**: Added `| "/leaderboard"` after `/objectives/:objectiveId`.
3. **parseRoute()**: Added `if (segments[0] === "leaderboard")` block before the "Unrecognized path" fallback, returning `{ path: "/leaderboard", params: {} }`.
4. **getParentRoute()**: Added `if (currentRoute === "/leaderboard") return "/dashboard"` before the `currentRoute === "/dashboard"` null-return case.
5. **getRouteBreadcrumbLabel()**: Added `case "/leaderboard": return "Leaderboard"` in the switch statement.

NavBar.tsx was NOT modified — per D-08, leaderboard has no bottom nav tab.

### Task 2: App.tsx + Stub LeaderboardPage

**Stub component** created at `packages/app/src/features/leaderboard/LeaderboardPage.tsx`:
```tsx
// Stub — replaced by plan 07-03
export function LeaderboardPage(_props: { dashboardData: unknown }) {
  return null;
}
```

**App.tsx additions** (plan 01 had already added repo imports and injections):
- Added `import { LeaderboardPage } from "./features/leaderboard/LeaderboardPage"` after the ObjectivesHub import.
- Added `case "/leaderboard": return <LeaderboardPage dashboardData={data} />` in `renderPage()` before the default case.

Note: `createSupabaseLeaderboardRepository` and `createMockLeaderboardRepository` imports were already present from plan 01's deviation fix. Both `leaderboardRepo` injections in the isDemo and production branches of `appContextValue` were also already wired by plan 01.

## Verification Evidence

```
TypeScript (tsc --noEmit): PASS (0 errors)
router.ts "/leaderboard" occurrences: 4 (union + parseRoute + getParentRoute + breadcrumb)
leaderboardRepo in App.tsx: 2 (isDemo branch + production branch)
LeaderboardPage in App.tsx: 2 (import + renderPage case)
pnpm review: all 5 checks pass (lint, typecheck, unit-tests, content-validate, app-build)
```

## Deviations from Plan

### Scope Adjustment (not a deviation — expected)

The plan note stated "leaderboardRepo is injected into AppContextValue in both isDemo and production branches" as a must-have for this plan. Plan 01 had already performed this wiring as a Rule 3 fix (to satisfy TypeScript compile). This plan verified the wiring was correct and did not re-apply it — only the LeaderboardPage import and renderPage case were added to App.tsx in this plan.

No other deviations — plan executed as described.

## Known Stubs

**`packages/app/src/features/leaderboard/LeaderboardPage.tsx`** (line 2): Exports a no-op component returning `null`. This is an intentional stub pending plan 07-03, which will replace it with the full implementation. The stub does not block the plan's goal (route registration + App.tsx wiring). Plan 03 is the designated resolver.

## Threat Surface Scan

No new threat surface beyond what the plan's `<threat_model>` already covers:
- T-07-05: /leaderboard route requires auth via `requiresAuth()` which returns `true` for all non-login routes (verified in router.ts line 171-173).
- T-07-06: `leaderboardRepo` injection is derived from `isDemo` env var at build time; no user input can alter repo selection.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `2beabcb` | feat(07-02): add /leaderboard to RoutePath union, parseRoute, getParentRoute, and breadcrumb label |
| 2 | `58d7160` | feat(07-02): import LeaderboardPage, add renderPage case for /leaderboard, create stub component |

## Self-Check: PASSED

- [x] `packages/app/src/lib/router.ts` contains `"/leaderboard"` (4 occurrences: union, parseRoute, getParentRoute, breadcrumb)
- [x] `packages/app/src/features/leaderboard/LeaderboardPage.tsx` exists as stub
- [x] `packages/app/src/App.tsx` contains `LeaderboardPage` (2: import + renderPage case)
- [x] `packages/app/src/App.tsx` contains `leaderboardRepo` (2: isDemo + prod branches, wired in plan 01)
- [x] Both task commits present in git log (`2beabcb`, `58d7160`)
- [x] `pnpm review` passes all 5 checks
