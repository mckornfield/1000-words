# Lane B Stabilization and Continuation Roadmap

## Objective

Turn the existing feature-rich frontend into a trustworthy, testable, mobile-ready product without expanding architecture faster than the product requires.

This roadmap prioritizes Lane B: application shell, study experience, frontend data orchestration, gamification, accessibility, responsive behavior, and user-facing release quality. Lane A work is included only where Lane B requires a backend contract or atomic operation.

## Scope Boundaries

### Lane B owns

- React components and navigation.
- User-facing loading, empty, success, and error states.
- App-context contracts and frontend repository consumption.
- Study-session orchestration and interaction design.
- Gamification presentation and state refresh behavior.
- Accessibility, responsive layout, and Capacitor-facing UI behavior.
- Component, route, and end-to-end tests.

### Lane B coordinates with Lane A for

- Atomic Supabase RPCs and migrations.
- RLS policy changes and database integration tests.
- FSRS state-model changes.
- Content-registry and language-deck contracts.

### Out of scope until the stabilization phases pass

- Additional language generation.
- Personalized FSRS parameter optimization.
- Large visual redesigns.
- Social/community systems beyond the existing leaderboard.
- A broad state-management rewrite.

---

## Priority Sequence

| Phase | Priority | Outcome |
|---|---:|---|
| B0 | P0 | Planning and documentation accurately describe the current product. |
| B1 | P0 | Content failures and routing failures are explicit, recoverable, and tested. |
| B2 | P0 | The frontend has a practical automated test foundation around critical behavior. |
| B3 | P0 | User actions produce consistent, refreshable state across demo and production modes. |
| B4 | P1 | The study loop is resilient, accessible, and mobile-friendly. |
| B5 | P1 | Gamification systems form one coherent, correctly persisted progression loop. |
| B6 | P1 | Shared UI patterns replace one-off behavior and support responsive/mobile release. |
| B7 | P2 | Lane B is prepared for reverse-direction study and scalable language registration. |
| B8 | P0 release gate | Hosted web and mobile builds pass repeatable end-to-end acceptance checks. |

---

# Stabilization Checkpoint — Slices 0–13

Verified on 2026-07-26 for the current intentional uncommitted stabilization diff:

- App tests: **139 passed, 16 skipped**. The skipped tests require a local Supabase stack.
- `pnpm review`: **passed** (lint, typecheck, unit/component tests, content validation, artifact-validator tests, Pages-base build, and artifact validation).
- Demo-enabled Pages release-candidate Playwright: **44 passed** across desktop, 320×568, and 667×320 projects, including serious/critical axe checks. This validates the shipped static artifact and deterministic demo-authenticated routes, not production Supabase authentication.
- PostgreSQL parser validation and the full historical migration chain plus representative study, purchase, equip, and leaderboard behavior in PGlite: **passed**. PGlite is supplementary evidence, not a substitute for Supabase Auth/RLS execution.
- `git diff --check`: **passed**; only line-ending conversion warnings were emitted.

Supabase migrations, auth, repositories, conditional tests, and supplementary PGlite execution are present. This checkpoint does not claim live local or hosted Supabase integration success.

Slice mapping: documentation, deck/runtime honesty, routing, test infrastructure, repository lifetimes, refresh coordination, atomic study/shop commands, gamification consistency, language registration, accessibility/mobile work, and production-artifact release gates are represented below. Live Supabase execution, hosted deployment evidence, native builds, and unfinished product flows remain explicitly open.

---

# Phase B0 — Reconcile the Source of Truth

## Work items

- [x] Rewrite the root `README.md` as a current capability matrix plus forward roadmap.
- [x] Mark `docs/PLAN.md` as the historical bootstrap plan and point active status here.
- [x] Remove references to missing internal planning documents.
- [x] Re-audit `.planning/codebase/CONCERNS.md`, remove resolved findings, and date retained debt.
- [x] Document local Vite, GitHub Pages `/1000-words/`, iOS, and Android delivery boundaries.
- [x] Document all four language pairs, audio/speaking practice, leaderboard, demo mode, and the production-mode Supabase code path without claiming live-stack verification.

## Acceptance criteria

- [x] Implemented core features are no longer presented as future-only work.
- [x] Reconciled documents do not link to nonexistent internal files.
- [x] Historical planning is clearly labeled and active planning points to this tracker.
- [x] The root README gives accurate run, test, deploy, and architecture guidance.

## Verification

