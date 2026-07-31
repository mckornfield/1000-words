# 1000 Words — Agent Guide

## Source of Truth

Read [`.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`](./.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md) before planning or changing the repository. That roadmap is the single source of truth for active status; `.planning/in-work/README.md` is navigation only. `docs/PLAN.md` and `.planning/codebase/*.md` provide reconciled context, not competing task trackers.

## Project Overview

1000 Words is a React 19 + Vite vocabulary app. Users study FSRS-ordered cards, hear bundled audio, optionally practice pronunciation, earn progression rewards, and use achievements, cosmetics, objectives, and leaderboards. The registered decks are `en-es`, `en-zh`, `en-ko`, and `en-ja`.

| Package | Path | Role |
|---|---|---|
| `@1000words/app` | `packages/app` | React/Tailwind frontend, custom router, repositories, Supabase integration, Capacitor shell |
| `@1000words/engine` | `packages/engine` | Pure TypeScript FSRS scheduler and session builder |
| `@1000words/content` | `packages/content` | Card schema, four language decks, generation/validation/sync tooling |

## Commands

```bash
pnpm dev
pnpm --filter @1000words/app test
pnpm --filter @1000words/app typecheck
pnpm e2e
pnpm review
```

`pnpm review` is the repository-wide quality gate. Supabase smoke/RLS tests additionally require a configured local stack.

## Verification Evidence

- Historical checkpoint (2026-07-26, superseded): 52 focused app tests passed and 4 local-Supabase tests skipped because the stack/CLI was unavailable.
- Current local baseline (2026-07-26): 139 passed and 16 conditional local-Supabase tests skipped because a configured local Supabase stack was unavailable.
- App typecheck passed. Consult the active Lane B roadmap for current release-gate evidence.

Do not turn “Supabase adapters/migrations exist” or conditionally skipped tests into “Supabase was verified end to end.” The current 139/16 result is local evidence only and does not claim live or hosted Supabase verification.

## Architecture Rules

- `App.tsx` is the composition root and injects repository contracts through `AppContext`.
- Demo mode must not make Supabase calls.
- Production mode uses Supabase auth/repository implementations when configured.
- Components consume interfaces through `useAppContext()`; do not import concrete repositories directly.
- `@1000words/engine` remains pure and I/O-free.
- Decks must pass the content Zod schema at the runtime loading boundary.
- Custom-router changes must preserve both `/` and `/1000-words/` base paths.
- One user action that changes several balances/records should use an atomic or explicitly idempotent backend contract.

## Key Locations

```text
packages/app/src/App.tsx                 composition root and route rendering
packages/app/src/config/appConfig.ts     runtime environment parsing
packages/app/src/lib/router.ts           base-aware route parsing/navigation
packages/app/src/lib/wordData.ts         validated deck loading and errors
packages/app/src/lib/speechRecognition.ts web/native speech abstraction
packages/app/src/data/types.ts           repository contracts
packages/app/src/data/AppContext.ts      repository injection hook
packages/app/src/features/lessons/       lesson list/detail and StudySession
packages/app/src/features/leaderboard/   leaderboard UI
packages/app/src/test/                   React test services/render helper
packages/content/data/                   en-es, en-zh, en-ko, en-ja JSON decks
e2e/                                    Playwright auth/study/persistence tests
supabase/migrations/                     schema, RLS, and RPC migrations
.planning/in-work/                       active plan and status
```

## Working Protocol

1. Audit code and tests before changing a roadmap checkbox.
2. Update status only in the active Lane B tracker; other docs may summarize and link to it.
3. Keep existing uncommitted work intact unless the task explicitly scopes it.
4. Add focused tests with behavior changes.
5. Report exact verification and any skipped/blocked gate.
6. Do not mark Slices 5+ complete without code plus verification.
