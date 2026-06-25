---
phase: 07-leaderboard
reviewed: 2026-06-25T02:16:42Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - packages/app/src/App.tsx
  - packages/app/src/data/leaderboard/mockLeaderboardRepository.ts
  - packages/app/src/data/leaderboard/supabaseLeaderboardRepository.ts
  - packages/app/src/data/types.ts
  - packages/app/src/features/dashboard/DashboardPage.tsx
  - packages/app/src/features/leaderboard/LeaderboardPage.tsx
  - packages/app/src/index.css
  - packages/app/src/lib/router.ts
  - supabase/migrations/20260624000000_leaderboard_rpc.sql
findings:
  critical: 2
  warning: 2
  info: 2
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-06-25T02:16:42Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the leaderboard data layer (mock and Supabase repositories), type definitions, SQL migration,
LeaderboardPage UI component, DashboardPage integration, router extension, and CSS. The implementation
is structurally sound — the SECURITY DEFINER pattern for cross-user aggregation is appropriate, the
repository contract is clean, and the demo fixture sorts correctly. Two blockers were found: a display
bug that exposes the internal `-1` sentinel rank to users, and a PostgreSQL privilege gap where SECURITY
DEFINER functions remain executable by the `anon` role due to a missing `REVOKE FROM PUBLIC`. Two
warnings cover a responsive layout omission and misleading fixture comments.

---

## Critical Issues

### CR-01: Sentinel rank `-1` renders as `#-1` for users outside the top-50 window

**File:** `packages/app/src/features/leaderboard/LeaderboardPage.tsx:75-101`

**Issue:** The `supabaseLeaderboardRepository` always returns `rank: -1` as a sentinel for
`getCurrentUserEntry` (documented in the comment at line 65 of that file). When a user is not
present in the top-50 list, `shouldPinUser` becomes `true` and the pinned `LeaderboardRow` is
rendered with that entry. Inside `rankCell()`, only ranks `1`, `2`, and `3` have special handling;
any other value falls through to the template literal `` `#${entry.rank}` ``, producing the string
`"#-1"` which is displayed directly to the user in the rank column. The comment says "The UI
component shows a 'You' label without a rank number in that case," but the actual code never
suppresses the rank cell output for rank `-1`.

This is observable in production Supabase mode whenever a user's rank falls below position 50.

**Fix:** Add a guard for the sentinel value in `rankCell()`:

```tsx
const rankCell = () => {
  if (entry.rank === 1) return (
    <><span aria-hidden="true">🥇</span><span className="sr-only">Rank 1</span></>
  );
  if (entry.rank === 2) return (
    <><span aria-hidden="true">🥈</span><span className="sr-only">Rank 2</span></>
  );
  if (entry.rank === 3) return (
    <><span aria-hidden="true">🥉</span><span className="sr-only">Rank 3</span></>
  );
  // -1 is the sentinel used when the user is outside the visible top-N window
  if (entry.rank === -1) return <span aria-label="Rank outside top 50">—</span>;
  return `#${entry.rank}`;
};
```

---

### CR-02: SECURITY DEFINER functions missing `REVOKE EXECUTE FROM PUBLIC`

**File:** `supabase/migrations/20260624000000_leaderboard_rpc.sql:48,89`

**Issue:** In PostgreSQL, when a function is created without an explicit privilege grant, `EXECUTE`
is implicitly granted to `PUBLIC` (which includes the `anon` role used by Supabase for
unauthenticated requests). The migration correctly grants execute to `authenticated`, but it never
revokes the default `PUBLIC` grant. As a result, the `anon` role retains execute permission on both
`get_leaderboard` and `get_current_user_rank`.

Because these functions are `SECURITY DEFINER`, they run as the table owner and bypass RLS on
`profiles`, `user_achievements`, and `user_equipped`. An unauthenticated caller can therefore
enumerate all users' display names, XP totals, achievement counts, and equipped cosmetic IDs by
calling these RPCs directly (e.g., via the Supabase REST API without a JWT), bypassing the
application-level route guard entirely.

**Fix:** Add revoke statements before the grant statements for each function:

```sql
-- After the CREATE OR REPLACE for get_leaderboard:
revoke execute on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;

