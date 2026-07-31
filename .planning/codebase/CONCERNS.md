# Concerns & Technical Debt

_Last re-audited: 2026-07-26_

This file records verified debt, not active task status. Prior findings about untracked feature folders, no component tests, missing achievement invocation, insecure caller-controlled reward RPC UIDs, and synthetic study cards are resolved or superseded and have been removed. Priorities/checkmarks live in the active Lane B tracker.

## Retained Findings

### 2026-07-26 — Live Supabase verification unavailable

Migrations, adapters, reward-RPC unit tests, and conditional local-stack tests exist. The focused run skipped 4 local-Supabase tests because the stack/CLI was unavailable. RLS/RPC behavior therefore remains unverified against a live stack in this environment.

### 2026-07-26 — Compound mutations remain inconsistent

Study completion and purchase/progression flows still include multiple independent calls. A network or policy failure can leave profile, goals, inventory, achievements, or logs out of sync. Later Lane B slices retain atomic/idempotent backend contracts and frontend pending/error handling.

### 2026-07-26 — Repository lifetime and refresh boundaries need hardening

Demo repository lifetime and post-mutation refresh/invalidation are not yet governed by a complete explicit contract. Navigation can expose stale product state. This remains B3 work.

### 2026-07-26 — Frontend coverage is a foundation, not a full safety net

Vitest jsdom, React Testing Library, deterministic render helpers, infrastructure tests, and initial StudySession recovery tests now exist. Missing coverage remains for broad StudySession mutation behavior, login branches, dashboard/settings/shop flows, repository parity, and comprehensive RLS isolation.

### 2026-07-26 — Hosted and native acceptance are incomplete

Router/base-path tests and GitHub Pages fallback/configuration exist, but the focused run did not perform a hosted smoke test. Capacitor and native speech code exist, while checked-in `ios/` and `android/` projects and device sign-off do not.

### 2026-07-26 — Speech UX states are incomplete

Speaking practice exists for all four locale mappings, but permission-denied, unsupported, timeout, no-match, and device-error presentation/coverage is not yet as complete as the B4 acceptance criteria require.

### 2026-07-26 — Gamification correctness remains fragmented

Streak/date behavior, minutes-studied goals, all-time achievement inputs, authoritative XP/token semantics, purchase atomicity, and immediate UI refresh remain future stabilization work. Existing UI/repositories must not be treated as proof that this loop is release-ready.

### 2026-07-26 — Profile bio persistence mismatch

`AppProfile.bio` is represented in the frontend contract but is not fully backed by the current profiles schema/repository mapping. Editing it would not be reliably persisted.

## Verification Reference

Recorded foundation checkpoint: 52 focused frontend tests passed, 4 local-Supabase tests skipped, and app typecheck passed. Playwright suites exist but were not rerun for this checkpoint.
