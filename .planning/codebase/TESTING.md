# Testing Patterns

_Last updated: 2026-06-22_

## Summary

All three packages use Vitest as the test runner. Tests are co-located with the source files they cover. The engine package has thorough unit tests for FSRS scheduling logic; the content package validates card schema; the app package has one integration-only RLS test that auto-skips when Supabase credentials are absent. There are no React component tests.

---

## Test Framework

**Runner:** Vitest (all packages)

| Package | Version |
|---------|---------|
| `@1000words/engine` | vitest `^4.1.8` |
| `@1000words/app` | vitest `^4.1.8` |
| `@1000words/content` | vitest `^4.1.8` |

**Assertion library:** Vitest built-in (`expect`) — no separate assertion library.

**Import style:**

```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest";
```

---

## Run Commands

```bash
pnpm test                                    # run all packages (pnpm -r test)
pnpm --filter @1000words/app test            # app tests only
pnpm --filter @1000words/engine test         # engine tests only
pnpm --filter @1000words/content test        # content tests only
pnpm review                                  # full quality gate: lint→typecheck→test→validate→build
```

Tests run with `vitest run` (single pass, no watch). The `--passWithNoTests` flag is set for the app package so a missing test file does not fail CI.

---

## Test File Organization

**Location:** Co-located with source — test files live next to the module they test.

**Naming:** `<module>.test.ts` (no `.spec.` variant used).

**All test files:**

| File | Package | Type |
|------|---------|------|
| `packages/engine/src/engine.test.ts` | engine | Unit |
| `packages/content/src/schema.test.ts` | content | Unit |
| `packages/app/src/data/progressStore.rls.test.ts` | app | Integration (conditional) |

**Engine vitest config** (`packages/engine/vitest.config.ts`) explicitly includes `src/**/*.test.ts`.

**App vitest config** (`packages/app/vitest.config.ts`) uses a setup file to load `.env` from the repo root.

---

## Test Structure

**Standard suite pattern:**

```typescript
import { describe, expect, it } from "vitest";

describe("<module>", () => {
  it("<behavior description>", () => {
    // arrange
    const input = ...;
    // act
    const result = ...;
    // assert
    expect(result).toBe(...);
  });
});
```

**Nested describes** group by function name, then behavior variants:

```typescript
describe("scheduleReview", () => {
  it("advances reps and stamps lastReview to `now` for any rating", () => { ... });
  it("schedules due >= now (no past-due cards from a fresh review)", () => { ... });
  it("'easy' schedules further out than 'good'", () => { ... });
});
```

---

## What Is Tested

### `packages/engine` — `engine.test.ts`

Comprehensive unit coverage of the three public exports from `packages/engine/src/index.ts`:

- **`initialState(now)`** — returns serializable FSRS state with correct defaults
- **`scheduleReview(state, rating, now)`** — correctness of reps increment, lastReview timestamp, due-date ordering across ratings, lapse counting on "again" in Review state, JSON round-trip stability, immutability (does not mutate input)
- **`buildSession(cards, progress, options)`** — empty deck, future-due exclusion, ascending due-date ordering, `newCardsPerDay` introduction of unseen cards, `maxCards` cap behavior

Fixtures: inline factory functions (`card(id)`, `dueState(due)`) — no external fixture files.

### `packages/content` — `schema.test.ts`

Zod schema validation for the `CardSchema`:

- Accepts all cards in `src/fixtures/sample-cards.ts`
- Rejects unknown language pairs
- Rejects invalid audio paths (wrong prefix or extension)
- Verifies `LANG_PAIRS` exports include `"en-es"` and `"en-zh"`

### `packages/app` — `progressStore.rls.test.ts`

Live integration test against a local Supabase stack. Uses `describe.skipIf(!hasStack)` to skip automatically when env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are absent.

**What is tested:**
- User B cannot read User A's `card_progress` rows (RLS isolation)
- User B cannot overwrite User A's `card_progress` rows
- User B cannot read User A's `review_logs` rows
- User A can successfully write and read back their own progress

**Setup/teardown:** `beforeAll` provisions two test users via the Supabase admin API; `afterAll` deletes them.

---

## Conditional Test Pattern (Integration Tests)

```typescript
const hasStack = Boolean(URL && ANON && SERVICE);

describe.skipIf(!hasStack)("ProgressStore RLS isolation", () => {
  // runs only when all three env vars are set
});
```

This pattern allows integration tests to live in the same test suite as unit tests without requiring a Supabase instance in standard CI.

---

## Setup Files

**`packages/app/vitest.setup.ts`** — loaded before all app tests via `setupFiles`:

```typescript
// Loads repo-root .env into process.env using Node 22's built-in env-file loader
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}
```

No global mocks, DOM setup, or test utilities are registered in setup files.

---

## Mock/Fixture Strategy

**Engine tests:** Inline factory helpers — no shared fixture files.

**Content tests:** `src/fixtures/sample-cards.ts` — a curated set of real cards imported directly.

**App integration tests:** Live Supabase clients provisioned in `beforeAll`; no mock clients.

**Demo mode (not tests):** `mock<Feature>Repository.ts` files in `packages/app/src/data/` provide in-memory implementations used at runtime in demo mode. These are not used as test mocks — there are currently no React component tests that would need them.

---

## Coverage

**No coverage thresholds configured.** No coverage tooling is invoked in `scripts/review.sh` or any package `test` script.

**Coverage gaps (significant):**

| Gap | Impact |
|-----|--------|
| No React component tests for any feature | `StudySession.tsx`, `StatsPage.tsx`, `SettingsPage.tsx`, `ItemDetail.tsx`, and all other UI components are untested |
| No unit tests for repository implementations | `supabaseProfileRepository.ts`, `supabaseAchievementRepository.ts`, etc. are exercised only by the conditional RLS integration test |
| No tests for mock repositories | `mockProfileRepository.ts`, `mockAchievementRepository.ts`, etc. are untested |
| No tests for `lib/router.ts`, `lib/auth.ts`, `config/appConfig.ts` | Core app infrastructure has no test coverage |
| RLS test requires live Supabase | Skipped in standard CI without Docker |

---

## Adding New Tests

- Place test file adjacent to the module: `src/data/goals/mockDailyGoalRepository.test.ts`
- Use `describe` blocks named after the export under test
- Import from `vitest` explicitly: `import { describe, expect, it } from "vitest"`
- For integration tests requiring env vars, use `describe.skipIf(!hasStack)` pattern
- For async tests, mark the callback `async` and `await` the result before asserting
