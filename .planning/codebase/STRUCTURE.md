# Codebase Structure
_Last updated: 2026-06-22_

## Summary

1000 Words is a pnpm monorepo. The frontend app lives entirely under `packages/app/src/`, split into `config/`, `lib/`, `data/`, and `features/` layers. The engine and content packages are pure TypeScript with no UI code. New feature work almost always touches `data/types.ts`, a new `data/<feature>/` directory, `App.tsx`, and one or more files under `features/`.

---

## Top-Level Directory Layout

```
1000-words/
├── packages/
│   ├── app/                    # React SPA (primary package)
│   ├── engine/                 # Pure FSRS scheduling algorithm
│   └── content/                # Word/card schema + static JSON assets
├── supabase/
│   └── migrations/             # SQL migration files (schema + RLS)
├── scripts/
│   └── review.sh               # CI quality gate script
├── .agent_notes/               # Human + agent documentation
├── .claude/
│   ├── agents/                 # LLM sub-agent definitions
│   └── skills/                 # Orchestrator skill definitions
├── .planning/
│   └── codebase/               # Codebase map documents (this directory)
├── docs/                       # Additional docs
├── package.json                # Workspace root (pnpm)
├── pnpm-workspace.yaml
└── CLAUDE.md                   # Agent guide (read first every session)
```

---

## Package Responsibilities

### `packages/app/` — React SPA

The entire user-facing application. Built with Vite, React 19, Tailwind v4, and optionally wrapped in a Capacitor shell for iOS/Android.

- Entry: `src/main.tsx` → `src/App.tsx`
- Test runner: Vitest (config in `packages/app/`)
- Key scripts: `pnpm dev` (port 8080), `pnpm review` (full CI gate)

### `packages/engine/` — FSRS Scheduler

Pure TypeScript. No runtime dependencies. Must not import from `app` or `content`.

- `src/types.ts` — `Rating`, `FsrsState`, `ProgressMap`
- `src/schedule.ts` — `initialState()`, `scheduleReview()`
- `src/session.ts` — `buildSession()`
- `src/index.ts` — public exports

### `packages/content/` — Word Data

Static word/card data pipeline. Exports TypeScript types and fixture data used by the app.

- `src/schema.ts` — `Card`, `CardDeck`, `LangPair` Zod schemas + types
- `src/index.ts` — public exports
- `data/` — compiled JSON card decks (consumed at runtime by `lib/wordData.ts`)
- `scripts/` — data pipeline scripts (build-time only)

---

## App Source Layout (`packages/app/src/`)

```
src/
├── main.tsx                    # Vite entry — mounts <App />
├── App.tsx                     # Composition root: auth, routing, repo injection
├── vite-env.d.ts               # Vite env type declarations
│
├── config/
│   └── appConfig.ts            # VITE_* env var parsing; demoLoginEnabled flag
│
├── lib/
│   ├── supabase.ts             # Supabase singleton client (with fallback URL)
│   ├── auth.ts                 # Low-level Supabase auth helpers
│   ├── router.ts               # Client-side routing (parseRoute, navigate, requiresAuth)
│   └── wordData.ts             # Loads JSON word assets for a lesson + langPair
│
├── data/
│   ├── types.ts                # ALL repository interfaces (single source of truth)
│   ├── AppContext.ts           # React context + useAppContext() hook
│   ├── progress.ts             # Re-exports ProgressStore interface + createProgressStore
│   ├── progressStore.ts        # Supabase ProgressStore implementation
│   ├── progressStore.mock.ts   # In-memory ProgressStore for demo mode
│   ├── cards.ts                # Card-related helpers
│   ├── lessonWords.ts          # Lesson → word mapping helpers
│   │
│   ├── account/
│   │   ├── repository.ts       # localAccountRepository — static fixture data (lessons, achievements, store)
│   │   └── schema.ts           # DashboardData shape
│   │
│   ├── auth/
│   │   ├── repository.ts       # Demo auth (localStorage-backed)
│   │   └── supabaseAuthRepository.ts  # Production auth (wraps lib/auth.ts)
│   │
│   ├── profile/
│   │   ├── mockProfileRepository.ts
│   │   └── supabaseProfileRepository.ts
│   │
│   ├── achievements/
│   │   ├── mockAchievementRepository.ts
│   │   └── supabaseAchievementRepository.ts
│   │
│   ├── inventory/
│   │   ├── mockInventoryRepository.ts
│   │   └── supabaseInventoryRepository.ts
│   │
│   ├── goals/
│   │   ├── mockDailyGoalRepository.ts
│   │   └── supabaseDailyGoalRepository.ts
│   │
│   └── stats/
│       ├── mockStatsRepository.ts
│       └── supabaseStatsRepository.ts
│
└── features/
    ├── shared/
    │   ├── NavBar.tsx           # Bottom navigation bar
    │   ├── Toast.tsx            # ToastProvider + useToast hook
    │   ├── Breadcrumb.tsx       # Back-navigation breadcrumb
    │   └── FallbackGlyph.tsx    # Placeholder image/icon
    │
    ├── login/
    │   └── LoginPage.tsx
    │
    ├── dashboard/
    │   └── DashboardPage.tsx
    │
    ├── lessons/
    │   ├── LessonsList.tsx      # Lesson catalog
    │   ├── LessonDetail.tsx     # Single lesson info + Start button
    │   └── StudySession.tsx     # CRITICAL PATH: FSRS loop, XP write, goal write
    │
    ├── achievements/
    │   ├── AchievementsGallery.tsx
    │   └── AchievementDetail.tsx
    │
    ├── shop/
    │   ├── ShopBrowse.tsx
    │   └── ItemDetail.tsx       # Purchase + equip via inventoryRepo
    │
    ├── profile/
    │   ├── ProfileOverview.tsx
    │   ├── StatsPage.tsx        # Weekly XP chart from statsRepo.getWeeklyXp
    │   ├── CustomizationPage.tsx
    │   └── SettingsPage.tsx     # Settings persistence via profileRepo
    │
    └── objectives/
        └── ObjectivesHub.tsx    # Daily goals + milestones
```

