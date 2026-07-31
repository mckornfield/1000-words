# Lane B Stabilization and Continuation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Preserve `.planning/in-work/README.md` and `.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md` as the active status source; this file is the implementation handoff, not a competing roadmap.

**Goal:** Convert the current feature-rich React/Supabase vocabulary app into a trustworthy, testable, state-consistent, accessible, and release-ready web/mobile product before adding reverse-direction study or more platform complexity.

**Architecture:** Keep the existing pnpm monorepo, pure FSRS engine, static content package, React composition root, and demo/Supabase repository split. Stabilize those seams with runtime validation, a minimal app test harness, stable service lifetimes, explicit domain refreshes, and transactional/idempotent backend commands. Do not introduce React Router or a global query/state library unless the explicit decision gates in this plan fail.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind 4/CSS tokens, Vitest 4, React Testing Library, Playwright, Zod 4, Supabase/Postgres/RLS/RPCs, FSRS via `@1000words/engine`, Capacitor 8.

---

## 1. Grounded Current Context

### Repository baseline

- Repository: `C:/Users/SnowBlind/Documents/GitHub/1000-words`
- Branch: `Alex-Staging`
- HEAD/base: `d8890c7` (`main`, `origin/main`, and `origin/Alex-Staging` are currently aligned)
- Active planning source:
  - `.planning/in-work/README.md`
  - `.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`
- `.planning` has been removed from `.gitignore`; `git check-ignore` confirms `.planning/in-work/README.md` is no longer ignored.
- Current working-tree changes at planning time:
  - Modified: `.gitignore`
  - Untracked: `.planning/in-work/`

### Existing strengths to preserve

- Clear three-package split:
  - `packages/engine`: pure FSRS scheduling/session logic with meaningful unit coverage.
  - `packages/content`: typed/Zod-validated decks and build-time asset sync.
  - `packages/app`: React UI, routing, repository contracts, demo mode, Supabase mode, Capacitor shell.
- Four shipped language decks: `en-es`, `en-zh`, `en-ko`, and `en-ja`.
- Existing GitHub Pages base-path work in `vite.config.ts`, `router.ts`, `public/404.html`, and `index.html`.
- Existing Playwright coverage for demo auth, study interaction, and localStorage progress persistence.
- Existing RLS integration coverage for `card_progress` and `review_logs`.
- Existing UI tokens, responsive rules, a screen-reader-only utility, semantic navigation, toasts with live-region behavior, keyboard study controls, and bottom safe-area padding.
- Lifetime XP and spendable tokens are already separate fields, which is the correct product direction.

### Verified gaps that drive the implementation order

1. **Documentation is materially stale.** `README.md`, `docs/PLAN.md`, `CLAUDE.md`, and `.planning/codebase/*` describe missing files, old feature status, and outdated repository state.
2. **Deck failures are dishonest.** `StudySession.tsx` catches load failures and creates `fb-*` cards (`Word 1`, `Translation 1`).
3. **Runtime content is not validated.** `wordData.ts` casts fetched JSON to `WordEntry[]` instead of parsing with `CardDeckSchema`; rejected promises also remain in `_promises`, so Retry cannot be reliable without cache cleanup. A valid-but-empty deck also falls through to a permanent loading view, while `ordered.length === 0 ? words.slice(0, 20)` bypasses an intentionally empty FSRS queue.
4. **Routing remains under-tested.** `parseRoute()` and `navigate()` each normalize `BASE_URL`; no focused route test exists, and unknown routes silently become `/login`. Base stripping is not segment-boundary-aware, static routes can accept extra segments, and route parameters are not URL-encoded.
5. **The app test harness is incomplete.** `packages/app/vitest.config.ts` has no `jsdom` environment, RTL dependencies are absent, and the app script still uses `--passWithNoTests` despite a few non-component tests now existing.
6. **Demo service lifetimes are unstable.** `App.tsx` creates all mock repositories inside a memo depending on `dashboardData`; those in-memory services can reset when app data changes. Mock inventory timestamps change on each read, mock stats are random, and the mock progress prefix map covers only Spanish/Mandarin—Korean/Japanese can collide with the Spanish storage key.
7. **Visible user state is split.** Most screens render `dashboardData` from the static account fixture/initial production load, while mutations occur through repositories. There is no invalidation or refresh contract.
8. **Study writes are fire-and-forget and non-idempotent.** Per-card progress/log writes, XP, goals, and achievement work can partially succeed, complete out of order, or be repeated.
9. **Purchases are not atomic or fully trusted.** `ItemDetail.tsx` spends tokens and inserts inventory in separate calls. The current DB does not own security-critical catalog pricing, so a secure `purchase_item(item_id)` RPC needs a trusted price source.
10. **Several `SECURITY DEFINER` functions need hardening.** `increment_xp`, `add_tokens`, and `spend_tokens` accept arbitrary `uid` values and lack the explicit execute grants/auth checks already used by the leaderboard RPCs.
11. **Daily goals race.** `supabaseDailyGoalRepository.incrementGoal()` performs read-then-write and uses UTC date strings.
12. **Gamification formulas and data sources disagree.** App level calculation uses 500 XP/level while leaderboard SQL uses 250 XP/level; achievements use current-session counts where some rules require all-time counts; mock stats use randomness.
13. **Settings are only partly real.** `SettingsPage.tsx` initializes most controls from hardcoded values, `autoAdvance` is not consumed by study, and notification settings have no implementation.
14. **Accessibility/mobile support is partial.** There is no reduced-motion handling, only bottom-nav safe-area padding, no dialog primitive/focus management, limited narrow-width verification, and no automated accessibility gate.
15. **Release checks are incomplete.** CI omits Playwright, production-base-path smoke tests, and Supabase/RLS jobs. Existing E2E tests are demo-only and do not cover shop/settings/gamification/hosted deep links.

