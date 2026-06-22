# Concerns & Technical Debt
_Last updated: 2026-06-22_

## Summary

The codebase is in active feature-integration: all Lane B repositories (achievements, inventory, goals, stats, profile, auth) have been added as untracked files and their consuming components have been wired up, but the work is not yet committed. Several meaningful gaps exist around purchase atomicity, missing feature invocations (streak, achievement unlock), demo/prod parity on stats, and near-zero test coverage for all new repository code. Security posture is sound for existing tables but the new tables lack delete/update guards in some spots.

---

## Modified Uncommitted Files (git status)

All changes below are unstaged or untracked — not yet committed.

**Modified source files:**
- `packages/app/src/App.tsx` — injects all new repos (achievements, inventory, goals, stats) via `AppContext.Provider`; switches on `isDemo`
- `packages/app/src/features/lessons/StudySession.tsx` — now calls `profileRepo.addXp` and `goalRepo.incrementGoal` (fire-and-forget)
- `packages/app/src/features/profile/SettingsPage.tsx` — now calls `profileRepo.updateProfile` to persist settings
- `packages/app/src/features/profile/StatsPage.tsx` — now calls `statsRepo.getWeeklyXp` for live weekly chart
- `packages/app/src/features/shop/ItemDetail.tsx` — now calls `inventoryRepo.purchase`, `profileRepo.addXp`, and `inventoryRepo.equip`
- `packages/app/src/lib/supabase.ts` — shared singleton Supabase client

**Untracked new files (not yet committed):**
- `packages/app/src/data/AppContext.ts`
- `packages/app/src/data/types.ts`
- `packages/app/src/data/achievements/` (mock + supabase repos)
- `packages/app/src/data/auth/supabaseAuthRepository.ts`
- `packages/app/src/data/goals/` (mock + supabase repos)
- `packages/app/src/data/inventory/` (mock + supabase repos)
- `packages/app/src/data/profile/` (mock + supabase repos)
- `packages/app/src/data/stats/` (mock + supabase repos)
- `packages/app/src/data/progressStore.mock.ts`
- `supabase/migrations/20260622000000_user_state_tables.sql`
- `scripts/` (unread — unknown contents)

---

## Security Concerns

### Purchase flow is not atomic — XP deduction can diverge from inventory insert

**Risk:** `ItemDetail.tsx` calls `inventoryRepo.purchase(...)` then `profileRepo.addXp(userId, -item.priceXp)` as two separate awaited calls (lines 50–51). If the first succeeds but the second fails (network error, RLS violation, etc.), the user gets the item without losing XP. There is no compensating transaction or rollback.

**Files:** `packages/app/src/features/shop/ItemDetail.tsx:50-58`, `packages/app/src/data/inventory/supabaseInventoryRepository.ts:35-39`

**Mitigation path:** Move the two writes into a single Postgres function (`purchase_item(uid, item_id, xp_cost)`) that does both inside a transaction, and call it via `supabase.rpc()`.

---

### `increment_xp` is `SECURITY DEFINER` but has no caller restriction

**Risk:** The `increment_xp` function (`supabase/migrations/20260622000000_user_state_tables.sql:88`) runs as the function owner (superuser) and accepts any `uid`. No `GRANT EXECUTE` restriction is specified, so any authenticated user could call `increment_xp(another_uid, 99999)` via the API if Supabase exposes the RPC endpoint to the anon/authenticated roles.

**Mitigation path:** Revoke `EXECUTE` from `public`/`anon` and grant only to `authenticated`. Additionally add a check inside the function body: `WHERE user_id = uid AND user_id = auth.uid()`.

---

### `user_achievements` and `user_inventory` have no DELETE policy

**Risk:** Rows can never be deleted by the user or by automated cleanup. This is acceptable for immutable audit tables, but if a future reset-account feature is added, there is no DELETE RLS policy to enable it safely. Also, an admin DELETE via service role key would bypass RLS entirely.

**Files:** `supabase/migrations/20260622000000_user_state_tables.sql:15-37`

**Impact:** Low now; becomes a blocker if account reset or data-export-deletion (GDPR) is needed.

---

### Demo auth stores session in `localStorage` with no expiry

**Risk:** `packages/app/src/data/auth/repository.ts` writes a session to `localStorage` under `words.demo.session`. There is no expiry timestamp, no CSRF protection, and any JavaScript on the page can read it (though this is demo-mode-only).

**Files:** `packages/app/src/data/auth/repository.ts:SESSION_KEY`

