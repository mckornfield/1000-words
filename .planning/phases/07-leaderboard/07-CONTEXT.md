# Phase 7: Leaderboard - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a leaderboard page that ranks users by `Level × AchievementCount = RankValue`, displays equipped cosmetics alongside each row, is accessible from a dashboard card, and is backed by a Supabase query (top 50) with a mock implementation for demo mode.

</domain>

<decisions>
## Implementation Decisions

### Results Scope & Current-User Pinning
- **D-01:** Show top 50 users, scrollable list — no pagination needed; single LIMIT 50 query.
- **D-02:** If the current user is outside the top 50, pin them at the very bottom of the list with a visual separator (divider line) above their row. They always appear.
- **D-03:** Loading state: skeleton rows (placeholder shimmer), matching the existing pattern in AchievementsGallery and DashboardPage.
- **D-04:** Level is derived from XP inline in the Supabase query (e.g., `FLOOR(xp / threshold) + 1`). No denormalized `level` column added. Consistent with however Level is derived elsewhere in the app.

### Cosmetics Row Display
- **D-05:** Each row shows: mini avatar circle (~40px) with the equipped border overlay, then the equipped badge emoji inline next to the display name. Reuses the `FallbackGlyph` + equipped cosmetic pattern from `ProfileOverview.tsx`.
- **D-06:** Fallback avatar (no equipped `profile_picture` cosmetic): display name initials in a colored circle.
- **D-07:** Row columns: `Rank # | Avatar+Border | Name + Badge | Level | RankValue`. Achievement count is not shown explicitly in the row (it's implicit in RankValue).

### Navigation Entry Point
- **D-08:** Leaderboard is accessed via a dashboard card/section on DashboardPage — no new bottom nav tab. `NavBar` stays at 5 tabs (Home, Lessons, Goals, Shop, Profile).
- **D-09:** The leaderboard page has a back button in the page header (e.g., "‹ Dashboard"), matching the pattern used in `AchievementDetail` and `ItemDetail` pages.

### Locked from Prior Phases / ROADMAP
- Ranking formula: `Level × AchievementCount = RankValue` — fixed
- Current user row highlighted — fixed
- Repository pattern: `supabaseLeaderboardRepository` + `mockLeaderboardRepository` in `data/leaderboard/` — fixed
- Mobile-first, touch targets ≥ 44px — fixed
- RLS: every new Supabase query scoped to public read (leaderboard is cross-user) with appropriate policies

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 7 goal, requirements, and dependencies (Milestone 2)

### Data Layer
- `packages/app/src/data/types.ts` — All repository interfaces; add `LeaderboardRepository` and `LeaderboardEntry` type here
- `supabase/migrations/` — Existing table schemas (`profiles`, `achievements`, `inventory`, `equipped`) that the leaderboard query joins

### Routing & Navigation
- `packages/app/src/lib/router.ts` — `RoutePath` union type; add `/leaderboard` here
- `packages/app/src/App.tsx` — `renderPage()` switch and `AppContextValue` injection; new route case + repo injection go here

### UI Patterns
- `packages/app/src/features/shared/NavBar.tsx` — Bottom nav; do NOT add a 6th tab
- `packages/app/src/features/profile/ProfileOverview.tsx` — Equipped cosmetics display pattern (border, badge, avatar via `FallbackGlyph`) to replicate at smaller scale in rows
- `packages/app/src/features/dashboard/DashboardPage.tsx` — Dashboard card/link pattern to replicate for the leaderboard entry point
- `packages/app/src/features/shared/FallbackGlyph.tsx` — Reusable emoji cosmetic glyph component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FallbackGlyph` (`features/shared/FallbackGlyph.tsx`): renders emoji cosmetics with a fallback. Used in ProfileOverview for border/badge/avatar display — reuse directly in leaderboard row.
- `NavBar` (`features/shared/NavBar.tsx`): bottom navigation stays at 5 tabs; leaderboard is NOT added here.
- `Toast` (`features/shared/Toast.tsx`): error surfacing via `useToast()` if the Supabase fetch fails.

### Established Patterns
- Repository pattern: `data/<feature>/supabase<Feature>Repository.ts` + `mock<Feature>Repository.ts`, both exported as factory functions (`create<Name>`), added to `AppContextValue` in `data/types.ts`, injected in both `isDemo` and production branches of `App.tsx`.
- Component state: `useState` / `useEffect` with `.then()/.catch()`, no third-party state library.
- Async data fetching: fetch on mount, handle loading/error in local component state; no client-side cache.
- Equipped cosmetics: stored on `user_equipped` table; categories are `profile_border`, `profile_accent`, `profile_picture` — leaderboard query must join this table per-user.

### Integration Points
- `router.ts`: add `"/leaderboard"` to the `RoutePath` union.
- `App.tsx`: add `"/leaderboard"` case in `renderPage()`; add `leaderboardRepo` to `AppContextValue` useMemo in both branches.
- `DashboardPage.tsx`: add a leaderboard card/link in the bento grid, navigating to `"/leaderboard"`.
- `data/types.ts`: add `LeaderboardEntry` type and `LeaderboardRepository` interface.
- `supabase/migrations/`: no new tables needed — leaderboard is a read-only cross-user query over existing tables.

</code_context>

<specifics>
## Specific Ideas

- The Supabase leaderboard query joins `profiles` (xp, display_name) + a count of `user_achievements` per user + `user_equipped` (for cosmetics). Level derived inline via SQL expression consistent with how Level is derived in StatsPage or elsewhere.
- The mock returns 10–15 plausible fixture entries with varied ranks, cosmetics, levels, and achievement counts. Current demo user's entry is included and highlighted.
- Current user row uses a visual distinction (e.g., background highlight or border) consistent with how other "current item" states are shown in the app.
- A separator (divider line or "···") appears between the top-50 list and the pinned current-user row when the user is outside top 50.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 7-leaderboard*
*Context gathered: 2026-06-23*
