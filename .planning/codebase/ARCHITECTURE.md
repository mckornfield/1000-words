# Architecture
_Last updated: 2026-06-22_

## Summary

1000 Words is a spaced-repetition language-learning app structured as a pnpm monorepo with three packages: a pure-TypeScript FSRS scheduling engine (`@1000words/engine`), a static word/card content package (`@1000words/content`), and a React 19 + Vite frontend app (`@1000words/app`). The app uses a repository pattern with a clean demo/production split: in demo mode all repos are in-memory; in production mode they talk to Supabase. All repository instances are assembled once in `App.tsx` and distributed to the component tree via React Context.

---

## Monorepo Package Breakdown

| Package | Path | Role |
|---------|------|------|
| `@1000words/engine` | `packages/engine/` | Pure TypeScript FSRS algorithm — no I/O, no React, no Supabase. Exports `buildSession`, `scheduleReview`, `initialState`. |
| `@1000words/content` | `packages/content/` | Word data pipeline and JSON assets. Exports `Card`, `CardDeck`, `LangPair` types and `SAMPLE_CARDS` fixture. Bundled into app at build time. |
| `@1000words/app` | `packages/app/` | React 19 SPA. Owns all UI, data repos, auth, routing, and Supabase integration. |

---

## High-Level System Diagram

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Browser / Capacitor Shell                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                     App.tsx (shell)                       │    │
│  │  - Reads VITE_DEMO_LOGIN flag → selects repo impls        │    │
│  │  - Manages session state (demo: localStorage / prod: JWT) │    │
│  │  - Builds AppContextValue with all repo instances         │    │
│  │  - Owns client-side routing via lib/router.ts             │    │
│  └──────────┬──────────────────────────────────────────────┘     │
│             │  AppContext.Provider                                 │
│             ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │               Feature Components (pages)                   │    │
│  │  features/lessons/StudySession.tsx  (critical path)       │    │
│  │  features/profile/{Stats,Settings,Customization}Page.tsx  │    │
│  │  features/shop/ItemDetail.tsx                             │    │
│  │  features/achievements/AchievementsGallery.tsx            │    │
│  │  features/dashboard/DashboardPage.tsx                     │    │
│  └──────────┬──────────────────────────────────────────────┘     │
│             │  useAppContext()                                     │
│             ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                   Repository Layer                         │    │
│  │  data/types.ts (interfaces — single source of truth)     │    │
│  │  ┌──────────────┐   ┌──────────────┐                     │    │
│  │  │  Mock repos  │   │ Supabase repos│                     │    │
│  │  │  (in-memory) │   │  (prod mode)  │                     │    │
│  │  └──────────────┘   └──────┬───────┘                     │    │
│  └─────────────────────────────┼────────────────────────────┘    │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                                  ▼
                       ┌──────────────────┐
                       │  Supabase (cloud) │
                       │  - auth.users     │
                       │  - profiles       │
                       │  - card_progress  │
                       │  - review_logs    │
                       │  - achievements   │
                       │  - inventory      │
                       │  - daily_goals    │
                       └──────────────────┘
