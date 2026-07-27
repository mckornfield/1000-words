# Architecture

_Last reconciled: 2026-07-26_

## System Shape

1000 Words is a pnpm monorepo with three packages:

- `@1000words/engine`: pure TypeScript FSRS scheduling and session construction.
- `@1000words/content`: Zod card schema, four static decks, and generation/validation/sync scripts.
- `@1000words/app`: React 19/Vite UI, custom router, repositories, auth, Supabase integration, and Capacitor configuration.

## Runtime Data Flow

1. `wordData.ts` loads `en-es`, `en-zh`, `en-ko`, or `en-ja` JSON using the configured Vite base path.
2. `CardDeckSchema` validates the payload. Typed failures stop the session and show Retry/Return Home; no synthetic deck is created.
3. `StudySession.tsx` loads per-user progress through `ProgressStore` and passes cards/progress to `buildSession()`.
4. Ratings call the engine and write progress/review logs through the injected store.
5. Profile, goals, achievements, inventory, stats, and leaderboard data go through repository contracts.

## Composition and Runtime Modes

`App.tsx` selects implementations and provides them through `AppContext`:

- Demo mode uses local/mock implementations and does not require Supabase.
- Production mode uses Supabase auth and repository adapters when configured.

Migrations and adapters exist, but the current foundation verification skipped four local-stack tests. Do not describe the production data path as live-verified from that run.

## Routing and Deployment

The dependency-free router centralizes route definitions, base normalization, parsing, URL construction, and navigation. It supports local `/` and GitHub Pages `/1000-words/`. `public/404.html` plus hosted-path restoration provide the SPA fallback. Unit coverage exists; actual hosted smoke verification remains pending.

## Audio and Speech

Card audio is bundled. Speaking practice maps all four language pairs to BCP-47 locales and chooses Web Speech or the Capacitor community plugin at runtime. Availability and permissions remain browser/device dependent.

## Persistent Constraints

- Keep the engine pure and I/O-free.
- Keep static decks separate from per-user state.
- Components consume interfaces from `AppContext`, not concrete repositories.
- Demo mode must not call Supabase.
- Compound reward/purchase operations should be atomic or idempotent.
- Active status lives only in `.planning/in-work/`.
