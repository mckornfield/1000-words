# Testing Patterns

_Last reconciled: 2026-07-26_

## Tooling

- Vitest runs unit, component, and conditional integration tests.
- The app uses `jsdom`, React Testing Library, `user-event`, and `@testing-library/jest-dom`.
- `packages/app/src/test/createTestServices.ts` and `renderApp.tsx` provide deterministic context/render helpers.
- Playwright specs live in `e2e/`.
- The app test script is `vitest run`; it no longer uses `--passWithNoTests`.

## Current Focused Coverage

- Environment parsing in `appConfig.test.ts`.
- All current custom-router patterns at root and GitHub Pages bases, parameter encoding, unknown routes, navigation, and hosted fallback reconstruction.
- Deck URL resolution, caching/coalescing, Zod validation, retry, and typed load failures.
- StudySession deck/progress loading recovery and mutation blocking on load failure.
- Supabase profile reward-RPC mapping/error propagation using an injected client.
- Existing engine/content tests.
- Conditional local-Supabase RLS/RPC suites.

## Browser E2E Already Present

- Demo authentication and auth guard.
- Spanish/Mandarin study interactions and completion.
- Demo FSRS progress persistence across navigation/reload.

These suites exist today; they are not a future-only test plan. Hosted GitHub Pages, all four languages, production-Supabase, broader mutations, and mobile flows still need the active roadmap's release coverage.

## Verification Evidence

- Historical checkpoint (2026-07-26, superseded): **52 focused frontend tests passed; 4 local-Supabase tests skipped** because the stack/CLI was unavailable.
- Current local baseline (2026-07-26): **139 passed; 16 conditional local-Supabase tests skipped** because a configured local Supabase stack was unavailable.
- App typecheck passed. The 16 skips do **not** establish live or hosted Supabase verification.
- The active Lane B roadmap is the source of truth for current release-gate evidence.

## Remaining Gaps

- Full StudySession reveal/rating/completion/speech/mutation-failure component coverage.
- Login, dashboard, settings, shop, achievements, and leaderboard component behavior.
- Deterministic contract tests for all mock repositories and mapping/error tests for all Supabase repositories.
- Comprehensive RLS coverage against a running local stack.
- Actual hosted deep-link smoke and native device matrices.

## Commands

```bash
pnpm --filter @1000words/app test
pnpm --filter @1000words/app typecheck
pnpm test
pnpm e2e
pnpm review
```

Report whether each gate passed, skipped, or was not run. Do not translate conditional skips into Supabase verification.
