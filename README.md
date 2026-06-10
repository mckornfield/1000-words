# 1000 Words — Spaced-Repetition Vocabulary Learning App

A focused companion to language learning platforms, designed to help users master the 1000 most common words and phrases through spaced repetition. This application runs in the browser and packages to iOS and Android via Capacitor.

## Overview

1000 Words implements a modern spaced-repetition system (following the FSRS algorithm) paired with a gamified dashboard to track learning progress. The app starts with English→Spanish and English→Mandarin language pairs, with content sourced from frequency lists and refined through human review.

**Key characteristics:**
- Runs entirely in the browser with offline-capable audio
- Web-first architecture that packages to mobile via Capacitor
- Monorepo structure supporting parallel development on engine, content, and UI
- Email-based authentication with Supabase
- Row-level security enforcing per-user data isolation
- Version-controlled database migrations

## Quick Start

### Prerequisites
Node.js 22.13 or higher, pnpm 11.5.2 or higher.

### Installation

```bash
# Clone the repository
git clone https://github.com/mckornfield/1000-words.git
cd 1000-words

# Install dependencies
pnpm install
```

### Environment Configuration

Copy the example environment file and fill in your Supabase credentials:

```bash
cp packages/app/.env.example packages/app/.env
```

Edit `packages/app/.env`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEMO_LOGIN=true
```

For local development without Supabase, `VITE_DEMO_LOGIN=true` enables the demo credential (`demo`/`demo`).

### Running the Development Server

```bash
# Start the dev server on localhost:8080
pnpm dev
```

The application will be accessible at `http://localhost:8080` locally and available on your network at the displayed address.

## Building

### Production Build

```bash
# Build all packages
pnpm build

# Build only the app
pnpm --filter @1000words/app build
```

Production artifacts are written to `packages/*/dist/`.

### Individual Package Commands

```bash
# Build only the engine (scheduling library)
pnpm --filter @1000words/engine build

# Build only the content package (card definitions and generation scripts)
pnpm --filter @1000words/content build

# Build only the app (React UI)
pnpm --filter @1000words/app build
```

## Testing

```bash
# Run all tests
pnpm test

# Test only the app
pnpm --filter @1000words/app test

# Test only the engine
pnpm --filter @1000words/engine test

# Test only the content package
pnpm --filter @1000words/content test
```

## Code Quality

```bash
# Run ESLint across all packages
pnpm lint

# Run TypeScript compiler (no emit)
pnpm typecheck
```

## Project Structure

```
1000-words/
├── packages/
│   ├── engine/              # Pure TypeScript scheduling logic
│   │   ├── src/
│   │   │   ├── index.ts     # Public API exports
│   │   │   ├── schedule.ts  # FSRS scheduling wrapper
│   │   │   ├── session.ts   # Session and queue building
│   │   │   └── types.ts     # Type definitions
│   │   └── vitest.config.ts
│   │
│   ├── content/             # Card definitions and generation scripts
│   │   ├── data/
│   │   │   ├── en-es.json   # Spanish language pair cards
│   │   │   └── frequency/   # Frequency lists per language
│   │   ├── audio/           # Generated audio files (mp3s)
│   │   ├── scripts/
│   │   │   ├── generate.ts  # LLM/audio generation pipeline
│   │   │   ├── validate.ts  # Schema and asset validation
│   │   │   └── sync-to-app.ts # Copy assets to app/public
│   │   └── src/
│   │       └── schema.ts    # Zod schemas for card validation
│   │
│   └── app/                 # React + Capacitor frontend
│       ├── src/
│       │   ├── App.tsx                    # Main shell, routing
│       │   ├── features/
│       │   │   ├── login/                 # Authentication UI
│       │   │   ├── dashboard/             # Gamified home screen
│       │   │   ├── review/                # Card review screen (future)
│       │   │   └── shared/                # Shared components
│       │   ├── data/
│       │   │   ├── account/               # User profile and progress
│       │   │   ├── cards.ts               # Card repository
│       │   │   └── auth/                  # Authentication adapter
│       │   ├── config/
│       │   │   └── appConfig.ts           # Runtime environment config
│       │   └── index.css                  # Design tokens and utilities
│       ├── public/
│       │   └── assets/                    # Content JSON and audio (copied at build time)
│       ├── vite.config.ts                 # Dev server on port 8080
│       └── .env.example
│
├── supabase/
│   ├── migrations/
│   │   └── 20260607000000_init.sql        # Initial schema + RLS
│   └── config.toml                        # Local dev configuration
│
├── docs/
│   └── PLAN.md                            # Detailed architecture and execution plan
│
├── pnpm-workspace.yaml                    # Monorepo configuration
├── package.json                           # Root-level scripts
└── tsconfig.base.json                     # Shared TypeScript configuration
```