Documentation reconciliation was reviewed against current source, tests, workflows, and tracked assets. The focused code checkpoint is recorded above; a repository-wide `pnpm review` was not substituted for the unavailable local-Supabase gate.

---

# Phase B1 — Failure Honesty and Route Reliability

## B1.1 Replace synthetic study fallback with a real recovery state

### Implementation

- [x] Remove generated `fb-*`/`Word N` fallback cards from `StudySession.tsx`.
- [x] Add typed deck/progress load errors with safe details, Retry, and Return Home.
- [x] Prevent study/reward mutations when deck or progress loading fails.
- [x] Validate fetched deck JSON with `CardDeckSchema` at the runtime boundary.
- [x] Distinguish unsupported language, 404, HTTP, invalid JSON, invalid schema, and network failures.
- [x] Log actionable diagnostics without exposing credentials.

### Acceptance criteria

- [x] Missing/malformed decks cannot start a synthetic lesson.
- [x] Retry performs a fresh request without a full refresh.
- [x] Load failure does not mutate progress, logs, XP, goals, or achievements.
- [~] The recovery state moves focus and uses semantic controls; narrow-device manual verification remains pending under B4/B8.

## B1.2 Lock routing behavior with tests before considering replacement

### Implementation

- [x] Add tests for every current route under `BASE_URL=/` and `/1000-words/`.
- [~] Cover parameterized routes, unknown routes, URL construction, and fallback restoration; explicit browser back/forward and auth-redirect route tests remain pending.
- [x] Centralize base-path normalization for parsing and navigation.
- [~] Unit-test fallback reconstruction for `/dashboard`, `/study/en-es`, and `/profile/settings`; actual hosted GitHub Pages smoke remains pending.
- [x] Retain and document the `public/404.html` SPA fallback strategy.

### Decision gate

Keep the current router while centralized behavior remains maintainable and tested. Adopt React Router only in a separate migration if deployment defects or duplicated route metadata continue.

### Acceptance criteria

- [x] Every current route pattern is represented in the focused route matrix.
- [x] Navigation constructs correct local and GitHub Pages paths.
- [~] Deep-link fallback code/tests exist; an actual hosted reload check is still required.

---

# Phase B2 — Frontend Verification Foundation

## Test harness

- [x] Configure Vitest `jsdom` support.
- [x] Add React Testing Library, `user-event`, and jest-dom matchers.
- [x] Add small deterministic `AppContext` service/render helpers.
- [x] Keep test fixtures typed and minimal.
- [x] Remove `--passWithNoTests` from the app test script.

## Required first-wave tests

### Infrastructure

- [x] `appConfig.ts`: demo/production flag parsing and defaults.
- [x] `router.ts`: current routes, both base paths, navigation, fallback, and unknown paths.
- [x] `wordData.ts`: cache/coalescing, asset bases, schema failures, typed errors, and retry.

### Critical user flows

- [~] `StudySession.tsx`: load/empty/progress failures, reveal/rating, mutation retry/idempotency, duplicate input, reverse toggle, and completion are covered by component/E2E tests; speech error-state component coverage remains incomplete.
- [ ] `LoginPage.tsx`: demo login and production signup/sign-in branches.
- [ ] `DashboardPage.tsx`: language navigation, profile display, goals, and stale-data refresh.
- [ ] `SettingsPage.tsx`: persistence, failure feedback, and setting consumption.
- [~] `ItemDetail.tsx`: pending purchase/equip, trusted command boundaries, retry, and refresh are covered; broader insufficient-balance and duplicate-purchase component scenarios remain.

### Repository contracts

- [ ] Deterministic tests for every mock repository.
- [~] Supabase profile reward-RPC mapping/error tests exist; other Supabase repositories remain uncovered.
- [~] Conditional Supabase RPC/RLS tests exist, but 16 were skipped because the local stack/CLI was unavailable; comprehensive live-stack coverage remains pending.

## Coverage policy

Prioritize behavior coverage for routes, production mutations, recoverable errors, the complete study lifecycle, and demo/production contract parity. Add numeric thresholds only after the baseline stabilizes.

## Acceptance criteria

- [x] `pnpm --filter @1000words/app test` runs meaningful infrastructure/component tests (139 passed, 16 conditional local-Supabase tests skipped in the current checkpoint).
- [x] Critical study and shop post-load mutation failures expose pending/error/retry behavior and are asserted in focused tests.
- [x] The app test command no longer passes with zero tests, so `pnpm review` cannot silently accept a removed app suite.

---

# Phase B3 — State Consistency and Mutation Boundaries

## B3.1 Stabilize repository lifetimes