---

## Key Files and Their Roles

| File | Role |
|------|------|
| `src/App.tsx` | Composition root. Reads env flag, manages session state, selects demo vs. Supabase repos, owns routing switch, provides `AppContext`. |
| `src/data/types.ts` | Single source of truth for all repository interfaces and shared data types. Always update here first when adding a new feature. |
| `src/data/AppContext.ts` | Defines `AppContext` and `useAppContext()`. Components must use this hook — never import repos directly. |
| `src/config/appConfig.ts` | Parses `VITE_DEMO_LOGIN` env var. `demoLoginEnabled` defaults `true` when unset. |
| `src/lib/supabase.ts` | Supabase singleton. Has a fallback URL so the app doesn't crash without `.env`. |
| `src/lib/auth.ts` | Thin wrappers around Supabase auth SDK (`signIn`, `signOut`, `getSession`, `onAuthChange`). |
| `src/lib/router.ts` | Bespoke client-side router using `history.pushState` + `popstate`. Owns all `RoutePath` type definitions. |
| `src/lib/wordData.ts` | Loads and filters word JSON assets for a lesson. Called on `StudySession` mount. |
| `src/data/account/repository.ts` | `localAccountRepository` — provides static fixture data (lesson catalog, achievement catalog, store items, initial profile). Used in both demo and prod for browsing content. |
| `src/data/progressStore.ts` | Supabase `ProgressStore` impl. Reads/writes `card_progress` and `review_logs`. |
| `src/data/progressStore.mock.ts` | In-memory `ProgressStore` for demo mode. Resets on page reload. |
| `src/features/lessons/StudySession.tsx` | Critical path. Orchestrates FSRS scheduling: loads progress → `buildSession` → `scheduleReview` → `upsertProgress` → `logReview` → `addXp` → `incrementGoal`. |
| `supabase/migrations/` | All DB schema and RLS policy SQL. Three migration files currently. |

---

## Feature Module Organization

Each feature directory under `features/` contains only React components for that vertical slice. Features do not import from other feature directories — cross-feature dependencies go through `data/` (repos) or `features/shared/` (UI primitives).

**Pattern for a feature page component:**
```typescript
// features/someFeature/SomePage.tsx
import { useAppContext } from "../../data/AppContext";

export function SomePage() {
  const { someRepo, userId } = useAppContext();
  // ... local useState for loading/data
  // ... useEffect to call someRepo.getSomething(userId)
}
```

---

## Data Layer Organization

The `data/` directory follows a strict pattern:

1. `types.ts` — define the interface (e.g., `FooRepository`)
2. `<feature>/mock<Feature>Repository.ts` — in-memory implementation
3. `<feature>/supabase<Feature>Repository.ts` — Supabase implementation
4. Wire both into `App.tsx` in the `isDemo` branch and the production branch of `appContextValue`

The `account/` subdirectory is an exception: it holds static fixture data (not user state) and has only one implementation (`repository.ts`) used in both modes.

---

## Supabase Migrations

```
supabase/migrations/
├── 20260607000000_init.sql                          # profiles, card_progress, review_logs, RLS, streak trigger
├── 20260610000000_card_progress_learning_steps.sql  # adds learning_steps column to card_progress
└── 20260622000000_user_state_tables.sql             # achievements, inventory, equipped, daily_goals, increment_xp function
```

---

## Where to Add New Code

**New DB-backed feature (e.g., "leaderboard"):**
1. `supabase/migrations/<timestamp>_<name>.sql` — table + RLS
2. `packages/app/src/data/types.ts` — add interface + add to `AppContextValue`
3. `packages/app/src/data/<feature>/mock<Feature>Repository.ts`
4. `packages/app/src/data/<feature>/supabase<Feature>Repository.ts`
5. `packages/app/src/App.tsx` — inject in both `isDemo` and prod branches
6. `packages/app/src/features/<feature>/` — UI component consuming `useAppContext()`

**New page/route:**
1. Add route pattern to `RoutePath` union in `src/lib/router.ts`
2. Add parsing logic in `parseRoute()` in `src/lib/router.ts`
3. Add `case` to `renderPage()` switch in `src/App.tsx`
4. Create `src/features/<feature>/<PageName>.tsx`
5. Import component in `src/App.tsx`

**New shared UI component:**
- Place in `src/features/shared/`

**New utility/helper:**
- Place in `src/lib/`

---

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `StudySession.tsx`, `DashboardPage.tsx`)
- Non-component TypeScript: `camelCase.ts` (e.g., `appConfig.ts`, `wordData.ts`)
- Repository implementations: `supabase<Feature>Repository.ts` / `mock<Feature>Repository.ts`
- Test files: `<name>.test.ts` co-located or in `src/data/` for data-layer tests

**Directories:**
- Feature directories: `camelCase` (e.g., `lessons/`, `shop/`, `achievements/`)
- Data subdirectories: `camelCase` matching the domain noun (e.g., `goals/`, `stats/`, `inventory/`)

---

*Structure analysis: 2026-06-22*