---

## 2. Delivery Principles and Decision Gates

1. Work in small vertical PRs. Each PR includes behavior, tests, documentation, and verification evidence.
2. Pull the minimum B2 test-harness work forward before changing B1 behavior; tests are an enabling dependency, not a later cleanup phase.
3. Keep the custom router unless route tests expose continued duplication or unmanageable metadata/redirect needs.
4. Start state refresh with explicit domain invalidation in `AppContext`; do not adopt TanStack Query, Redux, or Zustand unless repeated coordination remains harder after B3.
5. Keep static presentation catalogs in the client, but mirror security-critical shop fields (item ID, price, slot, requirements) in Postgres so purchases cannot trust client-supplied prices.
6. Prefer command-style repository methods returning updated domain state over sequences of low-level mutations.
7. Every retryable compound mutation must have an idempotency key generated once per user action.
8. Do not display success until the authoritative mutation resolves.
9. Demo mode must implement the same contracts and domain rules as Supabase mode, while remaining deterministic and session-scoped.
10. Defer B7 reverse-direction study and registry expansion until B1-B5 are green.

### Architecture decision checkpoints

- **Router checkpoint (after route tests):** retain the bespoke router if parsing, URL generation, auth redirects, and base-path behavior are centralized and readable. If not, create a separate migration plan to React Router that preserves all URLs.
- **State-library checkpoint (after refresh coordinator):** retain explicit refresh callbacks if mutations can invalidate a short named set of domains. Add a query library only if duplicated cache lifecycle code remains substantial.
- **Notification checkpoint (B4/B6):** either implement actual web/native notifications in a dedicated capability or remove/disable notification settings. Do not continue presenting inert preferences.
- **Shop catalog checkpoint (before purchase RPC):** default to a small database-owned security catalog. Do not accept `tokenCost` from the browser as authoritative.

---

## 3. Dependency Order

```text
B0 documentation truth
  └─> Test harness minimum
       ├─> Honest deck loading + runtime validation
       ├─> Router normalization + base-path tests
       └─> Component/repository contract tests
            └─> Secure existing reward RPCs
                 └─> Stable service lifetimes
                      └─> Explicit refresh/invalidation
                           ├─> Atomic/idempotent review + study completion
                           └─> Atomic/trusted purchase
                           └─> Gamification correctness
                                └─> Study accessibility/mobile hardening
                                     └─> Shared UI/responsive/a11y pass
                                          ├─> Release gates
                                          └─> B7 forward features
```

B8 CI can be strengthened incrementally, but hosted/mobile release acceptance only becomes meaningful after B1-B6.

---

## 4. Implementation Slices

## Slice 0 — Preserve the Active Plan and Reconcile Documentation (B0)

**Objective:** Make repository documentation accurately describe the code at `d8890c7` and establish one authoritative active tracker.