- [x] Ensure demo repositories are initialized once per authenticated demo session, not recreated by unrelated `dashboardData` changes.
- [x] Define reset behavior explicitly for sign-out and an intentional demo reset action.
- [x] Make mock repositories deterministic and persistent for the duration of the session.
- [~] Study and inventory demo/Supabase contracts return equivalent parsed domain shapes; equivalent-shape coverage is not exhaustive for every repository.

### File targets

- `packages/app/src/App.tsx`
- `packages/app/src/data/AppContext.ts`
- `packages/app/src/data/**/*Repository.ts`

## B3.2 Introduce explicit refresh/invalidation

- [x] Define a minimal invalidation contract for profile, goals, achievements, inventory, stats, and leaderboard data.
- [x] After successful study/shop mutations, refresh only the affected domains.
- [x] Avoid reloading static catalog data when user-state data changes.
- [~] Study and shop mutations have explicit pending/success/failure states; not every legacy mutation has been normalized.
- [x] Prevent duplicate study/shop submissions while an operation is pending.

Start with explicit callbacks or a small app-level refresh coordinator. Do not add a global query library until repeated cache invalidation becomes harder than the dependency would simplify.

## B3.3 Make compound user actions atomic

Coordinate with Lane A to provide transactional RPCs for actions that must succeed as one unit:

- [x] `complete_study_session`: progress/log finalization, XP, learning totals, goals, streak, and server-owned achievement evaluation in one idempotent command.
- [x] `purchase_item`: authenticated ownership/balance validation, server-owned pricing, balance deduction, inventory insertion, and updated state.
- [x] Daily-goal/session totals are incremented atomically inside trusted session completion.

Frontend requirements:

- [x] Await compound operations before displaying final success.
- [x] Provide stable retry-safe idempotency keys for reviews, session completion, purchases, and equip requests.
- [x] Display server-returned completion results and retryable errors rather than predicting or fire-and-forgetting rewards.

## Acceptance criteria

- [x] One study completion cannot double-award XP through repeat clicks or retries in demo/static verification; live SQL execution remains a release gate.
- [x] A shop purchase cannot grant an item without deducting the trusted catalog balance in demo/static verification; live SQL execution remains a release gate.
- [x] Dashboard/profile/goals are invalidated/refreshed after successful domain mutations.
- [x] Demo state remains stable during navigation and persists card progress to local storage.

---

# Phase B4 — Study Experience Hardening

## Session behavior

- [ ] Add an explicit pre-session summary: due cards, new cards, total cap, and selected language.
- [ ] Preserve the current due-first FSRS ordering and expose queue counts without leaking scheduling complexity.
- [ ] Add intentional exit behavior: confirm when leaving an active session and define whether partial progress is retained.
- [ ] Track session start/end and real elapsed study time.
- [ ] Consume saved settings such as `autoAdvance`; remove settings that remain intentionally unsupported.
- [x] Disable and synchronously guard rating input while a card mutation is pending.

## Audio and speaking practice

- [ ] Provide distinct unsupported, permission-denied, listening, match, no-match, timeout, and device-error states.
- [ ] Keep pronunciation matching advisory unless product requirements explicitly connect it to FSRS rating.
- [x] Make replay and microphone controls accessible by keyboard and screen reader without nesting controls in the reveal button.
- [ ] Confirm locale mapping for all four supported languages on web and native speech APIs.
- [~] Production-artifact validation covers all 4,000 bundled audio files and representative browser requests; Capacitor build/device evidence remains pending.

## Accessibility and mobile interaction

- [x] Maintain visible focus, logical focus order, and semantic button labels on the verified primary study states.
- [~] Progress and completion have semantic/focus transitions; explicit live announcement coverage for every flip/pronunciation result remains incomplete.
- [x] Ensure rating controls work at 320px width and short-height viewports with mobile safe-area rules.
- [x] Prevent accidental double ratings from touch and keyboard events.
- [x] Respect reduced-motion preferences for session transitions and exercise that preference in Playwright.

## Acceptance criteria

- [x] A complete session can be performed with keyboard only.
- [x] A complete session is usable at 320px and short-height mobile viewports without horizontal document scrolling.
- [x] Deck/progress/asset failures are explicit and recoverable and never produce synthetic study results; full speech-permission state coverage remains tracked above.
- [ ] Saved study settings alter real behavior or are removed from the UI.

---

# Phase B5 — Coherent Gamification Loop

## Streaks

