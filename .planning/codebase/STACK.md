# Technology Stack

_Last reconciled: 2026-07-26_

## Workspace

- pnpm workspace: `packages/app`, `packages/engine`, `packages/content`
- TypeScript, native ESM, strict compiler settings
- Node.js 22.13+ documented project baseline

## Frontend

- React 19 and React DOM
- Vite 7
- Tailwind CSS v4 through `@tailwindcss/vite`
- Capacitor 8 plus community speech-recognition plugin

## Core/Data

- `ts-fsrs` for scheduling
- Zod for card/runtime boundary validation
- `@supabase/supabase-js` for production auth/data adapters
- OpenAI and pinyin tooling for build-time content generation

## Testing

- Vitest 4 across workspace packages
- jsdom + React Testing Library + `user-event` in the app package
- Playwright E2E under `e2e/`
- Conditional Supabase integration/RLS tests

Recorded focused foundation result: 52 frontend tests passed, 4 local-Supabase tests skipped because the stack/CLI was unavailable, and app typecheck passed.

## Delivery

- Local Vite server on port 8080
- GitHub Pages production build under `/1000-words/`
- Capacitor config for iOS/Android; native projects are not committed

Use package manifests/lockfile as the authority for exact dependency versions. Active implementation status is tracked only in `.planning/in-work/`.
