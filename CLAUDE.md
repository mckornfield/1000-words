# 1000 Words — Claude Agent Guide

## Project Overview

Spaced-repetition language-learning app. Users study vocabulary flashcards ordered by the FSRS algorithm, earn XP, unlock achievements, and customize their profile via a cosmetics store.

**Monorepo** (`pnpm` workspaces):
| Package | Path | Role |
|---------|------|------|
| `@1000words/app` | `packages/app` | React 19 + Vite + Tailwind v4 frontend (Capacitor shell for iOS/Android) |
| `@1000words/engine` | `packages/engine` | Pure TypeScript FSRS scheduler — `buildSession`, `scheduleReview`, `initialState` |
| `@1000words/content` | `packages/content` | Word data pipeline + JSON assets bundled into app |

---

## Development Commands

```bash
pnpm dev              # start Vite dev server on :8080
pnpm review           # full quality gate: lint → typecheck → test → content-validate → build
pnpm -r build         # build all packages
pnpm --filter @1000words/app test   # unit tests only
```

`pnpm review` is the canonical CI check. Run it before declaring any task done.

---

## Key Architecture Facts

- **Demo mode** (`VITE_DEMO_LOGIN=true` or absent `.env`): uses in-memory/fixture repos, no Supabase calls.
- **Production mode** (`VITE_DEMO_LOGIN=false` + Supabase env vars set): uses Supabase repos.
- `appConfig.demoLoginEnabled` defaults `true` when `VITE_DEMO_LOGIN` is unset (safe for dev without Supabase).
- `App.tsx` is the composition root — selects repos and injects them via `AppContext.Provider`.
- `useAppContext()` is the hook for all components to reach repos.
- FSRS scheduling: `buildSession()` orders cards by due date on mount; `scheduleReview()` computes next state on each rating.
- XP writes use `increment_xp(uid, delta)` SQL function (atomic, avoids race conditions).
- All Supabase tables use `auth.uid() = user_id` RLS — users can only touch their own rows.

See `.agent_notes/` for deep-dive docs on each layer.

---

## Agent Notes Index

| File | Read when… |
|------|-----------|
| `.agent_notes/README.md` | Starting any session — phase status + quick reference |
| `.agent_notes/CurrentWork.md` | Checking active tasks or recent changes (`head -30` for quick glance) |
| `.agent_notes/architecture.md` | Understanding data flow or layer boundaries |
| `.agent_notes/supabase-integration.md` | Adding/modifying DB tables, auth, RLS, migrations, connection setup |
| `.agent_notes/repository-contracts.md` | Implementing or consuming any repository interface |
| `.agent_notes/phased-roadmap.md` | Understanding implementation order or adding a new phase |
| `.agent_notes/lane-b-frontend.md` | Frontend component map, file targets, demo vs prod |

---

## Planning Mode Protocol

When entering plan mode for a multi-step task:

1. **Write the plan to `.agent_notes/CurrentWork.md`** under `## Active Task`. Include subtasks, file targets, and order.
2. **Mark subtasks complete** inline as they finish (`- [x]`).
3. **On task completion**: move a one-line summary into the `-RecentChanges-` block at the top of `CurrentWork.md`, then clear `## Active Task`.
4. The `-RecentChanges-` block must stay at the top so `head -30 .agent_notes/CurrentWork.md` gives a quick diff of what changed recently without reading the full file.

---

## Key File Locations

```
packages/app/src/
  App.tsx                          ← composition root; repo injection; AppContext.Provider
  config/appConfig.ts              ← VITE_* env var parsing; demoLoginEnabled default = true
  lib/supabase.ts                  ← Supabase singleton client (fallback URL prevents crash when .env absent)
  lib/auth.ts                      ← Supabase auth helpers (signIn/signOut/getSession/onAuthChange)
  data/
    types.ts                       ← ALL repository interfaces (single source of truth)
    AppContext.ts                   ← React context + useAppContext()
    progressStore.ts                ← FSRS card state CRUD (already fully implemented)
    progressStore.mock.ts           ← In-memory FSRS for demo mode
    auth/repository.ts              ← Demo auth (localStorage)
    auth/supabaseAuthRepository.ts  ← Production auth (wraps lib/auth.ts)
    profile/
      supabaseProfileRepository.ts
      mockProfileRepository.ts
    achievements/ inventory/ goals/ stats/
      (same pattern — supabase* + mock* per feature)
  features/
    lessons/StudySession.tsx        ← critical path: FSRS + XP + goal writes
    profile/StatsPage.tsx           ← weekly XP chart from review_logs
    profile/SettingsPage.tsx        ← settings persistence via profileRepo
    shop/ItemDetail.tsx             ← purchase + equip via inventoryRepo

supabase/migrations/
  20260607000000_init.sql                      ← profiles, card_progress, review_logs, RLS, trigger
  20260610000000_card_progress_learning_steps.sql ← adds learning_steps column
  20260622000000_user_state_tables.sql         ← achievements, inventory, equipped, daily_goals, increment_xp

scripts/review.sh                  ← sequential lint→typecheck→test→content-validate→build
.claude/agents/rls-reviewer.md     ← LLM sub-agent for RLS policy audit
.claude/skills/automated-reviewer/ ← orchestrator skill (script + rls-reviewer)
```

---

## Adding a New DB Feature (checklist)

1. `supabase/migrations/<timestamp>_<name>.sql` — table + RLS policies
2. `data/types.ts` — add interface + add to `AppContextValue`
3. `data/<feature>/supabase<Feature>Repository.ts` — Supabase impl
4. `data/<feature>/mock<Feature>Repository.ts` — in-memory impl for demo mode
5. `App.tsx` — inject in both `isDemo` and production branches of `appContextValue` useMemo
6. Component — consume via `useAppContext()`
7. `pnpm review` — must pass before declaring done