```

---

## Repository Pattern

**Interface definition:** `packages/app/src/data/types.ts` is the single source of truth for all repository interfaces: `AuthRepository`, `ProfileRepository`, `AchievementRepository`, `InventoryRepository`, `DailyGoalRepository`, `StatsRepository`, and `ProgressStore`.

**Dual implementations per feature:**

| Interface | Demo (mock) impl | Production (Supabase) impl |
|-----------|-----------------|---------------------------|
| `AuthRepository` | `data/auth/repository.ts` (localStorage) | `data/auth/supabaseAuthRepository.ts` |
| `ProfileRepository` | `data/profile/mockProfileRepository.ts` | `data/profile/supabaseProfileRepository.ts` |
| `AchievementRepository` | `data/achievements/mockAchievementRepository.ts` | `data/achievements/supabaseAchievementRepository.ts` |
| `InventoryRepository` | `data/inventory/mockInventoryRepository.ts` | `data/inventory/supabaseInventoryRepository.ts` |
| `DailyGoalRepository` | `data/goals/mockDailyGoalRepository.ts` | `data/goals/supabaseDailyGoalRepository.ts` |
| `StatsRepository` | `data/stats/mockStatsRepository.ts` | `data/stats/supabaseStatsRepository.ts` |
| `ProgressStore` | `data/progressStore.mock.ts` | `data/progressStore.ts` (via `data/progress.ts`) |

**Selection:** `App.tsx` reads `appConfig.demoLoginEnabled` (from `VITE_DEMO_LOGIN`) in a `useMemo` and builds the `AppContextValue` with either mock or Supabase repos. The flag defaults `true` when `VITE_DEMO_LOGIN` is unset.

**Consumption:** Components call `useAppContext()` from `data/AppContext.ts` — they never import repo implementations directly.

---

## AppContext Injection

`packages/app/src/data/AppContext.ts` defines a `React.createContext<AppContextValue | null>(null)`. `App.tsx` wraps the entire page tree in `<AppContext.Provider value={appContextValue}>`. `useAppContext()` throws if called outside the provider, making missing context a hard error.

`AppContextValue` carries:
- `userId: string`
- `progressStore: ProgressStore`
- `profileRepo: ProfileRepository`
- `achievementRepo: AchievementRepository`
- `inventoryRepo: InventoryRepository`
- `goalRepo: DailyGoalRepository`
- `statsRepo: StatsRepository`

---

## FSRS Scheduling Data Flow

Cards move through the system in this sequence:

1. **Content package** — `@1000words/content` defines the `Card` schema (id, word, translation, langPair, audio path, etc.). Static JSON assets live in `packages/content/data/`.

2. **Word loading** — `packages/app/src/lib/wordData.ts` loads the appropriate JSON asset for a given lesson + langPair at runtime.

3. **Progress fetch** — `StudySession.tsx` calls `progressStore.getProgress(userId, langPair)` on mount, returning a `ProgressMap` (card id → `FsrsState`) from Supabase `card_progress` or the in-memory mock.

4. **Session ordering** — `buildSession(cards, progress, { now, newCardsPerDay, maxCards })` from `@1000words/engine` orders cards by due date; new cards (no history) are interleaved.

5. **Review loop** — For each card the user rates (`again` | `hard` | `good` | `easy`):
   - `scheduleReview(currentState, rating, now)` computes the next `FsrsState`.
   - `progressStore.upsertProgress(userId, cardId, nextState)` persists to `card_progress` (fire-and-forget).
   - `progressStore.logReview(userId, cardId, rating, elapsedMs)` appends to `review_logs` (fire-and-forget).

6. **XP write** — On session complete, `profileRepo.addXp(userId, earnedXp)` calls the `increment_xp(uid, delta)` SQL function atomically.

7. **Goal write** — `goalRepo.incrementGoal(userId, goalType, by)` updates `daily_goals`.

---

## Auth Flow

**Demo mode** (`VITE_DEMO_LOGIN=true` or unset):
1. `localAuthRepository.signIn(email, password)` from `data/auth/repository.ts` validates against a hardcoded fixture and stores `{ userId }` in localStorage.
2. On page load, session is restored synchronously from localStorage in the `useState` initializer.
3. `authReady` is set `true` immediately (no async wait).

**Production mode** (`VITE_DEMO_LOGIN=false`):
1. `supabaseAuthRepo.getSession()` from `data/auth/supabaseAuthRepository.ts` fetches the current JWT session from Supabase asynchronously.
2. `supabaseAuthRepo.onAuthChange(cb)` subscribes to auth state changes (login, logout, token refresh).
3. `authReady` becomes `true` only after the async fetch resolves.
4. Route guard in `useEffect` redirects unauthenticated users to `/login` and authenticated users away from `/login`.

Supabase auth wraps `packages/app/src/lib/auth.ts` helpers (`signIn`, `signOut`, `getSession`, `onAuthChange`). The singleton Supabase client lives in `packages/app/src/lib/supabase.ts` with a fallback URL to prevent crashes when `.env` is absent.

---

## Routing

Client-side routing is custom (no React Router). `packages/app/src/lib/router.ts` provides:
- `parseRoute()` — reads `window.location.pathname`, returns `{ path: RoutePath, params: RouteParams }`.
- `navigate(route, params)` — calls `history.pushState` then fires a synthetic `popstate` event.
- `requiresAuth(route)` — all routes except `/login` require a session.

`App.tsx` listens to `popstate` in a `useEffect` and calls `setCurrentRoute(parseRoute())`. The `renderPage()` switch selects the correct page component.

Supported routes: `/login`, `/dashboard`, `/lessons`, `/lessons/:lessonId`, `/lessons/:lessonId/study`, `/achievements`, `/achievements/:achievementId`, `/shop`, `/shop/:itemId`, `/profile`, `/profile/stats`, `/profile/customization`, `/profile/settings`, `/objectives`, `/objectives/:objectiveId`.

---

## State Management

There is no global client-side state store (no Redux, Zustand, etc.). State is managed at three levels:

1. **`App.tsx` component state** — `session`, `authReady`, `currentRoute`, `dataError`, `dashboardData`. These are the only truly global states.
2. **`AppContext`** — repo instances are injected here. Components call repo methods imperatively; there is no reactive cache layer.
3. **Local component state** — each page manages its own loading/data state via `useState`/`useEffect`.
4. **Supabase as source of truth** — all persistent state lives in Supabase tables; the app does not maintain a client-side cache beyond the lifetime of a component mount.

---

## Static Fixture Data vs. Live Repo Data

`localAccountRepository` (from `data/account/repository.ts`) provides static fixture data: lesson catalog, achievement catalog, store item catalog, and initial profile. This is always used for the lesson/achievement/shop browsing structure, even in production mode. Live user state (XP, inventory, progress, goals) comes from Supabase repos via `AppContext`.

---

## XP Writes and RLS

- XP increments call the `increment_xp(uid, delta)` SQL function (defined in `supabase/migrations/20260622000000_user_state_tables.sql`), which is atomic and avoids race conditions.
- All Supabase tables enforce `auth.uid() = user_id` Row Level Security. Users can only read and write their own rows.
- RLS policies live in `supabase/migrations/`.

---

## Key Architectural Constraints

- **No React Router** — routing is a bespoke `history.pushState` + `popstate` loop in `lib/router.ts`.
- **No client-side cache** — every component mount fetches fresh data; there is no invalidation logic to maintain.
- **Engine is pure** — `@1000words/engine` has zero runtime dependencies. It must stay I/O-free.
- **Demo mode must never call Supabase** — the `isDemo` branch in `App.tsx` must only instantiate mock repos.
- **Singleton Supabase repos** — `supabaseProgressStore` and `supabaseAuthRepo` are created once at module scope outside `App`, not inside the component, to avoid recreation on re-render.

---

## Anti-Patterns

### Importing repo implementations directly in components

**What happens:** A component imports `createSupabaseProfileRepository` directly instead of calling `useAppContext().profileRepo`.
**Why it's wrong:** Breaks demo/prod switching; bypasses the context injection; makes the component untestable with mock repos.
**Do this instead:** Always use `const { profileRepo } = useAppContext()` inside the component.

### Calling `navigate()` outside of user interactions or auth guards

**What happens:** Navigation called inside a `useEffect` without checking `authReady`.
**Why it's wrong:** Can cause redirect flashes before Supabase auth resolves.
**Do this instead:** All route guards are inside the `useEffect` that depends on `[session, currentRoute, authReady]` in `App.tsx`; follow the same pattern.

---

*Architecture analysis: 2026-06-22*