## JSON Data Architecture

During active development, the application references JSON fixtures in place of live database connections. This approach provides several advantages:

### Structure

Account and progress data are defined in JSON fixtures within the repository:

```
packages/app/src/data/account/mock/demo-account-data.json
```

Each fixture is validated against a Zod schema at runtime, ensuring type safety and consistent structure:

```typescript
// packages/app/src/data/account/schema.ts
export const DemoUserSchema = z.object({
  id: z.string().regex(/^Usr-\d{3}$/),
  email: z.string().email(),
  password: z.string(),
});

export const AccountDataSchema = z.object({
  users: z.array(DemoUserSchema),
  profiles: z.array(ProfileSchema),
  lessons: z.array(LessonSchema),
  // ... more schemas
});
```

### Data Access Pattern

The repository pattern abstracts the data source, allowing the UI layer to remain agnostic of whether data comes from JSON fixtures, localStorage, or a remote database:

```typescript
// packages/app/src/data/account/repository.ts
export const localAccountRepository: AccountRepository = {
  findUserByCredentials(email: string, password: string) {
    // Load fixture → validate → search
  },
  getDashboardData(userId: string) {
    // Compose dashboard objects from fixture arrays
  },
};
```

### Migration Path

When Supabase integration is completed, the UI will not require any changes. The repository implementation will be swapped:

```typescript
// Future: packages/app/src/data/account/repository-supabase.ts
export const supabaseAccountRepository: AccountRepository = {
  async findUserByCredentials(email: string, password: string) {
    // Call Supabase auth API
  },
  async getDashboardData(userId: string) {
    // Query Supabase tables
  },
};
```

The `AccountRepository` interface remains stable, ensuring the app shell (`App.tsx`) and feature screens need not be updated when the backend is swapped.

### Benefits

- ✓ **Fast iteration**: No database setup required for local development
- ✓ **Deterministic testing**: Fixtures are immutable and reproduce consistently
- ✓ **Type safety**: Zod validation catches schema mismatches at runtime
- ✓ **Clear contracts**: Repository interfaces define the boundary between UI and data
- ✓ **Painless migration**: Backend swap requires only implementation changes, no UI rewiring

### Demo Mode

When `VITE_DEMO_LOGIN=true`, the login screen displays the demo credential and allows password-free entry. This flag is controlled by the environment variable and can be toggled in `supabase/config.toml` for local development:

```toml
[app]
demoLogin = true
host = "127.0.0.1"
port = 8080
base_url = "http://localhost:8080"
```

## Roadmap

The development roadmap is organized into parallel work streams with clear integration points.

### Phase 0 — Foundations (Complete)
- ✓ pnpm workspace scaffold with three packages (engine, content, app)
- ✓ Vite + React + TypeScript setup with Capacitor initialization
- ✓ Database schema and migrations in Supabase
- ✓ Contract definitions: card schema, engine API, progress sync interface
- ✓ CI pipeline: lint and test scripts

### Lane A — Data / Logic / Content
Data and scheduling layer, parallelizable per language.

**A1. Engine** (FSRS scheduling)
- [ ] Implement `scheduleReview(state, rating, now)` wrapper over `ts-fsrs`
- [ ] Implement `buildSession(cards, progressMap, opts)` for session composition
- [ ] Unit tests for scheduling transitions and session building