**Files:**
- Modify: `.gitignore`
- Add/track: `.planning/in-work/README.md`
- Add/track: `.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`
- Modify: `README.md`
- Modify: `docs/PLAN.md`
- Modify: `CLAUDE.md`
- Modify: `.planning/codebase/STRUCTURE.md`
- Modify: `.planning/codebase/CONCERNS.md`
- Modify: `.planning/codebase/CONVENTIONS.md`
- Modify: `.planning/STATE.md`
- Review/update: `.planning/PROJECT.md`
- Review/update as needed: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/STACK.md`, `.planning/codebase/INTEGRATIONS.md`

**Steps:**
1. Commit the `.gitignore` change and the two active planning documents together so the source of truth is reviewable.
2. Replace the root README roadmap with:
   - Current capability matrix.
   - Supported languages and speaking practice.
   - Demo versus Supabase mode.
   - Local, GitHub Pages, iOS, and Android run/deploy instructions.
   - Accurate test matrix and known stabilization work.
3. Mark `docs/PLAN.md` as the original/historical architecture plan; retain useful locked decisions but remove any implication that its checkboxes are current status.
4. Remove all `.agent_notes/*` references and the obsolete planning-mode protocol from `CLAUDE.md`; point contributors to `.planning/in-work/README.md`.
5. Re-audit every concern against current code. Retain verified issues with a new audit date; delete claims about files being untracked or features never invoked when they are now false.
6. Regenerate structure/testing summaries only after factual edits are complete.

**Verification:**
```bash
git check-ignore -v .planning/in-work/README.md || true
rg -n "\.agent_notes|Review Screen \(future\)|Supabase Integration.*\[ \]|Mandarin.*\[ \]" README.md docs CLAUDE.md .planning
pnpm review
```

**Acceptance:**
- No active document links to a missing `.agent_notes` file.
- README accurately names all four language pairs, speaking practice, leaderboard, production Supabase, GitHub Pages, and Capacitor.
- Historical documents are labeled as historical.
- `.planning/in-work/` is tracked and remains the only active roadmap/status hierarchy.

**Commit:** `docs: reconcile current product and lane b roadmap`

---

## Slice 1 — Establish the Minimum Frontend Test Harness (B2 enabling work)

**Objective:** Make behavior changes test-first without introducing a second app architecture in fixtures.

**Files:**
- Modify: `packages/app/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/app/vitest.config.ts`
- Modify: `packages/app/vitest.setup.ts`
- Create: `packages/app/src/test/renderApp.tsx`
- Create: `packages/app/src/test/createTestServices.ts`
- Create: `packages/app/src/test/fixtures.ts` only if tiny shared typed fixtures are necessary

**Steps:**
1. Add `jsdom`, `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom` as app dev dependencies.
2. Configure Vitest with `environment: "jsdom"`, setup matchers, automatic cleanup, and predictable browser APIs.
3. Keep live Supabase/RLS tests compatible with Node behavior. If global `jsdom` interferes, use per-file environment annotations or split unit and integration Vitest projects.
4. Build one render helper that accepts partial `AppContextValue` overrides and wraps `AppContext.Provider` plus `ToastProvider`.
5. Build deterministic service factories from the production repository interfaces; do not duplicate domain types.
6. Add a smoke component test proving context, toast, user-event, and cleanup work.
7. Remove `--passWithNoTests` after the baseline component test is committed.

**Verification:**
```bash
pnpm --filter @1000words/app test
pnpm --filter @1000words/app typecheck
pnpm review
```

**Acceptance:**
- A React component renders under realistic app providers.
- Test failures fail `pnpm review`.
- RLS tests still skip cleanly without a local stack and run under the documented stack environment.

**Commit:** `test(app): add deterministic component test harness`

---

## Slice 2 — Runtime Deck Validation and Honest Recovery (B1.1)

**Objective:** Never turn missing/malformed content into a valid-looking lesson, and make Retry genuinely functional.

**Files:**
- Modify: `packages/app/src/lib/wordData.ts`
- Create: `packages/app/src/lib/wordData.test.ts`
- Modify: `packages/app/src/features/lessons/StudySession.tsx`
- Create: `packages/app/src/features/lessons/StudySession.test.tsx`
- Create if reused by a second screen: `packages/app/src/features/shared/AsyncState.tsx`
- Modify/import from: `packages/content/src/schema.ts`

**Contract design:**
- Replace the app-local `WordEntry` declaration with the exported `Card`/`CardDeck` shape where practical.
- Define a typed error union/class with kinds such as `unsupported-language`, `not-found`, `http`, `invalid-json`, `invalid-schema`, and `network`.
- Expose an explicit cache-clear/retry path. Always remove rejected entries from `_promises` in `finally`/`catch` so a second call can refetch.

**TDD cases:**
1. Valid deck parses and caches.
2. Concurrent calls coalesce into one request.
3. URLs respect `/` and `/1000-words/` base paths.
4. 404, non-OK response, invalid JSON, schema mismatch, and unsupported pair return typed errors.
5. Failed loads are not cached; Retry performs a new request.
6. A validated empty deck renders an explicit “nothing due”/empty state rather than a spinner or synthetic queue.
7. An intentionally empty FSRS queue remains empty; it does not fall back to `words.slice(0, 20)`.
8. `StudySession` renders loading, typed failure, Retry, Return Home, and empty-queue states.
9. Failed loads call none of `upsertProgress`, `logReview`, XP, goal, achievement, or completion commands.
10. Keyboard focus moves to the error heading/action region and controls remain usable at narrow width.

**Implementation steps:**
1. Write failing `wordData` boundary tests.
2. Parse fetched JSON with `CardDeckSchema.parse`/`safeParse`.
3. Validate requested pairs with `LangPairSchema` before fetching.
4. Make cache and in-flight-promise cleanup explicit.
5. Write failing StudySession failure/retry tests.
6. Remove every `fb-*` path and replace it with explicit state.
7. Keep diagnostics useful in development logs without exposing environment values.

**Verification:**
```bash
pnpm --filter @1000words/app test -- wordData.test.ts StudySession.test.tsx
BASE_URL=/1000-words/ pnpm --filter @1000words/app build
pnpm review
```

**Acceptance:**
- Synthetic cards cannot be created.
- Retry can recover without a page refresh.
- Invalid decks never produce user-state mutations.

**Commit:** `fix(study): fail honestly when deck loading is invalid`

---

## Slice 3 — Centralize and Lock Routing (B1.2)

**Objective:** Make local and GitHub Pages URLs deterministic and fully test-covered before considering a router dependency.

**Files:**
- Modify: `packages/app/src/lib/router.ts`
- Create: `packages/app/src/lib/router.test.ts`
- Modify as needed: `packages/app/src/App.tsx`
- Modify: `packages/app/public/404.html`
- Modify: `packages/app/index.html`
- Create/extend: `e2e/routes.spec.ts`
- Modify if needed: `playwright.config.ts`

**Design:**
- Extract pure helpers such as `normalizeBasePath(base)`, `stripBasePath(pathname, base)`, and `buildRoutePath(route, params, base)`.
- Make `parseRoute` testable with explicit pathname/base inputs while preserving a browser convenience wrapper.
- Encode route params; do not concatenate untrusted values raw.
- Represent unknown routes explicitly (`not-found`) or redirect intentionally after auth is known; do not silently reinterpret every unknown URL as login.

**TDD matrix:**
- Every `RoutePath` at base `/` and `/1000-words/`.
- Parameter preservation and URL encoding.
- Segment-boundary safety (`/1000-words-extra` is not treated as the app base) and rejection of extra path segments on static routes.
- Direct deep link, startup parsing, back, forward, duplicate navigation, and unknown route.
- Auth redirect behavior without pre-auth flash.
- GitHub Pages 404 encode/restore for `/dashboard`, `/study/en-es`, and `/profile/settings`.

**Hosted smoke approach:**
- Build with `BASE_URL=/1000-words/`.
- Serve the production artifact rather than Vite dev mode for base-path tests.
- Add an optional hosted project keyed by `PLAYWRIGHT_BASE_URL`; run against the deployed Pages URL in B8.

**Verification:**
```bash
pnpm --filter @1000words/app test -- router.test.ts
BASE_URL=/1000-words/ pnpm --filter @1000words/app build
pnpm e2e -- routes.spec.ts
pnpm review
```

**Decision record:** After tests pass, record whether the bespoke router remains. Default: keep it.

**Commit:** `test(router): centralize base paths and cover deep links`

---

## Slice 4 — Complete First-Wave App Behavior Coverage (B2)

**Objective:** Cover the critical infrastructure, components, and repository contracts that guard subsequent state changes.

**Files/tests:**
- `packages/app/src/config/appConfig.test.ts`
- `packages/app/src/features/login/LoginPage.test.tsx`
- `packages/app/src/features/dashboard/DashboardPage.test.tsx`
- `packages/app/src/features/profile/SettingsPage.test.tsx`
- `packages/app/src/features/shop/ItemDetail.test.tsx`
- `packages/app/src/data/**/mock*Repository.test.ts`
- `packages/app/src/data/**/supabase*Repository.test.ts`
- Extend: `packages/app/src/data/progressStore.rls.test.ts` or create domain-focused RLS suites

**Steps:**
1. Test runtime config defaults and production/demo parsing.
2. Test login demo and production sign-in/sign-up branches.
3. Test dashboard language routes and fresh profile/goals behavior.
4. Test settings initialization, successful persistence, failure feedback, and pending state.
5. Test current shop behavior before replacing it: insufficient balance, duplicate click prevention, success, and each failure boundary.
6. Add deterministic contract suites for every mock repository.
7. Make Supabase factories accept an injected thin client/adapter so mapping and error tests do not monkey-patch the singleton.
8. Extend live RLS tests to profile mutations, achievements, inventory, equipped items, daily goals, leaderboard RPC access, progress, and review logs.

**Coverage policy:** Require behavior coverage for every route, production mutation, recoverable error, and the study lifecycle. Defer numeric percentage thresholds until the suite is stable.

**Verification:**
```bash
pnpm --filter @1000words/app test
pnpm --filter @1000words/app supabase:smoke
pnpm review
```

**Commit:** `test(app): cover critical routes mutations and repositories`

---

## Slice 4A — Secure the Existing Reward Mutation Surface

**Objective:** Close release-blocking integrity gaps before building additional refresh or compound-command behavior on top of the current RPCs.

**Files:**
- Add migration: `supabase/migrations/<timestamp>_harden_reward_rpcs.sql`
- Modify repository methods/tests that call `increment_xp`, `add_tokens`, and `spend_tokens`
- Extend RLS/RPC integration tests and `packages/app/scripts/supabase-smoke.ts`

**Steps:**
1. Replace caller-controlled user targeting with `auth.uid()` inside reward-bearing functions, or reject any supplied ID that differs from `auth.uid()`.
2. Revoke execute from `public`/`anon` and grant only the minimum authenticated role.
3. Reject negative/invalid deltas and add database checks ensuring XP/tokens cannot become negative.
4. Check and propagate every Supabase update/insert error; no repository method may resolve successfully after a failed write.
5. Add cross-user, unauthenticated, negative-delta, insufficient-balance, and concurrent-call tests.
6. Treat these RPCs as transitional; Slices 7 and 8 should replace direct reward/purchase composition with authenticated domain commands.

**Verification:**
```bash
supabase db reset
pnpm --filter @1000words/app test -- '*.rls.test.ts'
pnpm --filter @1000words/app supabase:smoke
pnpm review
```

**Commit:** `security(db): harden reward and balance mutations`

---

## Slice 5 — Stabilize Demo and Production Service Lifetimes (B3.1)

**Objective:** Create one service graph per authenticated session and define intentional reset semantics.

**Files:**
- Create: `packages/app/src/data/createAppServices.ts`
- Create: `packages/app/src/data/createAppServices.test.ts`
- Modify: `packages/app/src/App.tsx`
- Modify: `packages/app/src/data/AppContext.ts`
- Modify: `packages/app/src/data/types.ts`
- Modify tests for all mock repositories

**Design:**
- Introduce an `AppServices`/`AppContextValue` factory with explicit `{ mode, userId, seedData, client }` inputs.
- Instantiate it lazily once for the authenticated session; do not key it to `dashboardData`.
- Destroy/reset it on sign-out or an explicit demo reset command only.
- Keep production singletons/factories injectable for tests.
- Make mock stats deterministic and remove `Math.random()`.
- Inject a stable clock so mock purchase timestamps do not change on reads.
- Replace card-prefix inference with registry-backed language lookup and ensure all four shipped pairs use distinct progress keys.

**Tests:**
- Navigation and dashboard refresh do not recreate services.
- Demo progress/profile/goals/inventory/achievements survive route changes.
- Sign-out/reset creates a fresh graph.
- Demo and Supabase adapters expose equivalent domain shapes.

**Verification:**
```bash
pnpm --filter @1000words/app test -- createAppServices.test.ts
pnpm e2e -- persistence.spec.ts
pnpm review
```

**Commit:** `refactor(app): stabilize per-session service lifetimes`

---

## Slice 6 — Introduce Minimal Domain Refresh/Invalidation (B3.2)

**Objective:** Ensure successful mutations update every affected screen without a reload while avoiding a broad state-management rewrite.

**Files:**
- Modify: `packages/app/src/data/types.ts`
- Modify: `packages/app/src/data/AppContext.ts`
- Create: `packages/app/src/data/refreshCoordinator.ts`
- Create: `packages/app/src/data/refreshCoordinator.test.ts`
- Modify: `packages/app/src/App.tsx`
- Modify consumers: `DashboardPage.tsx`, `ProfileOverview.tsx`, `ObjectivesHub.tsx`, `ShopBrowse.tsx`, `ItemDetail.tsx`, `CustomizationPage.tsx`, `AchievementsGallery.tsx`, `LeaderboardPage.tsx`, `SettingsPage.tsx`

**Minimal contract:**
- Named domains: `profile`, `goals`, `achievements`, `inventory`, `equipped`, `stats`, `leaderboard`.
- Expose refreshed snapshots and `refresh(domains[])`, or per-domain version counters plus selectors.
- Keep static lessons, achievement definitions, and store presentation catalog outside refreshable user state.
- Mutation commands return updated records where practical; update local snapshot immediately, then refresh only affected domains if needed.

**Tests:**
- Study completion refreshes profile/goals/achievements/stats/leaderboard.
- Purchase refreshes profile/inventory/shop.
- Equip refreshes equipped/profile/customization.
- Settings refreshes profile and subsequent study behavior.
- Pending controls suppress duplicate submission; failures preserve the prior authoritative snapshot.

**Decision record:** Evaluate whether explicit invalidation remains understandable. Default: do not add a query library.

**Commit:** `feat(app): refresh affected user domains after mutations`

---

## Slice 7 — Atomic, Idempotent Study Completion (B3.3)

**Objective:** Turn per-card persistence and final study rewards into retry-safe backend commands with authoritative results.

**Files:**
- Modify: `packages/app/src/data/types.ts`
- Create: `packages/app/src/data/study/mockStudyCompletionRepository.ts`
- Create: `packages/app/src/data/study/supabaseStudyCompletionRepository.ts`
- Modify: `packages/app/src/App.tsx` / `createAppServices.ts`
- Modify: `packages/app/src/features/lessons/StudySession.tsx`
- Add migration: `supabase/migrations/<timestamp>_complete_study_session.sql`
- Add tests: repository unit/contract tests, component tests, and Supabase integration/RLS/idempotency tests

**Recommended two-command boundary:**
- `recordCardReview({ reviewId, sessionId, langPair, cardId, rating, elapsedMs, nextState })` atomically upserts one card’s FSRS state and inserts its review log. `reviewId` makes retries idempotent and supports the roadmap’s partial-progress requirement.
- `completeStudySession({ sessionId, langPair, startedAt, completedAt })` finalizes progression exactly once from server-owned review rows: XP, cards/minutes goals, streak, and all-time aggregates required for achievements.
- `sessionId` is generated once when the session begins and reused on retries; each `reviewId` is stable for that rated card event.
- The server derives trusted XP and goal increments from recorded ratings/timing; it must not accept an arbitrary XP award or client-supplied totals.
- Repeating a review or completion command returns the existing authoritative result without duplicate rewards or logs.

**Security hardening in the same migration series:**
- Prefer `auth.uid()` inside RPCs rather than accepting arbitrary `uid` parameters.
- Revoke execute from `public`/`anon`; grant only to `authenticated`.
- Add explicit ownership checks and fixed `search_path`.
- Add constraints preventing negative counters and invalid deltas.

**Frontend behavior:**
1. Await each atomic review command before advancing, or queue it with explicit durable/pending UI; never fire-and-forget.
2. Await the completion command before showing final success.
3. Disable rating/finalization while persistence is pending and suppress key-repeat/touch overlap.
4. Display retryable review/completion errors without losing the in-memory session payload.
5. Treat progress-load failure as a blocking recoverable error; never “start fresh” after a transient remote failure.
6. Show XP/achievements only from the authoritative completion result.
7. Invalidate profile, goals, achievements, stats, and leaderboard after success.

**Achievement boundary:** Keep static rule definitions in the client for now, but evaluate them against all-time totals returned by the command. Unlock inserts remain idempotent. If achievements must be transactionally bundled later, move rule metadata server-side in a separate decision.

**Verification:**
```bash
pnpm --filter @1000words/app test -- StudySession.test.tsx
supabase db reset
pnpm --filter @1000words/app supabase:smoke
pnpm e2e -- study.spec.ts persistence.spec.ts
pnpm review
```

**Acceptance:** A double click, network retry, or repeated request cannot double-award XP, goals, streaks, logs, or achievements.

**Commit:** `feat(study): complete sessions atomically and idempotently`

---

## Slice 8 — Atomic, Trusted Purchase and Equip Commands (B3.3/B5)

**Objective:** Prevent inventory/balance divergence and client-price tampering.

**Files:**
- Add migration: `supabase/migrations/<timestamp>_atomic_shop_commands.sql`
- Modify: `packages/app/src/data/types.ts`
- Modify: `packages/app/src/data/inventory/supabaseInventoryRepository.ts`
- Modify: `packages/app/src/data/inventory/mockInventoryRepository.ts`
- Modify: `packages/app/src/features/shop/ItemDetail.tsx`
- Update shop/equip tests and RLS tests

**Database design default:**
- Add a minimal trusted `store_catalog` containing `item_id`, `token_cost`, `slot`, `achievement_requirement`, and active status. Presentation copy/icons may remain in the client fixture.
- `purchase_item(item_id, request_id)` reads the trusted price, verifies requirements and balance, deducts tokens, inserts inventory, and returns updated balance plus inventory record in one transaction.
- Duplicate ownership/request IDs return an idempotent result rather than charging twice.
- `equip_item(item_id)` verifies ownership and item slot before upsert.

**Repository contract:**
- Replace `purchase(userId, itemId, xpCost): Promise<void>` with a command that does not accept authoritative client price and returns updated state.
- Mirror all checks in demo mode.

**Tests:**
- Insufficient balance, exact balance, duplicate purchase, repeated request ID, invalid item, unmet achievement, concurrent purchase, success, equip unowned item, equip wrong slot, and backend failure.

**Verification:**
```bash
supabase db reset
pnpm --filter @1000words/app test -- ItemDetail.test.tsx
pnpm --filter @1000words/app supabase:smoke
pnpm review
```

**Commit:** `feat(shop): purchase and equip through trusted atomic commands`

---

## Slice 9 — Make the Gamification Model Coherent (B5)

**Objective:** Give XP, levels, tokens, streaks, goals, achievements, inventory, and leaderboard one consistent set of rules.

**Files:**
- Modify: `packages/app/src/lib/leveling.ts` and tests
- Modify migration/RPC level formula in `20260624000000_leaderboard_rpc.sql` through a new migration
- Modify: `packages/app/src/lib/achievementEngine.ts` and add tests
- Modify goal/profile/stats/leaderboard repositories and page components
- Modify: `SettingsPage.tsx`
- Add timezone/profile migration if settings JSON is insufficient for indexed/server-side date rules

**Steps:**
1. Decide and document one XP-to-level curve. Default: keep the app helper as canonical, then duplicate it in a named SQL function with parity tests; remove the current 500-vs-250 mismatch.
2. Preserve lifetime XP and spendable tokens as separate concepts. Purchases spend tokens only; never reduce lifetime XP.
3. Compute streak updates server-side using a stored IANA timezone and explicit cases: same day, consecutive day, missed day, DST/timezone boundary.
4. Record actual session duration and update `minutes_studied`; use real cards reviewed and XP earned for other goals.
5. Read daily goal targets from user settings or a documented server default; remove hardcoded divergence.
6. Evaluate cumulative achievements from all-time totals, not current-session counts. Keep unlocks idempotent and notifications once-only.
7. Replace random demo stats with deterministic data derived from demo review events.
8. Fix leaderboard aggregation fan-out (`count(distinct achievement_id)` or separate aggregates), compute the current user’s true rank, and define deterministic tie ordering.
9. Define leaderboard period, metric, privacy, and refresh behavior in docs; keep demo entries clearly synthetic and update the demo user from actual demo XP/achievements/equipment.
10. Return refreshed totals from commands and update all visible surfaces immediately.

**Tests:**
- Level parity between TS and SQL boundary examples.
- Streak cases across same day/consecutive/missed day/timezone transitions.
- Goal increments for cards, minutes, and XP where supported.
- Achievement first session, perfect session, all-time thresholds, streak thresholds, and already unlocked.
- Leaderboard ties, current-user pinning, privacy, and refreshed values.

**Commit:** `fix(gamification): unify progression goals streaks and ranking`

---

## Slice 10 — Study Experience, Settings, Speech, Accessibility, and Mobile (B4)

**Objective:** Make the complete study loop resilient and usable by keyboard, screen reader, touch, and Capacitor users.

**Files:**
- Modify: `StudySession.tsx`, `speechRecognition.ts`, `SettingsPage.tsx`, `index.css`
- Create: `features/shared/ConfirmDialog.tsx`
- Create or extend tests for study/settings/speech
- Update native setup documentation in `README.md`/`capacitor.config.ts`

**Steps:**
1. Add pre-session summary with due/new/total counts and selected language.
2. Add an intentional exit dialog; define and test whether uncompleted local ratings are discarded or resumable. Default: ratings are committed only with session completion after Slice 7, so exit discards the pending session after confirmation.
3. Track real elapsed session time.
4. Initialize settings from `profile.settings`, consume `autoAdvance`, and remove notification controls unless real notification delivery is separately implemented.
5. Define speech states: unsupported, permission denied, listening, match, no match, timeout, and device error. Keep pronunciation advisory and separate from FSRS rating.
6. Add semantic progress values, live announcements for reveal/result/completion, visible focus, and logical focus restoration.
7. Replace clickable non-semantic dashboard/profile/goal containers with links/buttons, and replace settings label/div toggles with native checkboxes or correctly implemented switches.
8. Add a global visible `:focus-visible` treatment and remove nested interactive controls from the flashcard’s button-like container.
9. Prevent double ratings from keyboard/touch while a command is pending.
10. Add `prefers-reduced-motion: reduce` behavior for page, card, toast, progress, and completion animations.
11. Add safe-area padding for study headers/actions and other fixed controls, not only bottom navigation.
12. Verify 320px width, reduced viewport height, orientation change, and practical 44px touch targets.

**Verification:**
```bash
pnpm --filter @1000words/app test -- StudySession.test.tsx SettingsPage.test.tsx
pnpm e2e -- study.spec.ts
pnpm --filter @1000words/app cap:build
pnpm review
```

**Manual matrix:** keyboard-only session; screen-reader announcements; 320px portrait; landscape/short viewport; iOS/Android microphone denied/granted; offline deck/audio behavior.

**Commit:** `feat(study): harden accessible mobile session experience`

---

## Slice 11 — Shared UI, Responsive, and Automated Accessibility Pass (B6)

**Objective:** Standardize only repeated patterns and enforce release-quality responsive/a11y behavior.

**Files:**
- Add selected primitives under `packages/app/src/features/shared/`:
  - `PageShell.tsx`
  - `AsyncState.tsx`
  - `ConfirmDialog.tsx`
  - `FormField.tsx`
  - `ActionBar.tsx`
  - `Progress.tsx`
- Incrementally modify feature pages and `index.css`
- Add Playwright accessibility tooling/config and primary-flow checks

**Steps:**
1. Inventory repetition first; create a primitive only when at least two real screens share the behavior.
2. Standardize loading, empty, offline, permission, and recoverable-error states.
3. Replace click-only labels/toggles with native controls and correct label associations.
4. Add dialog focus trap, initial focus, Escape close, focus return, and modal semantics.
5. Correct headings, landmarks, progress semantics, icon names, and contrast.
6. Define tested phone/tablet/desktop breakpoints and max-width behavior.
7. Add automated axe checks for login, dashboard, study, settings, shop, and completion. Treat critical/serious violations as failures.
8. Preserve current design tokens and product visual language; do not introduce a component framework or broad redesign.

**Verification:**
```bash
pnpm --filter @1000words/app test
pnpm e2e
pnpm review
```

**Commit:** `refactor(ui): standardize responsive accessible interaction states`

---

## Slice 12 — Release Automation and Acceptance Gates (B8)

**Objective:** Make web, Supabase, GitHub Pages, and mobile release claims repeatable and evidenced.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `playwright.config.ts`
- Add/extend: `e2e/routes.spec.ts`, `study.spec.ts`, `shop.spec.ts`, `settings.spec.ts`, `gamification.spec.ts`, `a11y.spec.ts`
- Add Supabase integration workflow/scripts as needed
- Add release checklist documentation under `docs/`

**CI jobs:**
1. `quality`: install, lint, typecheck, unit/component tests, content validation.
2. `production-build`: build with `BASE_URL=/1000-words/`, verify expected decks/audio/404 artifact.
3. `e2e-demo`: serve the production build and run Playwright primary flows.
4. `supabase-integration`: start/reset local Supabase, run RLS/RPC/idempotency tests and smoke checks.
5. `deploy`: deploy only after required build/test jobs pass.
6. `hosted-smoke`: after deployment, test actual Pages deep links and assets with `PLAYWRIGHT_BASE_URL`.

**Required flows:**
- Demo login → dashboard → study → complete → refreshed profile/goals.
- Production signup/sign-in → study → reload → persistent progress.
- Purchase/equip, insufficient balance, duplicate request safety.
- Settings persistence and consumed behavior.
- Achievement unlock and leaderboard refresh.
- Direct `/1000-words/dashboard`, `/study/en-es`, and `/profile/settings` navigation.

**Mobile release matrix:**
- iOS and Android: install, auth, study, bundled audio, microphone permission, background/foreground, hardware back on Android, safe areas, offline launch, online mutation error, and upgrade preservation.
- Native projects are generated/ignored, so document and automate required permission patching where possible; do not rely only on comments in `capacitor.config.ts`.

**Release gate:** no P0/P1 defects in auth, deck loading, routing, persistence, purchases, study completion, or mobile interaction; required status checks attached to the commit.

**Commit:** `ci: enforce production web supabase and release checks`

---

## Slice 13 — Typed Language Registry (B7.2, after B1-B6)

**Objective:** Replace duplicated language maps with one typed, build-validated registration model.

**Files:**
- Create/export: `packages/content/src/languages.ts`
- Modify: `packages/content/src/schema.ts`, `index.ts`, validator and generator config
- Modify consumers: `App.tsx`, `DashboardPage.tsx`, `features/shared/icons.tsx`, `speechRecognition.ts`, `wordData.ts`
- Add registry tests and build validation

**Design:**
- Registry fields: pair ID, source/target codes, display name, native name, icon key, speech locale, deck asset path, audio directory, availability, and supported study directions.
- Keep registry data serializable. Resolve `iconKey` to React SVG components in an app-only mapping.
- Derive `LangPairSchema` from the canonical registry or validate strict parity so two lists cannot drift.
- Build validation confirms every available language has a valid deck, audio references, locale, and icon mapping.

**Acceptance:** Adding a supported language requires one registry entry plus content/assets, not edits across five app files.

**Commit:** `refactor(content): centralize typed language registration`

---

## Slice 14 — Reverse-Direction Study (B7.1, after registry and stabilization)

**Objective:** Add target→English production practice as an independent scheduling unit without scattering direction conditionals.

**Files:**
- Modify engine/domain types under `packages/engine/src/`
- Modify content/language registry types
- Add Supabase migration for direction-aware progress/logs
- Modify `progressStore.ts`, `progressStore.mock.ts`, `StudySession.tsx`
- Add typed-answer normalization utility and tests
- Extend E2E and migration tests

**Data model default:**
- Add `StudyDirection = "recognition" | "production"`.
- Key scheduling state by `(user_id, card_id, direction)`; migrate existing rows to `recognition`.
- Include direction in review logs and localStorage keys; provide a local migration for existing demo progress.

**UX default:**
- Recognition remains current target-word prompt → English reveal.
- Production presents English → typed target-language answer.
- Normalize Unicode, whitespace, case, and language-appropriate punctuation; show corrections visibly.
- Manual confidence rating remains authoritative for FSRS.
- Production direction is opt-in after a documented mastery threshold.

**Tests:** engine/session direction isolation, migration preservation, answer normalization per language, keyboard/input behavior, persistence, retry/idempotency, and full E2E for each direction.

**Commit:** `feat(study): add independent reverse-direction scheduling`

---

## 5. Repository-Wide Verification Matrix

### Audited baseline at `d8890c7`

- App tests: 10 passed, 4 Supabase/RLS tests skipped without local stack credentials.
- Playwright: 17/17 demo-mode Desktop Chromium tests passed.
- Content tests: 4 passed; engine tests: 14 passed.
- Root/app builds and a `/1000-words/` base-path build passed in audit runs; one aggregate Windows run encountered a transient generated-file lock, so CI must make generated-asset/build sequencing deterministic.
- Hosted browser recovery for `/1000-words/dashboard` works through `404.html`, but the raw deep-link response is HTTP 404 before client-side restoration. Treat this as documented GitHub Pages behavior unless hosting/routing changes.

### Fast per-task loop
```bash
pnpm --filter @1000words/app test -- <target-test-file>
pnpm --filter @1000words/app typecheck
```

### Required per-PR gate
```bash
pnpm review
```

### Browser integration
```bash
pnpm e2e
```

### Production base-path artifact
```bash
BASE_URL=/1000-words/ pnpm --filter @1000words/app build
```

### Supabase contract/RLS work
```bash
supabase db reset
pnpm --filter @1000words/app test -- '*.rls.test.ts'
pnpm --filter @1000words/app supabase:smoke
```

### Capacitor-impacting work
```bash
pnpm --filter @1000words/app cap:build
```
Then run the documented iOS/Android manual smoke matrix on an available simulator/device.

---

## 6. MVP Stabilization Scope

The stabilization MVP is complete after Slices 0-10 when all of the following hold:

- Active docs match shipped behavior.
- Missing/malformed decks fail explicitly and recoverably.
- Every route and base path is tested.
- Critical components/repositories have behavior coverage.
- Demo services survive navigation and are deterministic.
- Successful mutations refresh affected screens.
- Study completion and purchase are atomic/idempotent.
- XP/levels/tokens/streaks/goals/achievements use coherent rules.
- Study works by keyboard and at 320px, respects reduced motion, and reports speech/content failures honestly.
- `pnpm review`, relevant E2E, and Supabase integration checks pass.

B6 shared-component consolidation and B8 release automation should follow immediately, but B7 forward features must not begin before this stabilization MVP is verified.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Atomic completion RPC becomes too large | Keep one narrow command payload and return model; separate catalog/read queries from the transaction. Add idempotency and integration tests before UI wiring. |
| Client-supplied shop price remains exploitable | Put security-critical catalog fields in Postgres and accept only `item_id` + request ID from the browser. |
| `SECURITY DEFINER` bypasses RLS unexpectedly | Use `auth.uid()`, fixed `search_path`, explicit grants/revokes, validation constraints, and cross-user tests. |
| Global jsdom breaks live RLS tests | Use per-file environment annotations or separate Vitest projects. |
| Refresh coordinator grows into an ad-hoc cache framework | Keep named domains and command-returned snapshots; trigger the state-library checkpoint if coordination spreads. |
| GitHub Pages tests pass only in dev mode | Build with repository base path, serve `dist`, then smoke the actual hosted URL. |
| Mobile permission setup is lost when native projects regenerate | Script/document native permission patches and verify them in the mobile release checklist. |
| Reverse direction corrupts existing FSRS state | Add a direction column with a migration default of `recognition`; test production/recognition isolation and localStorage migration. |
| Large UI cleanup hides behavior regressions | Introduce shared primitives only after behavioral tests and migrate one repeated pattern at a time. |

---

## 8. Open Product/Architecture Questions and Recommended Defaults

1. **What is the canonical XP level curve?**
   - Recommended default: choose the existing app helper behavior, document it, expose a matching SQL function, and add parity tests. Do not leave app and leaderboard formulas different.
2. **Does exiting an incomplete study session persist partial reviews?**
   - Recommended default after atomic completion: no; confirm exit and discard the uncommitted session. Add resume later only with an explicit draft-session model.
3. **Should notification settings remain?**
   - Recommended default: remove/disable them until a real web/native notification capability is planned and implemented.
4. **Where does trusted shop pricing live?**
   - Recommended default: a minimal Postgres `store_catalog` containing only security-critical fields; keep presentation metadata client-side.
5. **How is user timezone chosen?**
   - Recommended default: initialize from `Intl.DateTimeFormat().resolvedOptions().timeZone`, persist the IANA name in settings/profile, allow future correction, and calculate streak/day boundaries server-side.
6. **Should the custom router be replaced?**
   - Recommended default: no. First centralize and test it; replace only if the post-test decision gate fails.
7. **Should a query/state library be added?**
   - Recommended default: no. Implement named invalidation first and revisit only with concrete duplication evidence.
8. **Leaderboard period and metric?**
   - Recommended default: explicitly label the current all-time metric for stabilization; design weekly/seasonal ranking separately rather than implying a period that is not stored.

---

## 9. First Execution Recommendation

Start with **Slice 0** as a documentation-only PR, then **Slice 1** as the enabling test-harness PR. After those merge, execute **Slice 2 (honest deck failure)** and **Slice 3 (router coverage)** as separate P0 PRs. Do not combine the state/mutation work with either P0 reliability fix.
