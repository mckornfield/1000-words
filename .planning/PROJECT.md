# 1000 Words

## What This Is

A spaced-repetition language-learning app where users study vocabulary flashcards ordered by the FSRS algorithm, earn XP and Tokens, unlock achievements, and personalize their profile with cosmetics (frames, badges, avatars) purchased from the in-game shop. The app runs as a React 19 SPA with a Capacitor mobile shell and a Supabase backend.

## Core Value

The progression loop must close: studying earns XP → XP drives level → level and achievements unlock shop items → items visibly customize the profile — making improvement feel rewarding and personalized.

## Business Context

<!-- Internal product / no revenue model at this time — section omitted -->

## Requirements

### Validated

- ✓ FSRS-based spaced-repetition study session — existing
- ✓ XP system with increment_xp SQL function (atomic writes) — existing
- ✓ Supabase auth with RLS (users can only touch their own rows) — existing
- ✓ Card progress tracking (card_progress table, FSRS state) — existing
- ✓ Achievement data schema (achievements table, repository interfaces) — existing
- ✓ Inventory/equipped cosmetics schema (inventory, equipped tables) — existing
- ✓ Shop browse and item detail page shells (ShopBrowse.tsx, ItemDetail.tsx) — existing
- ✓ Achievements gallery and detail page shells (AchievementsGallery.tsx, AchievementDetail.tsx) — existing
- ✓ Profile pages (ProfileOverview, StatsPage, SettingsPage, CustomizationPage) — existing
- ✓ Token.png asset placed at public/assets/images/Token.png — existing
- ✓ Demo/prod repo split via AppContext — existing

### Active

- [ ] Achievements gallery fully wired to real data with locked/unlocked states and progress bars
- [ ] Achievement prerequisite chaining (grey-out until prerequisite met)
- [ ] Achievement detail modal with progress, criteria, rarity
- [ ] Dedicated achievements page with working navigation
- [ ] Shop items show lock state (blurred + lock icon) when unlock achievement not yet met
- [ ] Token balance visible in UI; items purchasable with Tokens
- [ ] Equipped cosmetics (frame, badge, avatar) displayed on profile page
- [ ] Equipped cosmetics displayed during study session
- [ ] Leaderboard page with ranking formula Level × Achievements = RankValue, shows cosmetics
- [ ] Leaderboard backed by Supabase
- [ ] placeholder.svg path corrected (LoginPage.tsx references /placeholder.svg → /assets/images/placeholder.svg)
- [ ] Initial curated set of achievements with clever milestone names that unlock shop item chunks

### Out of Scope

- Real-money purchases / IAP — no payment system in this milestone
- Social following / DMs — leaderboard only, no full social graph
- Push notifications for achievements — deferred
- Achievement sharing to external social media — deferred
- Infinite achievement/shop catalogue — start with a small curated set, expand later

## Context

- The repository pattern is established: `data/types.ts` holds all interfaces; each feature has a `supabase*Repository` and a `mock*Repository`. Any new data needs follow this pattern.
- XP is stored atomically via the `increment_xp(uid, delta)` SQL function to avoid race conditions.
- Tokens will be a new currency alongside XP — needs a `tokens` column on the profiles table (or a separate store) and a `spend_tokens` SQL function to mirror the XP pattern.
- Achievement unlock logic must run client-side after study sessions and gate shop purchases; for MVP, checking on session end and on shop page load is sufficient.
- The leaderboard ranking formula is `Level × AchievementCount = RankValue`. Level is already derived from XP.
- `placeholder.svg` is at `public/assets/images/placeholder.svg`; the `src="/placeholder.svg"` reference in `LoginPage.tsx:56` must be updated to `/assets/images/placeholder.svg`.
- The shop's item catalogue should be structured so that achievements map to unlock groups (e.g., "Complete 100 words" unlocks a batch of badge icons). This many-to-many mapping should be data-driven, not hardcoded per item.

## Constraints

- **Tech stack**: React 19 + Vite + Tailwind v4 — no new UI framework additions
- **Data layer**: Follow existing mock + Supabase repo pattern for every new feature
- **Scope**: Small initial curated set of achievements and shop items — design for extensibility, not completeness
- **Tokens**: New in-game currency (not real money); atomic writes via SQL function pattern
- **RLS**: Every new Supabase table must have `auth.uid() = user_id` RLS policies

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Achievement prerequisite chaining via data, not code | Makes adding new achievements not require deploys | — Pending |
| Token balance on profiles table vs separate wallet table | Simpler joins; consistent with XP pattern | — Pending |
| Achievement unlock check on client at session end | Avoids DB trigger complexity for MVP | — Pending |
| Leaderboard computed at query time (no materialized view) | Simpler for MVP; revisit at scale | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-22 after initialization*