**Mitigation path:** Acceptable for demo mode. Add a comment noting this must not be used for production auth.

---

### Supabase anon key exposed via Vite env vars (by design, but worth documenting)

**Risk:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are bundled into the client JS at build time. This is the intended Supabase pattern; RLS is the security boundary. However, if `.env` is accidentally committed, a live anon key would be exposed.

**Files:** `packages/app/src/lib/supabase.ts`, `.gitignore` (modified — confirm `.env` is excluded)

---

## Technical Debt

### `bio` field not stored in Supabase profiles table

**Issue:** `AppProfile.bio` is declared in `packages/app/src/data/types.ts:32` and hardcoded to `""` in `packages/app/src/data/profile/supabaseProfileRepository.ts:47`. The `profiles` table schema (`supabase/migrations/20260607000000_init.sql`) has no `bio` column.

**Impact:** Any future UI that lets users edit bio will silently discard the value.

**Fix approach:** Add a migration adding `bio text default ''` to `profiles`; update `getProfile` select and `updateProfile` to use it.

---

### `touchStreak` is never called by any feature component

**Issue:** `ProfileRepository.touchStreak` is defined in `packages/app/src/data/types.ts:47`, implemented in both `supabaseProfileRepository.ts:70` and `mockProfileRepository.ts:33`, but no feature component calls it. Streaks are displayed from fixture data (`profile.streakDays`) and never updated in real time.

**Files:** `packages/app/src/data/types.ts`, `packages/app/src/data/profile/supabaseProfileRepository.ts:70`

**Impact:** Streak count is static; never incremented during study sessions.

**Fix approach:** Call `profileRepo.touchStreak(userId, today)` at the end of a study session in `StudySession.tsx`, and add streak-increment logic to the DB function or a separate SQL function.

---

### `achievementRepo` is wired but `unlock()` is never called

**Issue:** `AchievementRepository.unlock` is defined and both implementations exist, but no feature component calls `achievementRepo.unlock(...)`. Achievements can be fetched but never earned during gameplay.

**Files:** `packages/app/src/data/achievements/supabaseAchievementRepository.ts:18`, `packages/app/src/features/` (no call sites found)

**Impact:** Achievement system is non-functional in production — users can never earn new achievements.

**Fix approach:** Add achievement-check logic after study session completion in `StudySession.tsx` (e.g., first lesson, 100% accuracy, XP thresholds).

---

### `supabaseInventoryRepository.purchase` ignores `_xpCost` parameter

**Issue:** The `purchase` method signature accepts `xpCost` but the implementation marks it `_xpCost` and ignores it (`packages/app/src/data/inventory/supabaseInventoryRepository.ts:35`). XP deduction is split to a separate `profileRepo.addXp` call in the component, creating the atomicity problem above.

**Files:** `packages/app/src/data/inventory/supabaseInventoryRepository.ts:35`

---

### `mockStatsRepository` returns random XP data on every call

**Issue:** `packages/app/src/data/stats/mockStatsRepository.ts` returns `Math.random()` values for weekly XP. This means the chart in demo mode shows different numbers on every navigation, which looks like a bug to users.

**Fix approach:** Return a deterministic fixture array seeded from a fixed value, or use the same pattern as `mockAchievementRepository` (seeded from fixture data passed in at construction).

---

### `user_daily_goals.incrementGoal` uses a read-then-write pattern (race condition)

**Issue:** `packages/app/src/data/goals/supabaseDailyGoalRepository.ts:32-54` does a `SELECT` then either `UPDATE` or `INSERT`. Two concurrent study sessions finishing at the same time (e.g., multi-tab) can both read `current=0`, both try to `UPDATE`, and one will silently win with an incorrect total.

**Fix approach:** Use an `INSERT ... ON CONFLICT DO UPDATE SET current = current + excluded.current` (upsert with arithmetic) to make the operation atomic.

---

### `App.tsx` creates mock repositories inside `useMemo` — new instances on every session change

**Issue:** `packages/app/src/App.tsx:119-122` calls `createMockProgressStore()`, `createMockProfileRepository(...)`, etc. inside a `useMemo` that depends on `[session, dashboardData, isDemo]`. Any change to `session` or `dashboardData` creates fresh in-memory store instances, discarding any demo-mode state accumulated during the session (e.g., XP earned, cards reviewed).

**Impact:** Demo mode state is lost whenever an unrelated state update triggers `useMemo` re-evaluation.

**Fix approach:** Create demo repos in a `useRef` initialized once, or use `useState` with lazy initialization.

