---
phase: 07-leaderboard
fixed_at: 2026-06-25T02:30:00Z
review_path: .planning/phases/07-leaderboard/07-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-06-25T02:30:00Z
**Source review:** .planning/phases/07-leaderboard/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Sentinel rank `-1` renders as `#-1` for users outside the top-50 window

**Files modified:** `packages/app/src/features/leaderboard/LeaderboardPage.tsx`
**Commit:** 79adba7
**Applied fix:** Added a guard for `entry.rank === -1` in `rankCell()`, returning `<span aria-label="Rank outside top 50">—</span>` instead of falling through to the `#${entry.rank}` template literal that would produce `"#-1"`.

---

### CR-02: SECURITY DEFINER functions missing `REVOKE EXECUTE FROM PUBLIC`

**Files modified:** `supabase/migrations/20260624000000_leaderboard_rpc.sql`
**Commit:** 146a085
**Applied fix:** Added `revoke execute on function public.get_leaderboard(integer) from public;` before the existing grant for `get_leaderboard`, and `revoke execute on function public.get_current_user_rank(uuid) from public;` before the existing grant for `get_current_user_rank`. This closes the privilege gap that allowed the `anon` role to call these SECURITY DEFINER functions without a JWT.

---

### WR-01: Mock fixture places demo user at rank 8, not rank 6 as documented

**Files modified:** `packages/app/src/data/leaderboard/mockLeaderboardRepository.ts`
**Commit:** b54420a
**Applied fix:** Updated the file header comment from "approximately rank 6" to "rank 8 in the sorted table", and updated the inline fixture comment from "rank ~6" to "rank 8". Computed sort order confirmed: Hana Kim (rankValue=32) and Omar Diallo (rankValue=27) both sort above the demo user (rankValue=24), placing the demo user at position 8.

---

### WR-02: `.leaderboard-card` missing from `@media (max-width: 1000px)` responsive breakpoint

**Files modified:** `packages/app/src/index.css`
**Commit:** d27fb68
**Applied fix:** Added `.leaderboard-card` to the existing `@media (max-width: 1000px)` selector list that resets all dashboard bento cards to `grid-column: 1 / -1`. This ensures the leaderboard card expands to full width alongside all other cards on viewports between 600px and 1000px.

---

_Fixed: 2026-06-25T02:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
