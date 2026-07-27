# Historical Bootstrap Plan — 1000 Words

> **Status:** Historical. This document records the original architecture and sequencing assumptions. It is not an active checklist. Current status and remaining work live only in [`.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`](../.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md).

## Original Goal

Build a web-first, Capacitor-packaged vocabulary app for the 1000 most common words/phrases, with FSRS scheduling, bundled content/audio, email accounts, and per-user progress in Supabase.

## Architecture Established from This Plan

- pnpm workspace with `@1000words/engine`, `@1000words/content`, and `@1000words/app`.
- React + Vite frontend with a Capacitor shell.
- Pure TypeScript FSRS scheduling/session APIs.
- Static, versioned card decks separated from per-user progress.
- Supabase auth, migrations, RLS policies, repositories, and reward RPCs.
- Vitest package tests and Playwright browser E2E suites.

## Current Reconciliation (2026-07-26)

The implementation has advanced beyond the original Spanish/Mandarin-first sequence:

- English→Spanish, Mandarin, Korean, and Japanese decks are present and registered.
- The review/study experience, audio playback, and optional web/native speech-recognition practice are implemented.
- Authentication, dashboard, achievements, shop, profile, objectives, settings, and leaderboard UI/routes are present.
- GitHub Pages deployment and SPA fallback files exist.
- Playwright authentication, study, and demo-persistence suites already exist.
- Production-mode Supabase adapters and migrations exist, but the earlier 2026-07-26 focused checkpoint did not exercise a live stack: 4 local-Supabase tests were skipped because the stack/CLI was unavailable. That checkpoint is superseded by the current 139/16 local baseline below, which still does not claim live Supabase verification.

## Stable Design Decisions

1. **Static content, per-user state:** decks/audio ship with the app; progress and user state go through repositories.
2. **Pure engine:** `@1000words/engine` owns FSRS scheduling/session logic without React or I/O.
3. **Runtime repository selection:** demo implementations support local work; production adapters target Supabase.
4. **Runtime validation:** deck JSON is validated before it can enter a study session.
5. **Web-first delivery:** Vite serves locally and GitHub Pages uses `/1000-words/`; Capacitor provides the mobile shell.

## Verification Evidence

The earlier **2026-07-26 focused checkpoint** recorded 52 frontend tests passed and 4 local-Supabase tests skipped because the stack/CLI was unavailable. That checkpoint is historical and superseded by the current evidence in the active Lane B roadmap.

The **current 2026-07-26 local baseline** is **139 passed and 16 conditional local-Supabase tests skipped** because a configured local Supabase stack was unavailable. App typecheck passed. These skips are not live or hosted Supabase verification; see the active Lane B roadmap for the current release gates.

## Superseded Sequencing

The original “Spanish MVP, then Mandarin, then speech/E2E” ordering is complete or obsolete as a planning sequence. It must not be used to mark current work done. Remaining stabilization and release work—including broader tests, hosted checks, production-Supabase verification, mobile sign-off, atomic mutations, and Slices 5+—is tracked in the active Lane B roadmap.
