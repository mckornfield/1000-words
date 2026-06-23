# Phase 7: Leaderboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 07-leaderboard
**Areas discussed:** Results scope & current-user pinning, Cosmetics row display, Navigation entry point

---

## Results scope & current-user pinning

| Option | Description | Selected |
|--------|-------------|----------|
| Top 50, scrollable list | Fixed cap keeps the Supabase query cheap. No pagination needed. | ✓ |
| Top 100, scrollable list | Larger audience for rankings. Still single-query, bigger LIMIT. | |
| Full list (all users) | Shows everyone. Query cost scales with user count. | |

**User's choice:** Top 50, scrollable list

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pin them at the bottom with a separator | Divider line then the current user's row at the very bottom, regardless of actual rank. | ✓ |
| No special pinning — just show top 50 | If not in top 50, you don't appear. | |
| Show their rank in a header badge, not the list | "Your rank: #312" at the top as a stat, only top 50 in the list. | |

**User's choice:** Pin them at the bottom with a separator

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton rows (placeholder shimmer) | Match existing pattern — AchievementsGallery and DashboardPage both use this. | ✓ |
| Spinner only | Single centered spinner. Simpler. | |
| You decide | Pick whatever matches existing loading patterns. | |

**User's choice:** Skeleton rows (placeholder shimmer)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Derive Level from XP in the Supabase query | SQL expression inline. Consistent with how Level is derived elsewhere. | ✓ |
| Store Level on the profiles table | Denormalized level column updated when XP changes. | |
| You decide | Use whatever is consistent with how Level is currently derived. | |

**User's choice:** Derive Level from XP in the Supabase query

---

## Cosmetics row display

| Option | Description | Selected |
|--------|-------------|----------|
| Mini avatar circle with border overlay + badge inline | Reuses ProfileOverview FallbackGlyph pattern at smaller scale. | ✓ |
| Avatar only (border, no badge in row) | Just avatar with equipped border. Badge omitted to save space. | |
| No avatar — text-only rows with cosmetic emoji suffixes | Rank + Name + badge emoji + level + RankValue. No image. | |

**User's choice:** Mini avatar circle with border overlay + badge inline

---

| Option | Description | Selected |
|--------|-------------|----------|
| Initials in a colored circle | First letter of display name in a styled circle. | ✓ |
| Generic person emoji / icon | Single emoji (👤) in a circle. | |
| You decide | Follow whatever ProfileOverview handles for avatars without equipped picture. | |

**User's choice:** Initials in a colored circle

---

| Option | Description | Selected |
|--------|-------------|----------|
| Rank # \| Avatar+Border \| Name + Badge \| Level \| RankValue | Compact for mobile; achievement count implicit in RankValue. | ✓ |
| Rank # \| Avatar+Border \| Name + Badge \| Level \| Achievements \| RankValue | All formula components explicit. Wider row — might be cramped. | |
| Rank # \| Avatar \| Name \| RankValue only | Minimal. Hides formula inputs. | |

**User's choice:** Rank # | Avatar+Border | Name + Badge | Level | RankValue

---

## Navigation entry point

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard card/section (no new nav tab) | Add leaderboard card to DashboardPage. NavBar stays at 5 tabs. | ✓ |
| Replace "Goals" tab in bottom nav with "Leaderboard" | Goals removed from bottom nav, replaced with trophy icon. | |
| Add a 6th bottom nav tab | Expand NavBar to 6 items — unusual for mobile. | |

**User's choice:** Dashboard card/section (no new nav tab)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Back button in page header | "‹ Back" / "‹ Dashboard" at top of leaderboard page. Matches AchievementDetail and ItemDetail. | ✓ |
| Bottom NavBar only (no back button) | User navigates back via the Home tab. | |
| You decide | Follow whatever back-navigation pattern other detail/list pages use. | |

**User's choice:** Back button in page header

---

## Claude's Discretion

- Level XP derivation threshold — use the same formula/constant already used in StatsPage or wherever Level is derived in the app. No new formula introduced.
- Exact color of the initials-avatar circle fallback — match existing avatar styling conventions.

## Deferred Ideas

None — discussion stayed within phase scope.
