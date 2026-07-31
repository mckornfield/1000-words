# In-Work Planning

**Branch:** `Alex-Staging`  
**Base:** `main` at `d8890c75b67f4257f0e496adf3cbdfbbddb0a64e`  
**Primary plan:** [`LANE_B_STABILIZATION_AND_ROADMAP.md`](./LANE_B_STABILIZATION_AND_ROADMAP.md)

## Purpose

This directory is the single source of truth for active implementation work on `Alex-Staging`. It intentionally contains only this index and the Lane B roadmap. Do not create parallel trackers or revive missing agent-note hierarchies.

`README.md`, `docs/PLAN.md`, `CLAUDE.md`, `.planning/PROJECT.md`, `.planning/STATE.md`, and `.planning/codebase/*.md` describe current context and link back here; they do not own active status.

## Verified Product Baseline

The repository includes:

- React 19 + Vite + Tailwind v4, configured for a Capacitor shell.
- FSRS-backed study sessions, progress writes, and review logs.
- Spanish, Mandarin, Korean, and Japanese decks.
- Bundled audio plus capability-dependent web/native speech-recognition practice.
- Authentication, dashboard, lessons, achievements, shop, profile, objectives, settings, and leaderboard UI/routes.
- Demo repositories and production-mode Supabase auth/data adapters.
- GitHub Pages base-path deployment/fallback configuration.
- Vitest frontend tests and Playwright E2E suites.

Supabase migrations/adapters are present, but the current foundation run did not verify them against a live stack.

## Foundation Verification (2026-07-26)

- Focused frontend tests: **52 passed**.
- Conditional local-Supabase tests: **4 skipped** because the stack/CLI was unavailable.
- App typecheck: **passed**.
- Playwright E2E: present, not rerun for this focused foundation checkpoint.

## Current Risks

- Hosted GitHub Pages deep-link behavior still needs an actual hosted smoke check even though router/base-path unit tests and the SPA fallback are present.
- Frontend coverage is meaningful but incomplete beyond the first infrastructure and StudySession recovery tests.
- Compound progression/purchase mutations and refresh behavior remain later-slice work.
- Native iOS/Android projects are not committed and require platform-specific generation/smoke testing.
- Local/hosted Supabase integration remains unverified in this environment.

## Working Rules

- Work phases in order unless a blocker requires a documented exception.
- Prefer small, independently verifiable vertical slices.
- Do not hide production failures behind fixtures or synthetic data.
- Demo mode must be deterministic and representative, but is not a production security model.
- Add tests with behavior changes.
- Do not add routing/state/data dependencies without passing the roadmap decision gate.
- Use atomic or explicitly idempotent contracts for compound user actions.
- Mark `[x]` only when implementation and the stated verification exist.

## Status Markers

- `[ ]` Not started
- `[~]` Partially implemented or verification pending
- `[x]` Complete and verified
- `[!]` Blocked; blocker is stated

## Definition of Done

```bash
pnpm review
```

When applicable:

```bash
pnpm e2e
pnpm --filter @1000words/app supabase:smoke
```

Report skipped gates explicitly. A focused pass is not a substitute for a hosted, native, or live-Supabase acceptance check.