-- After the CREATE OR REPLACE for get_current_user_rank:
revoke execute on function public.get_current_user_rank(uuid) from public;
grant execute on function public.get_current_user_rank(uuid) to authenticated;
```

---

## Warnings

### WR-01: Mock fixture places demo user at rank 8, not rank 6 as documented

**File:** `packages/app/src/data/leaderboard/mockLeaderboardRepository.ts:9,72`

**Issue:** The file header comment (line 9) states "The demo user (currentUserId) is placed at
approximately rank 6 in the table." The fixture comment on line 72 says "Demo user — xp=2840,
level=12, achievementCount=2, rankValue=24 (rank ~6)". The actual sort order after applying the
ranking formula (`level × achievementCount`) is:

| Rank | Name       | rankValue |
|------|------------|-----------|
| 6    | Hana Kim   | 32        |
| 7    | Omar Diallo| 27        |
| 8    | Demo (Ari) | 24        |

Hana Kim (xp=1800, 4 achievements → level 8 × 4 = 32) and Omar Diallo (xp=2100, 3 achievements →
level 9 × 3 = 27) both rank above the demo user. The demo user's actual rank is 8. This
discrepancy will mislead developers calibrating the demo experience or debugging rank ordering.

**Fix:** Update the comments to reflect the actual computed rank:

```ts
// Demo user — xp=2840, level=12, achievementCount=2, rankValue=24 (rank 8)
```

And update the file header:
```ts
// The demo user (currentUserId) is placed at rank 8 in the sorted table.
```

---

### WR-02: `.leaderboard-card` missing from `@media (max-width: 1000px)` responsive breakpoint

**File:** `packages/app/src/index.css:910-922`

**Issue:** Every dashboard bento card that uses `grid-column: span N` is explicitly reset to
`grid-column: 1 / -1` at the 1000 px breakpoint, so they each take the full 12-column row on
narrower viewports. The `.leaderboard-card` (defined on line 397 with `grid-column: span 6`) is
absent from this reset list. On viewports between 600 px and 1000 px, the leaderboard card stays
at half-width while all other cards have already expanded to full width, breaking the layout
alignment.

**Fix:** Add `.leaderboard-card` to the existing breakpoint rule:

```css
@media (max-width: 1000px) {
  .profile-card,
  .xp-card,
  .goals-card,
  .lessons-card,
  .achievements-card,
  .store-card,
  .timeline-card,
  .leaderboard-card {        /* ← add this */
    grid-column: 1 / -1;
  }
  /* ... */
}
```

---

## Info

### IN-01: `parseRoute()` lowercases the entire pathname, corrupting mixed-case route parameters

**File:** `packages/app/src/lib/router.ts:61`

**Issue:** `parseRoute()` applies `.toLowerCase()` to `window.location.pathname` before splitting
on `/`. Route parameter segments (e.g., `Les-001`, `Ach-003`) are therefore returned in lowercase
(`les-001`, `ach-003`). Fixture IDs follow the pattern `/^Les-\d{3}$/` (capitalized), so any
component that looks up `params.lessonId` against `dashboardData.lessons` will fail to find a match
when the URL was entered or bookmarked with the canonical capitalisation. This is a pre-existing bug
not introduced by this phase but is present in the file under review.

**Fix:** Lowercase only when matching segment keywords; preserve raw segments for parameter values:

```ts
const rawSegments = pathname.split("/").filter(Boolean);
const segments = rawSegments.map((s) => s.toLowerCase());
// Use segments[N] for keyword matching, rawSegments[N] for parameter values
return { path: "/lessons/:lessonId", params: { lessonId: rawSegments[1] } };
```

---

### IN-02: Dead `borderTop` style on first `<hr>` in `Separator` component

**File:** `packages/app/src/features/leaderboard/LeaderboardPage.tsx:265-270`

**Issue:** The first `<hr>` element in the `Separator` component has the following inline style:

```tsx
style={{
  borderTop: "1px dashed var(--border)",  // line 266 — set here…
  border: "none",                          // line 267 — then immediately overridden
  borderTopStyle: "dashed",
  borderTopWidth: 1,
  borderTopColor: "var(--border)",
}}
```

`border: "none"` on line 267 overrides the `borderTop` shorthand set on line 266, making the first
declaration a no-op. The individual `borderTopStyle/Width/Color` properties on lines 268–270 then
restore the correct style. The result renders correctly, but the `borderTop` line is dead code that
adds confusion.

**Fix:** Remove the redundant `borderTop` shorthand:

```tsx
style={{
  flex: 1,
  border: "none",
  borderTopStyle: "dashed",
  borderTopWidth: 1,
  borderTopColor: "var(--border)",
}}
```

---

_Reviewed: 2026-06-25T02:16:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
