# 1000 Words — Roadmap

## Milestone 2: Progression Loop

**Goal:** Close the progression loop — studying earns XP/Tokens → achievements unlock shop items → items visibly customize the profile and study session.

---

### Phase 07: Leaderboard

**Goal:** Add a leaderboard page that ranks users by Level × AchievementCount = RankValue, shows equipped cosmetics alongside each entry, and is backed by a Supabase query (with a mock implementation for demo mode).

**Requirements:**
- Leaderboard page accessible from dashboard navigation
- Ranking formula: `Level × AchievementCount = RankValue` (Level derived from XP)
- Each row shows: rank position, avatar (equipped profile_picture cosmetic), display name, equipped border/badge cosmetics, Level, Achievement count, RankValue
- Supabase implementation queries profiles + user_achievements + user_equipped tables
- Mock implementation returns plausible fixture data for demo mode
- Page is mobile-first, touch-friendly (tap targets ≥ 44px)
- Current user row highlighted
- Follows existing `supabase*Repository` + `mock*Repository` pattern in `data/` layer

**Status:** Pending

**Depends on:** Milestone 2 phases 01–06 (achievement engine, token currency — committed)

---

### Phase 08: Achievement Catalog Polish

**Goal:** Expand the initial curated achievement set with milestone names that map to unlocking specific shop item chunks; ensure all Ach-001–012 have clear milestone narratives.

**Status:** Pending

---

*Last updated: 2026-06-23*
