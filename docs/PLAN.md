# 1000 Words — Spaced-Repetition Vocabulary App

## Context

Build a focused companion to Duolingo: learn the **1000 most common words/phrases** in a
language via **spaced repetition** (Anki-style, but scoped to those 1000 and far simpler).
Start with **English→Spanish** and **English→Mandarin**. Runs in the browser and packages to
iOS/Android. Email-based accounts store each user's progress and SR scheduling state. Audio is
a near-term feature via pre-generated ElevenLabs mp3s; live speaking/recognition is long-term.

The plan is structured so **two people can work in parallel**, split along clean seams: a
frontend/gamification lane and a data/logic/content lane, with content further parallelizable
**per language**.

### Locked decisions
| Decision | Choice | Why |
|---|---|---|
| App stack | **Capacitor + React + Vite (web-first)** | Real web app is easy to run/screenshot/verify; fastest iteration; no cloud-build cost; matches "runs in browser." |
| Backend | **Supabase** (Auth + Postgres) | Explicit SQL schema + version-controlled migrations + local stack + generated TS types. |
| SR algorithm | **FSRS via `ts-fsrs`** | Modern (what Anki uses now); library owns the math, we own state/UI. |
| Content | **Machine-assisted draft + human review** | Frequency list → LLM/DeepL draft → ElevenLabs mp3 → human review. Review is the per-language human seam. |
| Audio | **mp3s bundled in the app** | Offline-capable, zero runtime audio cost. |

## Architecture

**Key separation:** *content is a static, shared, versioned asset* (same 1000 cards for everyone,
bundled in the app); *only per-user progress lives in Supabase*. This keeps the DB tiny, reads
cheap, and makes offline straightforward.

```
1000-words/  (pnpm workspace)
├── packages/
│   ├── engine/    # pure TS, no UI: FSRS wrapper + session/queue builder. TDD core.
│   ├── content/   # frequency lists, generation scripts, generated card JSON + mp3s, zod schema + validator
│   └── app/       # Capacitor + React + Vite: UI, auth screens, gamification, progress sync
├── supabase/      # migrations (tables + RLS), local config
├── docs/PLAN.md
├── pnpm-workspace.yaml
└── package.json
```

Build step copies `content`'s generated JSON + mp3s into `app/public/assets/`.

### Stable contracts (define in Phase 0 so both lanes code against fixed interfaces)
1. **Card schema** (zod, in `content`):
   `{ id, langPair: "en-es"|"en-zh", word, translation, partOfSpeech?, exampleSentence, exampleTranslation, audio: "assets/audio/es/<id>.mp3" }`
2. **Engine API** (`engine`):
   - `scheduleReview(state, rating, now) -> newState` — thin wrapper over `ts-fsrs`.
   - `buildSession(cards, progressMap, opts) -> Card[]` — merges due cards + new-card daily limit, ordered.
3. **Progress sync API** (`app/src/data`):
   - `getProgress(userId, langPair) -> Record<cardId, FsrsState>`
   - `upsertProgress(userId, cardId, state)`

### Data model (Supabase migrations in `supabase/migrations`)
- `auth.users` — built-in (email/password).
- `profiles` — `user_id (pk, fk)`, `display_name`, `settings jsonb`, `streak_count`, `xp`, `last_active_date`.
- `card_progress` — `user_id`, `card_id`, `lang_pair`, FSRS fields (`stability`, `difficulty`, `due`, `last_review`, `reps`, `lapses`, `state`); PK `(user_id, card_id)`.
- `review_logs` — append-only `(user_id, card_id, rating, reviewed_at, elapsed)`; powers stats now and FSRS optimization later.
- **RLS on every table**: a user may read/write only rows where `user_id = auth.uid()`.

### Stack specifics
`pnpm` workspaces · Vite + React + TypeScript · Tailwind (fast styling) ·
`@supabase/supabase-js` · `ts-fsrs` · `zod` · `@capacitor/core` + `@capacitor/ios` + `@capacitor/android` ·
`vitest` (unit) + `@playwright/test` (e2e).

## Execution Plan

### Phase 0 — Foundations (do first, together; unblocks both lanes)
- Scaffold pnpm workspace + the three packages; init Vite+React+TS app and `npx cap init`.
- Create `supabase/` project, run `supabase start` (local), write migrations for the 4 tables + RLS.
- Write the **three contracts** above (card zod schema, engine API signatures w/ stubs, progress sync interface).
- Wire CI: `pnpm lint && pnpm test`.

### Lane A — Data / Logic / Content  (content parallelizes per language)
- **A1. Engine** (`engine`): implement `scheduleReview` + `buildSession` over `ts-fsrs`. **TDD** — unit-test scheduling transitions (again/hard/good/easy) and session composition (due + new-limit ordering).
- **A2. Supabase integration**: email auth helpers + implement progress sync API; test RLS (user A cannot read user B's progress).
- **A3. Content pipeline** (`content`): script `frequency list → LLM/DeepL draft → ElevenLabs mp3 → JSON`, plus a schema validator that asserts every card is valid and its mp3 exists. **Run for `es` first, then `zh` — identical pipeline, the per-language parallel seam.**

### Lane B — App UI / Gamification  (codes against fixtures + contracts)
- **B1. Shell + auth**: routing, email signup/login/logout against Supabase.
- **B2. Review screen**: prompt → reveal → audio playback (`<audio>`) → 4 FSRS rating buttons, wired to `engine` + a small content fixture.
- **B3. Dashboard**: due count, streak, daily goal, "words mastered / 1000" progress.
- **B4. Gamification**: streaks, XP, daily goal, mastery progress, light animations.

### Integration & sequencing
1. Phase 0 (together).
2. A1 + B1/B2 in parallel (B uses fixtures + engine API).
3. A3 (Spanish) + A2 sync → wire real content + real progress.
4. **First playable MVP: English→Spanish, web.**
5. A3 (Mandarin, reuses pipeline) → English→Mandarin.
6. B4 gamification polish.
7. Capacitor packaging: `cap add ios/android`, build + run on device/simulator.
8. Long-term: speaking/recognition (user speaks, gets scored), reverse-direction cards.

## Verification
- **Engine**: `pnpm --filter engine test` — vitest covers scheduling transitions + session building (TDD, written before impl).
- **Content**: `pnpm --filter content validate` — every card passes zod schema and has an existing mp3.
- **Supabase**: against `supabase start` local stack, a test confirms RLS blocks cross-user reads/writes.
- **App (manual)**: `pnpm --filter app dev`, open in browser, walk the review flow.
- **E2E**: Playwright — sign up, complete a review session, confirm due count/streak update and progress persists across reload.
- **Mobile**: `cap run ios` / `cap run android` launches the bundled app with offline audio working.

## Notes / costs
- ElevenLabs is a **one-time content-generation cost** (~2000 short clips across both languages); no runtime audio cost since mp3s are bundled.
- Supabase free tier is ample at this scale (progress is a tiny per-user map). Heads-up: free Supabase projects pause after ~1 week idle — just unpause.
- App-store fees (Apple $99/yr, Google $25 once) apply only when you publish mobile builds.
