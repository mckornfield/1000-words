# External Integrations
_Last updated: 2026-06-22_

## Summary

The app has two runtime modes: **demo mode** (in-memory repositories, no external calls) and **production mode** (Supabase for auth + database). External integrations outside runtime include the OpenAI API used during content generation (build-time / developer tooling only) and Capacitor for iOS/Android native packaging. All secrets flow through Vite environment variables loaded from a single `.env` at the repo root.

---

## Runtime Modes

**Demo Mode** (`VITE_DEMO_LOGIN=true` or env var absent):
- No Supabase calls made
- All repositories use in-memory mock implementations
- `appConfig.demoLoginEnabled` defaults `true` when `VITE_DEMO_LOGIN` is unset
- Safe for development without a Supabase project

**Production Mode** (`VITE_DEMO_LOGIN=false` + Supabase vars set):
- Full Supabase auth + database
- Supabase repositories injected at `App.tsx` composition root
- RLS enforces `auth.uid() = user_id` on all tables

---

## Supabase (Primary Backend)

**What it provides:**
- PostgreSQL database (card progress, review logs, profiles, achievements, inventory, goals)
- Email/password authentication (Supabase Auth)
- Row-Level Security — all tables gated by `auth.uid() = user_id`
- Atomic XP increment via `increment_xp(uid, delta)` SQL function

**Client setup:**
- File: `packages/app/src/lib/supabase.ts`
- SDK: `@supabase/supabase-js` 2.107
- Client created once at module load; session persisted in `localStorage` by default

**Auth helpers:**
- File: `packages/app/src/lib/auth.ts`
- Wraps `supabase.auth.signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`
- Production repository: `packages/app/src/data/auth/supabaseAuthRepository.ts`

**Environment variables:**
- `VITE_SUPABASE_URL` — Supabase project URL (e.g. `https://<ref>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — anon/public key (safe to expose; RLS is the security layer)
- Fallback: `http://localhost:54321` / `demo-anon-key` prevents crash in demo mode

**Migrations (in `supabase/migrations/`):**
- `20260607000000_init.sql` — profiles, card_progress, review_logs, RLS policies, trigger
- `20260610000000_card_progress_learning_steps.sql` — adds `learning_steps` column
- `20260622000000_user_state_tables.sql` — achievements, inventory, equipped, daily_goals, `increment_xp` function

---

## OpenAI (Content Generation — Build-time Only)

**What it provides:**
- AI-assisted generation of vocabulary word data for `packages/content`

**Usage:**
- File: `packages/content/src/` (used by `scripts/generate.ts`)
- SDK: `openai` 6.42
- Not bundled into the app; only used during developer content pipeline runs

**Environment variable:**
- `OPENAI_API_KEY` — loaded via `dotenv` in content scripts (not a `VITE_` var; not exposed to browser)

---

## Capacitor (Mobile Native Shell)

**What it provides:**
- Packages the Vite web build (`dist/`) into iOS and Android native apps
- App ID: `com.thousandwords.app`

**Config:**
- File: `packages/app/capacitor.config.ts`
- `webDir: "dist"` — Capacitor reads the Vite production build output

**CLI:**
- `pnpm cap:sync` — syncs web build into native projects (runs `cap sync`)
- `@capacitor/cli` 8.4 (devDependency), `@capacitor/core` 8.4 (runtime dependency)

**Current state:**
- Shell is configured; native platform directories (`ios/`, `android/`) are not present in this repo snapshot

---

## Authentication & Identity

**Provider:** Supabase Auth (email/password)

**Demo credentials:**
- When `demoLoginEnabled: true`, the login form is pre-filled with `demo`/`demo` credentials
- Handled entirely in-memory by `packages/app/src/data/auth/repository.ts`

**Session management:**
- Supabase client stores JWT in `localStorage`
- `onAuthChange` listener in `App.tsx` drives React auth state

---

## Environment Configuration

**Env file location:** Repo root (`.env`) — shared across Vite dev server, Vitest, and shell scripts

**Required for production:**
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project endpoint |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_DEMO_LOGIN` | Set to `false` to disable demo mode |

**Required for content generation (developer only):**
| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI API access for word data generation |

**Example file:** `.env.example` at repo root (not readable by agent; see `packages/app/src/config/appConfig.ts` for parsing logic)

---

## CI/CD & Deployment

**CI gate:** `pnpm review` (`scripts/review.sh`) — lint → typecheck → test → content-validate → build

**Hosting:** Not configured in repo (no Vercel/Netlify/Docker config detected)

**Mobile distribution:** Via Capacitor native build (manual `pnpm cap:sync` + Xcode/Android Studio)

---

## Webhooks & Callbacks

**Incoming:** None detected

**Outgoing:** None detected (Supabase Realtime not used; no webhook endpoints)

---

## MCP / AI Agent Tooling

**Sub-agents (`.claude/agents/`):**
- `rls-reviewer.md` — LLM sub-agent for RLS policy audits

**Skills (`.claude/skills/`):**
- `automated-reviewer/` — orchestrator skill combining lint/test/RLS review
- `content-gen/` — content generation skill

These are Claude Code agent definitions, not runtime integrations.
