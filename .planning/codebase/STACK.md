# Technology Stack
_Last updated: 2026-06-22_

## Summary

1000 Words is a TypeScript monorepo managed with pnpm workspaces. The frontend is a React 19 + Vite 7 single-page application styled with Tailwind CSS v4, wrapped in a Capacitor shell for iOS/Android distribution. Business logic is split across three packages: `@1000words/app` (UI), `@1000words/engine` (FSRS scheduler), and `@1000words/content` (word data pipeline).

---

## Languages

**Primary:**
- TypeScript 5.9 — all packages; strict mode + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`

**Secondary:**
- Bash — `scripts/review.sh` CI gate

---

## Runtime

**Environment:**
- Node.js ≥ 22.13 (current: v24.14.0, `.nvmrc` pinned to 23)

**Package Manager:**
- pnpm 11.5.2
- Workspaces: `packages/app`, `packages/engine`, `packages/content`
- Lockfile: present (`pnpm-lock.yaml`)

---

## Frameworks

**Core:**
- React 19.2 — UI rendering (`packages/app`)
- React DOM 19.2 — browser mounting

**CSS:**
- Tailwind CSS 4.3 — utility-first styling via `@tailwindcss/vite` plugin (no config file; uses Vite plugin integration)

**Build:**
- Vite 7.0 — dev server (`:8080`) + production bundler
- `@vitejs/plugin-react` 5.2 — React fast-refresh + JSX transform

**Testing:**
- Vitest 4.1 — test runner for all packages
- Config: `packages/app/vitest.config.ts`, `packages/app/vitest.setup.ts`

**Mobile:**
- Capacitor 8.4 (`@capacitor/core` + `@capacitor/cli`) — wraps Vite `dist/` as a native iOS/Android app
- App ID: `com.thousandwords.app`; webDir: `dist/`

---

## Key Dependencies

**Critical:**
- `ts-fsrs` 5.4.1 (`packages/engine`) — FSRS spaced-repetition algorithm; core scheduling logic
- `@supabase/supabase-js` 2.107 (`packages/app`) — Supabase client for auth, DB queries, RLS
- `zod` 4.4.3 — schema validation in both `app` and `content` packages

**Content Pipeline:**
- `openai` 6.42 — AI-assisted content generation in `packages/content`
- `pinyin-pro` 3.28 — Chinese pinyin romanization
- `dotenv` 17.2 — `.env` loading for content scripts
- `tsx` 4.19 — TypeScript script runner (used for `generate.ts`, `validate.ts`, `sync-to-app.ts`)

---

## TypeScript Configuration

**Base (`tsconfig.base.json`):**
- Target: `ES2022`
- Module: `ESNext`, moduleResolution: `bundler`
- Strict: `true` + `noUncheckedIndexedAccess` + `noImplicitOverride` + `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax`: `true`
- `isolatedModules`: `true`

**App overrides (`packages/app/tsconfig.json`):**
- Lib: `ES2022`, `DOM`, `DOM.Iterable`
- Types: `vite/client`
- JSX: `react-jsx`
- `noEmit`: true (Vite handles transpilation)

---

## Build Configuration

**Vite (`packages/app/vite.config.ts`):**
- Plugins: `react()`, `tailwindcss()`
- Env dir: repo root (`../..`) — single `.env` shared across packages and shell scripts
- Dev server: `host: true`, `port: 8080`, `strictPort: true`

**Linting:**
- ESLint 10.4 with `typescript-eslint` 8.60 (`eslint.config.*` at repo root)

**CI Gate (`scripts/review.sh`):**
- Sequential: lint → typecheck → test → content-validate → build
- Run with `pnpm review`

---

## Module System

- All packages use `"type": "module"` (native ESM)
- Internal packages resolve via `workspace:*` protocol directly to TypeScript source (no pre-build step required between packages)
- Engine and content export via `"exports": { ".": "./src/index.ts" }`
