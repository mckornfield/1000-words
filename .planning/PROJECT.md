# 1000 Words — Project Context

_Last reconciled: 2026-07-26_

## Product

A web-first, Capacitor-packaged spaced-repetition vocabulary app. It combines FSRS study sessions with bundled audio, optional speaking practice, XP/Tokens, achievements, cosmetics, objectives, profiles, and a leaderboard.

## Current Capabilities

- Four registered English-target decks: Spanish, Mandarin, Korean, and Japanese.
- FSRS session construction and four-rating study flow.
- Bundled audio and web/native speech-recognition adapters.
- Demo repositories and production-mode Supabase adapters.
- Auth, dashboard, lessons, achievements, shop, profile, settings, objectives, and leaderboard UI.
- GitHub Pages deployment configuration and Playwright E2E suites.

## Verification Boundary

The current foundation verification recorded 52 focused frontend tests passing and app typecheck passing. Four local-Supabase tests were skipped because the stack/CLI was unavailable. Supabase migrations and adapters are implemented, but local/hosted integration is not implied by that result.

## Core Value

The progression loop must close reliably: study → persistent progress and rewards → visible goals/levels/achievements → usable customization and ranking.

## Current Priorities

The authoritative priorities and completion markers are in [`.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`](./in-work/LANE_B_STABILIZATION_AND_ROADMAP.md). This project summary must not become a second tracker.

Current stabilization themes include:

- Honest deck/progress failure handling and reliable base-path routing.
- A practical frontend test foundation.
- Stable repository lifetimes, explicit refresh/invalidation, and atomic mutations.
- Study accessibility, responsive/mobile behavior, and speech/audio resilience.
- Correct, coherent gamification persistence.
- Hosted web, Supabase, and native release verification.

## Constraints

- React 19 + Vite + Tailwind v4; avoid unnecessary framework rewrites.
- Preserve the mock/Supabase repository boundary.
- Keep static decks separate from per-user state.
- Every production table/RPC change needs security-focused verification.
- Treat speech support as capability-dependent on browser/device and permission state.
- Slices 5+ remain future work unless verified and checked in the active tracker.
