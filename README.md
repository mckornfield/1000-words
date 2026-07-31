# 1000 Words — Spaced-Repetition Vocabulary Learning App

1000 Words is a React vocabulary-learning app built around FSRS scheduling, bundled language decks, audio, optional speaking practice, and a gamified progression loop. It runs as a Vite SPA and is configured for GitHub Pages and Capacitor packaging.

## Current Capability Matrix

| Area | Current repository state |
|---|---|
| Languages | English → Spanish (`en-es`), Mandarin (`en-zh`), Korean (`en-ko`), and Japanese (`en-ja`) decks are registered and bundled. |
| Study | FSRS session building, reveal/rating flow, keyboard shortcuts, persisted progress, and review logging are implemented. |
| Audio and speech | Bundled MP3 playback is implemented. Speaking practice uses the Web Speech API where supported and the Capacitor speech-recognition plugin on native builds. |
| Product UI | Authentication, dashboard, lessons, achievements, shop, profile, objectives, settings, and leaderboard routes/components are present. |
| Runtime modes | Demo mode uses local/mock repositories. Production-mode Supabase auth and repository adapters are present. |
| Deployment | Local Vite development and GitHub Pages under `/1000-words/` are configured. Capacitor configuration exists; native `ios/` and `android/` projects are not checked in. |
| Verification | `pnpm review` passes. The app suite passes 139 tests with 16 conditional local-Supabase tests skipped because the stack/CLI is unavailable. Demo-enabled Pages release-candidate Playwright passes 44 desktop, 320px, and short-height checks. |

> Supabase scope: migrations, authentication code, repository adapters, and conditional integration tests are present. The full migration chain and representative study/shop/leaderboard behavior pass in PGlite, but this does **not** replace verification against a running local or hosted Supabase instance; 16 local-stack tests were skipped in the recorded full-app run.

## Active Plan

Active status and forward work are tracked only in [`.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`](./.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md), indexed by [`.planning/in-work/README.md`](./.planning/in-work/README.md). `docs/PLAN.md` is the historical bootstrap plan, not a current checklist.

## Prerequisites

- Node.js 22.13 or newer
- pnpm 11.5.2 or newer
- Optional: Supabase CLI/local stack for integration and RLS tests

## Quick Start

```bash
git clone https://github.com/mckornfield/1000-words.git
cd 1000-words
pnpm install
pnpm dev
```

The Vite development server runs at `http://localhost:8080`.

### Demo mode

Demo mode is the default when `VITE_DEMO_LOGIN` is unset. It requires no Supabase project and uses the pre-filled demo credential.

### Production-mode configuration

Create a repo-root `.env` (or provide equivalent environment variables):

```dotenv
VITE_DEMO_LOGIN=false
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Client-side Supabase variables are public by design; RLS and secure RPC definitions remain the authorization boundary. Never expose a service-role key to the app.

## Commands

```bash
pnpm dev                                  # local Vite app
pnpm build                                # build all workspace packages
pnpm test                                 # run all Vitest suites
pnpm --filter @1000words/app test         # focused frontend tests
pnpm --filter @1000words/app typecheck    # app TypeScript check
pnpm e2e                                  # Playwright browser suites
pnpm review                               # lint → typecheck → test → content validation → build
pnpm --filter @1000words/app supabase:smoke  # requires Supabase configuration
```

## Repository Layout

```text
1000-words/
├── packages/
│   ├── engine/                 # pure TypeScript FSRS scheduler/session builder
│   ├── content/
│   │   ├── data/               # en-es, en-zh, en-ko, en-ja decks
│   │   ├── scripts/            # generation, validation, and app sync
│   │   └── src/schema.ts       # Card/LangPair Zod schemas
│   └── app/
│       ├── public/             # synced decks/audio and GitHub Pages fallback
│       └── src/
│           ├── App.tsx         # auth, routing, repository composition
│           ├── config/         # environment parsing
│           ├── data/           # contracts plus demo/Supabase implementations
│           ├── features/       # UI by real feature: lessons, profile, shop, etc.
│           ├── lib/            # router, deck loader, speech, Supabase helpers
│           └── test/           # deterministic React test utilities
├── e2e/                        # Playwright auth, study, and persistence suites
├── supabase/migrations/        # schema, RLS, and RPC migrations
├── .github/workflows/          # CI and GitHub Pages deployment
├── .planning/in-work/          # authoritative active tracker
└── docs/PLAN.md                # historical bootstrap plan
```

## Architecture Notes

- Static card content is bundled with the app; per-user scheduling/progression state is accessed through repository contracts.
- `App.tsx` selects demo or Supabase implementations and injects them through `AppContext`.
- The custom router centralizes base-path parsing/building for local `/` and GitHub Pages `/1000-words/` deployments.
- Deck JSON is validated at runtime. Failed or malformed deck loads show a recovery state rather than synthetic study cards.
- The engine package stays UI- and I/O-free.

## Testing and Deployment

### Web

`pnpm dev` serves the root-base local app. `.github/workflows/deploy.yml` builds a production-optimized, demo-enabled artifact with `BASE_URL=/1000-words/` and deploys the tested `packages/app/dist` to GitHub Pages. `packages/app/public/404.html` supports SPA deep-link restoration.

### Browser E2E

Playwright suites cover demo authentication, Spanish/Mandarin study behavior, demo progress persistence, shipped artifact routes/assets, and serious/critical accessibility checks at desktop, 320px, and short-height viewports. The workflow artifact is deliberately demo-enabled for deterministic authenticated-route checks; it is not evidence of production Supabase authentication. Hosted deployment smoke and live production-Supabase acceptance still require release-run evidence.

### Mobile

```bash
pnpm --filter @1000words/app cap:sync
pnpm --filter @1000words/app cap:ios
pnpm --filter @1000words/app cap:android
```

Capacitor and native speech code are configured, but native project directories are not committed. Generate/sync them on a machine with Xcode or Android Studio before device testing.

## Forward Roadmap

Do not infer completion from this summary. The active Lane B tracker owns status. Atomic study/shop mutations, explicit refresh, typed language registration, production-artifact E2E, and accessibility/mobile hardening are implemented; remaining gates include live Supabase migration/RLS execution, hosted smoke evidence, deeper production-auth coverage, native-project reproducibility, and full reverse-direction scheduling architecture.
