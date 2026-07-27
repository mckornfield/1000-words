# Codebase Structure

_Last reconciled: 2026-07-26_

```text
1000-words/
├── packages/
│   ├── app/
│   │   ├── public/                 synced decks/audio and 404 SPA fallback
│   │   └── src/
│   │       ├── App.tsx             composition root and route rendering
│   │       ├── config/             environment parsing
│   │       ├── data/               contracts plus mock/Supabase repositories
│   │       ├── features/
│   │       │   ├── achievements/
│   │       │   ├── dashboard/
│   │       │   ├── leaderboard/
│   │       │   ├── lessons/        list, detail, and StudySession
│   │       │   ├── login/
│   │       │   ├── objectives/
│   │       │   ├── profile/
│   │       │   ├── shared/
│   │       │   └── shop/
│   │       ├── lib/                router, deck loader, speech, Supabase helpers
│   │       └── test/               deterministic React test utilities
│   ├── content/
│   │   ├── data/                    en-es, en-zh, en-ko, en-ja decks
│   │   ├── scripts/                 generate, validate, sync
│   │   └── src/schema.ts            Card and LangPair schemas
│   └── engine/src/                  pure FSRS scheduling/session logic
├── e2e/                              Playwright auth/study/persistence specs
├── supabase/migrations/              schema, RLS, RPC migrations
├── .github/workflows/                CI and GitHub Pages deployment
├── .planning/in-work/                authoritative active plan
├── .planning/codebase/               reconciled codebase reference
├── docs/PLAN.md                      historical bootstrap plan
└── CLAUDE.md                         agent working guide
```

Study UI lives in `features/lessons/StudySession.tsx`; account fixture/schema code lives under `data/account/`. Documentation should name these real locations rather than proposing alternate feature folders.

## Adding Work

- New user-state contract: update `data/types.ts`, provide appropriate demo/Supabase implementations, inject through `App.tsx`, then consume through `useAppContext()`.
- New page: update centralized router definitions/tests and `App.tsx`, then add the real feature directory.
- New shared UI: use `features/shared/` only when the pattern repeats.
- New language: update content schema/assets and all current maps; B7 tracks consolidation into one typed registry.
- New active task/status: update `.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`, not this map.