---

## Performance Concerns

### `StatsPage` computes `maxXP` inside the render loop

**Issue:** `packages/app/src/features/profile/StatsPage.tsx:76` calls `Math.max(...weeklyStats.map(...))` inside a `.map()` callback that renders each bar — `O(n²)` for 7 items (negligible now but a pattern to avoid).

**Fix approach:** Compute `maxXP` once outside the render map.

---

### Weekly XP stats query loads all `review_logs` rows for the past 7 days without a `LIMIT`

**Issue:** `packages/app/src/data/stats/supabaseStatsRepository.ts:9-14` fetches all review log rows in the window. A power user with thousands of reviews in a week will receive a large payload just to compute daily XP sums.

**Fix approach:** Aggregate server-side with a Postgres function or a view (`SELECT date_trunc('day', reviewed_at), SUM(xp) FROM review_logs WHERE ...`).

---

### `supabaseDailyGoalRepository.incrementGoal` makes 2 round trips per call

**Issue:** SELECT + UPDATE/INSERT adds latency on every card rating. Called once per completed session in `StudySession.tsx:193` but could become problematic if called more frequently.

**Fix approach:** Use `INSERT ... ON CONFLICT DO UPDATE` (single round trip).

---

## Incomplete Implementations / Missing Features

### Notification settings are persisted but never acted upon

**Issue:** `SettingsPage.tsx` saves notification prefs (`streak`, `goalComplete`, `xpMilestone`) to `profileRepo.updateProfile`. No push notification system, service worker, or Capacitor push plugin exists in the codebase.

**Impact:** Settings UI is functional cosmetically but has no backend effect.

---

### `minutes_studied` goal type is defined but never incremented

**Issue:** `supabaseDailyGoalRepository.ts:7` lists `minutes_studied` as a valid `DEFAULT_TARGETS` key, but `StudySession.tsx:193` only calls `incrementGoal(userId, "cards_reviewed", ...)`. No component tracks study time and writes `minutes_studied`.

**Impact:** `minutes_studied` daily goal, if shown, will always read 0.

---

### `autoAdvance` setting is saved but not used by `StudySession`

**Issue:** `UserSettings.autoAdvance` is stored and loaded, but `StudySession.tsx` does not read the setting from context and always requires a manual card flip.

---

## Test Coverage Gaps

### No tests for any of the new Lane B repositories

All new repository files have zero test coverage:
- `packages/app/src/data/achievements/` (both mock and supabase)
- `packages/app/src/data/goals/` (both)
- `packages/app/src/data/inventory/` (both)
- `packages/app/src/data/profile/` (both)
- `packages/app/src/data/stats/` (both)
- `packages/app/src/data/auth/supabaseAuthRepository.ts`

The only existing integration test is `packages/app/src/data/progressStore.rls.test.ts`, which covers `card_progress` and `review_logs` RLS only.

**Priority:** High. The purchase flow and XP increment are user-visible, money-equivalent operations.

---

### No component-level tests

No test files exist under `packages/app/src/features/`. `StudySession.tsx`, `ItemDetail.tsx`, `SettingsPage.tsx`, and `StatsPage.tsx` are all untested. The purchase atomicity bug, the streak non-update, and the achievement non-unlock could all be caught by component tests.

---

### RLS tests do not cover new tables

`progressStore.rls.test.ts` tests `card_progress` and `review_logs`. The new tables — `user_achievements`, `user_inventory`, `user_equipped`, `user_daily_goals` — have no RLS isolation tests.

---

## Demo / Production Parity Gaps

| Behavior | Demo mode | Production mode |
|---|---|---|
| Weekly XP chart | Random numbers on every load | Real aggregation from `review_logs` |
| Streak count | Static from fixture (`streakDays`) | Static from `profiles.streak_count` (never updated) |
| Achievement unlock | Works in memory | `unlock()` never called — always 0 new achievements |
| Settings persistence | In memory only (lost on reload) | Persisted to Supabase `profiles.settings` |
| Progress store state loss | On `session` state change (useMemo issue) | Persistent in DB, no parity issue |
| Daily goals targets | Fixed fixture values | Hardcoded `DEFAULT_TARGETS` constants (not user-configurable) |

---

## Dependencies at Risk

No immediately outdated or vulnerable packages detected. No lock file concerns found. `@supabase/supabase-js` version should be verified against the local Supabase CLI version to avoid schema/API mismatches when running integration tests.

---

*Concerns audit: 2026-06-22*