- [ ] Update streaks through an atomic date-aware backend operation.
- [ ] Handle same-day repeat study, consecutive days, missed days, and timezone boundaries.
- [ ] Refresh dashboard/profile streak displays after session completion.
- [ ] Test user-configured or auto-detected timezone behavior explicitly.

## XP, levels, and balances

- [x] Define one 250-XP level progression and server-owned reward calculation boundary.
- [x] Keep lifetime XP and spendable tokens as distinct profile totals; shop purchases deduct tokens only.
- [x] Trusted domain commands prevent negative balances and duplicate awards in demo/static tests; live SQL execution remains a release gate.
- [x] Return updated profile/reward totals from trusted mutation commands.

## Goals and objectives

- [ ] Support cards reviewed, XP earned, and minutes studied using actual session data.
- [ ] Define daily reset boundaries by timezone.
- [ ] Ensure goal completion notifications fire once.
- [ ] Make demo goal progress deterministic and persistent for the session.

## Achievements

- [x] Evaluate achievements from server/demo-owned cumulative totals rather than caller-provided rewards.
- [x] Keep unlock operations idempotent and grant catalog-owned achievement XP once.
- [x] Display newly unlocked achievements only from persisted/server-returned completion results.
- [~] First/perfect/cumulative/already-unlocked paths have focused coverage; broader streak-threshold and live-SQL coverage remains.

## Inventory, customization, and leaderboard

- [x] Use atomic trusted purchase results to update inventory and balance.
- [x] Persist equip state through a trusted request and refresh affected visible state.
- [ ] Define leaderboard period, ranking metric, ties, privacy, and refresh behavior.
- [ ] Ensure demo leaderboard data is clearly deterministic sample data and never mixed with production users.

## Acceptance criteria

- [ ] Completing one session updates every applicable gamification surface consistently.
- [ ] Reloading in production preserves the same state.
- [ ] Repeating or retrying a request cannot duplicate rewards.
- [ ] Demo and production modes follow the same domain rules.

---

# Phase B6 — Shared UI, Responsive Design, and Product Polish

## Shared patterns

- [ ] Introduce shared primitives only for repeated patterns: page shell, async state, form field, confirmation dialog, progress display, card surface, and action bar.
- [ ] Move repeated inline layout and interaction styles into named components or utilities incrementally.
- [ ] Preserve Tailwind/design-token consistency rather than creating component-local color systems.
- [ ] Standardize loading, empty, offline, permission, and recoverable-error presentation.

## Responsive and Capacitor behavior

- [x] Define automated desktop, 320×568, and 667×320 viewport projects plus responsive max-width rules.
- [x] Apply `env(safe-area-inset-*)` where navigation or actions can collide with device cutouts/home indicators.
- [ ] Verify virtual keyboard behavior on login, settings, and future production-answer input.
- [x] Verify narrow portrait and reduced-height landscape-like viewports in production-artifact E2E.
- [x] Apply minimum practical control sizes and verify primary flows at mobile viewports.

## Accessibility

- [x] Run serious/critical axe checks for stable login, dashboard, settings, shop, active/revealed/completed study states in Playwright.
- [~] Primary heading, form-label, progress, focus, and scroll-region issues are corrected; no current dialog exists to verify focus trapping.
- [~] Verified primary-flow contrast in the default test color scheme; explicit dark-scheme axe coverage remains pending.
- [x] Ensure primary-flow icons are decorative or their containing controls have accessible names.

## Acceptance criteria

- [x] No serious or critical axe violations in the tested primary flows.
- [x] Tested primary screens are functional from 320px through desktop widths and at 667×320.
- [ ] Shared async/error behavior is consistent across features.
- [ ] Capacitor safe areas do not obscure navigation or primary actions.

---

# Phase B7 — Lane B Forward Features

## B7.1 Reverse-direction study — Issue #32

Implement only after B1-B5 are stable.

- [ ] Treat recognition and production as independent scheduling units, preferably separate state keys per `(cardId, direction)`.
- [ ] Add a direction/session-mode contract rather than conditionals scattered across `StudySession.tsx`.
- [ ] Add typed-answer input first; use normalized comparison with visible correction rather than silent pass/fail.
- [ ] Allow opt-in after a configurable mastery threshold.
- [ ] Preserve manual confidence rating unless product research supports automatic FSRS rating.
- [ ] Add complete component, engine-contract, persistence, and E2E coverage.

## B7.2 Scalable language registration — Issue #34 support