**A2. Supabase Integration**
- [ ] Email signup/login/logout handlers
- [ ] Progress sync API: `getProgress(userId, langPair)` and `upsertProgress(userId, cardId, state)`
- [ ] Row-level security verification (user A cannot read user B's data)
- [ ] Integration tests against local Supabase stack

**A3. Content Pipeline (Per-Language)**
- [ ] Frequency list → LLM/DeepL translation draft
- [ ] Integration with ElevenLabs for audio generation
- [ ] Zod schema validator: all cards valid, all mp3s present
- [ ] **Spanish (es)**: Run full pipeline
- [ ] **Mandarin (zh)**: Run identical pipeline with localized settings

### Lane B — App UI / Gamification
Frontend and user experience, codes against fixtures and contracts from Phase 0.

**B1. Authentication Shell**
- ✓ Client-side routing (/login → /dashboard)
- ✓ Session management and login form
- ✓ Auth guards (redirect unauthenticated users to /login)

**B2. Review Screen**
- [ ] Card prompt display with audio playback
- [ ] Four FSRS rating buttons (Again / Hard / Good / Easy)
- [ ] Integration with engine `scheduleReview` API
- [ ] Session queue management

**B3. Dashboard**
- ✓ Due count and lesson overview
- ✓ Streak counter and daily goal tracker
- ✓ "Words mastered / 1000" progress display
- ✓ Achievement and store items display

**B4. Gamification & Polish**
- [ ] Streak animations and notifications
- [ ] XP bar animations
- [ ] Achievement unlock popover
- [ ] Button hover and interaction states
- [ ] Responsive breakpoints for tablet and mobile

### Integration & MVP Sequencing

1. **Phase 0 + A1 + B1/B2**: Core scheduling and review flow operational
2. **A3 (Spanish) + A2**: Real Spanish cards and database progress integration
3. **First MVP Release**: English→Spanish, web-only, fully playable
4. **A3 (Mandarin)**: Content pipeline reused for Chinese cards
5. **B4**: Gamification animations and polish
6. **Mobile Packaging**: Capacitor build for iOS/Android
7. **Long-term**: Speaking/recognition, reverse-direction cards

### Future Enhancements

- Voice input and speech recognition scoring
- Reverse-direction cards (target language → English)
- Custom word lists
- Community-contributed content
- Offline sync and background progress updates
- Spaced repetition optimization via historical data analysis

## Verification & Quality Assurance

### Engine Tests
```bash
pnpm --filter @1000words/engine test
```
Ensures scheduling transitions (Again / Hard / Good / Easy) and session composition follow FSRS specifications.

### Content Validation
```bash
pnpm --filter @1000words/content validate
```
Verifies every card passes the Zod schema and has a corresponding audio file.

### Type Checking
```bash
pnpm typecheck
```
Runs TypeScript compiler across all packages without emitting code.

### Linting
```bash
pnpm lint
```
Checks code style and quality across all packages using ESLint.

### Manual App Verification
```bash
pnpm dev
# Open http://localhost:8080
# 1. Log in with credentials (demo/demo)
# 2. Navigate dashboard
# 3. Test demo features
```

### End-to-End Testing (Future)
Playwright tests will verify the complete flow: signup → review session → progress persistence across reload.

### Mobile Testing (Future)
```bash
# iOS simulator
pnpm --filter @1000words/app cap run ios

# Android emulator
pnpm --filter @1000words/app cap run android
```

## Deployment Notes

### Web
The `dist/` directory from `pnpm build` is ready for static hosting (Netlify, Vercel, GitHub Pages, etc.).

### Mobile
Capacitor sync and native build steps are configured in `capacitor.config.ts`. Before first build:

```bash
pnpm --filter @1000words/app cap add ios
pnpm --filter @1000words/app cap add android
```

### Supabase
A free-tier Supabase project is adequate for this application. Note: free projects pause after ~1 week of inactivity and must be manually unpaused.

### Content Assets
At build time, the `content` package's JSON and mp3 files are copied to `app/public/assets/` and bundled with the app, enabling offline playback.

## Development Guidelines

### Environment Variables
Always copy `.env.example` to `.env` before starting development. Never commit `.env` files.

### Monorepo Commands
Always use `--filter` when targeting specific packages:
```bash
pnpm --filter @1000words/app build  # App only
pnpm build                          # All packages
```

### Repository Interfaces
When adding a new data source, implement the existing `AccountRepository` or `AuthRepository` interface. Do not add properties to domain models; extend repository methods instead.

### Schema Validation
Use Zod schemas for all external data (API responses, JSON fixtures, user input). Validate at the boundary between the UI and data layers.

### Testing
Write tests using Vitest in `*.test.ts` files alongside the source code. Aim for unit tests in the `engine` and `content` packages; integration tests for Supabase APIs.

## Contributing

1. Create a feature branch from `main`
2. Make changes, ensure `pnpm typecheck && pnpm lint && pnpm test` passes
3. Push and open a pull request
4. Address review feedback and merge

## License

See [LICENSE](./LICENSE) for details.

---

For detailed architecture and sequencing decisions, refer to [docs/PLAN.md](./docs/PLAN.md).