- [x] Replace duplicated hardcoded language maps in routing/dashboard/content loading/speech/flags with one typed language registry.
- [x] Include display name, pair ID, flag ID, speech locale, asset path, direction support, and availability status.
- [x] Validate every registered shipped language deck and all deck-declared audio assets in the production artifact.
- [x] Keep generation/content work in Lane A; Lane B consumes the registry.

## B7.3 FSRS optimization — Issue #33 UI boundary

Lane A owns optimization and parameter storage. Lane B should only:

- [ ] Show optimization status when enough data exists and the behavior is understandable to users.
- [ ] Avoid exposing raw parameter weights in standard settings.
- [ ] Provide reset/fallback behavior if personalized parameters are invalid.
- [ ] Add no UI until the backend contract and minimum-data threshold are verified against the installed `ts-fsrs` version.

---

# Phase B8 — Release Hardening

## Automated end-to-end flows

- [ ] Demo login → dashboard → study → rating → completion → refreshed goals/profile.
- [ ] Production signup/sign-in against test Supabase → study → reload → progress persistence.
- [ ] Shop purchase/equip and insufficient-balance paths.
- [ ] Settings persistence and consumed behavior.
- [ ] Achievement unlock and leaderboard refresh.
- [~] Built-artifact deep links, reloads, decks, and audio pass under `/1000-words/`; actual hosted Pages smoke evidence remains pending.

## Mobile smoke matrix

- [ ] iOS simulator/device: install, login, study, audio, microphone permission, background/foreground, safe areas.
- [ ] Android emulator/device: same flow plus hardware back behavior.
- [ ] Offline launch with bundled content and clear handling of mutations that require connectivity.
- [ ] Upgrade test preserving local/session and Supabase state.

## CI requirements

- [x] Run `pnpm review` for every pull request.
- [x] Run app component tests and demo-enabled Pages release-candidate Playwright browser tests in CI.
- [x] Run content validation, artifact validation, and a production-base-path build.
- [x] Run zero-skip RLS/Supabase integration suites and smoke checks in dedicated CI/deploy jobs.
- [ ] **Blocking legacy-economy release gate:** inventory existing hosted balances, achievements, inventory/equipment, purchase/session records, and learning totals; approve a backup-backed reconciliation or rebuild plan before release. Preserve data and rollback options—do not assume destructive resets or bulk rewrites are safe.
- [~] Workflows publish job statuses; repository branch-protection requirements must still be configured/verified in GitHub.

## Release acceptance

- [ ] No P0/P1 defects remain open for authentication, study, persistence, routing, purchases, or mobile interaction.
- [ ] User-facing documentation matches deployed behavior.
- [ ] Hosted web smoke tests pass against the actual deployment.
- [ ] iOS and Android smoke matrices are signed off.

---

# Recommended Implementation Slices

Use these as small, reviewable pull requests rather than combining a phase into one large change:

1. Documentation reconciliation only.
2. Deck validation and honest study-load error state.
3. Router normalization plus route tests.
4. App test harness plus infrastructure tests.
5. StudySession component tests and mutation-state handling.
6. Stable demo repository lifetime and deterministic mocks.
7. Refresh/invalidation coordinator.
8. Atomic study-completion backend contract plus frontend integration.
9. Atomic purchase backend contract plus ItemDetail integration.
10. Streak/goal/achievement correctness.
11. Study accessibility and mobile interaction pass.
12. Shared async/error primitives and responsive cleanup.
13. End-to-end and hosted deployment gates.
14. Reverse-direction study architecture and implementation.
15. Typed language registry.

Each slice must include implementation, tests, documentation updates, and a completed verification report in its PR description.

---

# Decision Log

Record decisions here when implementation begins.

| Date | Decision | Rationale | Consequence |
|---|---|---|---|
| 2026-07-26 | Keep only two active planning documents. | Minimize drift and make status obvious. | Historical docs are reconciled in B0 rather than duplicated here. |
| 2026-07-26 | Test and centralize the current router before replacing it. | The recent bug proves missing verification, not automatically that a dependency migration is required. | React Router remains a decision gate, not an assumed rewrite. |
| 2026-07-26 | Remove synthetic study cards on load failure. | Operational failures must never masquerade as learning content. | Study sessions fail explicitly with retry/back actions. |
| 2026-07-26 | Require atomic contracts for compound rewards and purchases. | Fire-and-forget multi-write flows can create divergent user state. | Lane B may require targeted Lane A migrations/RPCs before UI completion. |
| 2026-07-26 | Delay broad state-management adoption. | Explicit invalidation is currently cheaper and easier to audit. | Add a library only after repeated cache coordination proves the need. |
