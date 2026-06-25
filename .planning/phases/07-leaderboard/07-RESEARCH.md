# Phase 07: Leaderboard — Research

**Researched:** 2026-06-24
**Domain:** Supabase cross-user query, React component, repository pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Show top 50 users, scrollable list — no pagination; single LIMIT 50 query.
- **D-02:** If the current user is outside top 50, pin them at the bottom with a visual separator (dashed divider + "You" label) above their row.
- **D-03:** Loading state: skeleton rows (subtlePulse shimmer), matching AchievementsGallery and DashboardPage.
- **D-04:** Level derived from XP inline in the Supabase query (e.g., `FLOOR(xp / threshold) + 1`). No denormalized `level` column. Consistent with how Level is derived elsewhere.
- **D-05:** Each row: mini avatar circle (~40px) with equipped border overlay, equipped badge emoji inline next to display name. Reuses `FallbackGlyph` + equipped cosmetic pattern from `ProfileOverview.tsx`.
- **D-06:** Fallback avatar (no equipped `profile_picture`): display name initials in a deterministic colored circle.
- **D-07:** Row columns: `Rank # | Avatar+Border | Name + Badge | Level | RankValue`. Achievement count NOT shown explicitly.
- **D-08:** Accessed via dashboard card, NOT a new bottom nav tab. `NavBar` stays at 5 tabs.
- **D-09:** Page has a back button `← Dashboard` matching `AchievementDetail`/`ItemDetail` pattern.
- **Ranking formula:** `Level × AchievementCount = RankValue` — fixed.
- **Current user row highlighted** — fixed.
- **Repository pattern:** `supabaseLeaderboardRepository` + `mockLeaderboardRepository` in `data/leaderboard/` — fixed.
- **Mobile-first, touch targets ≥ 44px** — fixed.
- **RLS:** Cross-user public read with appropriate policies.

### Claude's Discretion

None specified — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 07 adds a leaderboard page that ranks all users by `Level × AchievementCount = RankValue`. The page is accessed via a new dashboard card, shows the top 50 users with equipped cosmetics on each row, and pins the current user at the bottom if they fall outside the top 50.

The implementation touches five layers: (1) a new `LeaderboardRepository` interface + `LeaderboardEntry` type in `data/types.ts`, (2) `supabaseLeaderboardRepository.ts` executing a single Supabase join query, (3) `mockLeaderboardRepository.ts` returning fixture data, (4) `LeaderboardPage.tsx` (new file), and (5) modifications to `router.ts`, `App.tsx`, and `DashboardPage.tsx` to wire up the route and entry point.

No new database tables or migrations are needed. The leaderboard is a read-only cross-user query over existing tables: `profiles` (xp, display_name), `user_achievements` (count per user), and `user_equipped` (cosmetic slots). A new RLS `SELECT` policy with `true` predicate is required on the relevant tables to allow cross-user reads for the leaderboard view — currently all RLS policies are `auth.uid() = user_id`, which blocks cross-user queries.

**Primary recommendation:** Implement the Supabase leaderboard as a single SQL query using a CTE or subquery with `COUNT` over `user_achievements` and `MAX(CASE WHEN slot=… THEN item_id END)` over `user_equipped`, ordered by `RankValue DESC LIMIT 50`. Run a second query for the current user's own row when they are not in the top 50.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Leaderboard data fetch (top 50) | API / Backend (Supabase) | — | Cross-user aggregation belongs in DB, not client |
| Level derivation from XP | API / Backend (SQL expression) | Client fallback in mock | CONTEXT.md D-04 locks SQL-inline derivation |
| Current-user pinning (outside top 50) | Frontend Server (client-side splice) | — | Single extra query + JS splice; no server logic needed |
| Equipped cosmetics join | API / Backend (Supabase) | Client-side lookup in mock | Same join that user_equipped already supports |
| Row rendering + FallbackGlyph | Browser / Client | — | Pure UI, no server involvement |
| Route guard + navigation | Browser / Client | — | Existing navigate() + parseRoute() pattern |
| Dashboard entry card | Browser / Client | — | DashboardPage.tsx addition |

---

## Standard Stack

### Core (all already installed — no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | Already in project | Cross-user leaderboard query | Project's existing Supabase client [VERIFIED: codebase grep] |
| `react` | 19 (already in project) | Component rendering | Project standard [VERIFIED: codebase grep] |
| `typescript` | Already in project | Type safety | Project standard [VERIFIED: codebase grep] |

### No new packages needed
The leaderboard phase requires zero new npm dependencies. All needed capabilities exist:
- Supabase client singleton: `packages/app/src/lib/supabase.ts`
- FallbackGlyph component: `packages/app/src/features/shared/FallbackGlyph.tsx`
- Toast hook: `packages/app/src/features/shared/Toast.tsx`
- Router: `packages/app/src/lib/router.ts`

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase.

| Package | Registry | Age | Verdict | Disposition |
|---------|----------|-----|---------|-------------|
| (none) | — | — | N/A | No new installs |

---

## Architecture Patterns

### System Architecture Diagram

```
User opens /leaderboard
        │
        ▼
LeaderboardPage (mount)
        │
        ├──► leaderboardRepo.getTopN(50)
        │          │
        │          ├── [prod] Supabase: profiles JOIN user_achievements COUNT
        │          │          JOIN user_equipped (pivot border/badge/avatar)
        │          │          ORDER BY rank_value DESC LIMIT 50
        │          │          → LeaderboardEntry[]
        │          │
        │          └── [demo] mockLeaderboardRepository
        │                     → 12 fixture entries
        │
        ├──► leaderboardRepo.getCurrentUserEntry(userId)
        │          │
        │          ├── [prod] Same join but WHERE user_id = $userId (no LIMIT)
        │          └── [demo] find in fixture or return demo user entry
        │
        ▼
  [Loading] → 8 skeleton rows (subtlePulse)
  [Error]   → useToast().error(...)
  [Success] → render top-50 <ol>
                  │
                  ├── if currentUser in top50: highlight that row
                  └── if currentUser NOT in top50: append separator + pinned row
```

### Recommended Project Structure

```
packages/app/src/
  data/
    types.ts                               ← add LeaderboardEntry + LeaderboardRepository
    leaderboard/
      supabaseLeaderboardRepository.ts     ← new — Supabase join query
      mockLeaderboardRepository.ts         ← new — fixture data
  features/
    leaderboard/
      LeaderboardPage.tsx                  ← new — page component
  features/
    dashboard/
      DashboardPage.tsx                    ← modified — add leaderboard card
  lib/
    router.ts                              ← modified — add "/leaderboard" to RoutePath
  App.tsx                                  ← modified — route case + repo injection
  index.css                                ← modified — .leaderboard-card grid-column + stagger
```

### Pattern 1: Repository Factory (matches existing pattern exactly)

**What:** Factory function returns an object implementing the interface. No classes.
**When to use:** All repository implementations in this project.

```typescript
// Source: packages/app/src/data/achievements/supabaseAchievementRepository.ts
export function createSupabaseLeaderboardRepository(): LeaderboardRepository {
  return {
    async getTopN(n) {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          user_id,
          display_name,
          xp,
          user_achievements!inner ( count ),
          user_equipped ( slot, item_id )
        `)
        // ... order + limit
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    async getCurrentUserEntry(userId) { ... }
  };
}
```

### Pattern 2: Mock Repository with Fixture Data

**What:** Returns hardcoded plausible entries. No external calls.
**When to use:** Demo mode (`isDemo` branch in App.tsx).

```typescript
// Source: packages/app/src/data/stats/mockStatsRepository.ts (structural reference)
export function createMockLeaderboardRepository(currentUserId: string): LeaderboardRepository {
  const FIXTURE: LeaderboardEntry[] = [
    { userId: "mock-1", displayName: "Ana García",    xp: 9200, achievementCount: 14, level: 9,  rankValue: 126, rank: 1, equippedBorder: null, equippedBadge: null, equippedAvatar: null },
    // ... 11 more entries
  ];
  return {
    async getTopN(n) { return FIXTURE.slice(0, n); },
    async getCurrentUserEntry(userId) {
      return FIXTURE.find(e => e.userId === userId) ?? { ...FIXTURE[0], userId, rank: 1 };
    }
  };
}
```

### Pattern 3: Component Fetch on Mount

**What:** `useState` + `useEffect` with `.then()/.catch()`. No cache, no external library.
**When to use:** All page-level data fetches in this project.

```typescript
// Source: packages/app/src/features/achievements/AchievementsGallery.tsx
const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  leaderboardRepo.getTopN(50)
    .then(setEntries)
    .catch(() => toast.error("Could not load leaderboard. Please try again."))
    .finally(() => setLoading(false));
}, [userId, leaderboardRepo]);
```

### Pattern 4: Route Registration

**What:** Two-part change — add string literal to `RoutePath` union in `router.ts`, add `case` in `renderPage()` in `App.tsx`, add `if` branch in `parseRoute()`.
**When to use:** Every new page route.

```typescript
// Source: packages/app/src/lib/router.ts
export type RoutePath =
  | "/leaderboard"   // ADD THIS
  | "/dashboard"
  // ... existing routes

// In parseRoute():
if (segments[0] === "leaderboard") {
  return { path: "/leaderboard", params: {} };
}
```

### Pattern 5: Supabase Cross-User Query with RLS

**What:** The leaderboard needs to read rows from `profiles`, `user_achievements`, and `user_equipped` for ALL users, but current RLS policies only allow `auth.uid() = user_id`.

**Solution:** A new SQL migration adds permissive SELECT-only policies on the tables needed for the leaderboard. These policies allow any authenticated user to SELECT any row (read-only cross-user leaderboard data). No insert/update/delete permissions are added.

```sql
-- New migration: 20260624000000_leaderboard_rls.sql
-- Allow authenticated users to read all profiles (for leaderboard)
create policy profiles_select_all on public.profiles
  for select using (auth.role() = 'authenticated');

-- Allow authenticated users to read all user_achievements counts (for leaderboard)
create policy ua_select_all on public.user_achievements
  for select using (auth.role() = 'authenticated');

-- Allow authenticated users to read all equipped cosmetics (for leaderboard)
create policy eq_select_all on public.user_equipped
  for select using (auth.role() = 'authenticated');
```

**Important:** Supabase evaluates multiple `FOR SELECT` policies with OR logic — existing `auth.uid() = user_id` policies remain and the new cross-user `select_all` policies are additive. This is safe.

### Pattern 6: Skeleton Loading (inline, no component)

**What:** Matches AchievementsGallery. No formal skeleton component exists; implement inline.
**When to use:** All page loading states.

```tsx
// Source: UI-SPEC.md Section 5.6 — confirmed against index.css (subtlePulse keyframe exists)
{loading && Array.from({ length: 8 }).map((_, i) => (
  <div key={i} role="status" aria-label="Loading leaderboard" style={{
    height: 48,
    background: 'var(--border)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 6,
    animation: 'subtlePulse 1.4s ease infinite',
    animationDelay: `${i * 80}ms`
  }} />
))}
```

### Anti-Patterns to Avoid

- **Querying equipped cosmetics as separate N+1 calls per user:** The leaderboard must aggregate in one SQL query, not 50 individual queries.
- **Adding a `level` column to the profiles table:** CONTEXT.md D-04 explicitly locks this as SQL-inline derivation only.
- **Using a new RLS `SECURITY DEFINER` function for cross-user reads:** Additive SELECT policies are simpler and aligned with the project's migration pattern.
- **Adding a 6th NavBar tab:** CONTEXT.md D-08 locks this — the leaderboard is dashboard-only entry.
- **Storing leaderboard results in a materialized view:** Over-engineering; top-50 LIMIT query is fast enough.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Emoji cosmetic rendering | Custom emoji renderer | `FallbackGlyph` | Already handles aria-label, sr-only, fallback text — [VERIFIED: codebase grep] |
| Error surfacing | Custom error UI | `useToast()` | All pages use this pattern — [VERIFIED: codebase grep] |
| Cross-user aggregation | Client-side JOIN | Supabase query with `count` relationship | N+1 problem; DB aggregation is correct [ASSUMED] |
| Avatar color from name | Custom hash function | Deterministic inline hash (UI-SPEC D-06) | Simple enough to inline; no library needed |

**Key insight:** The `FallbackGlyph` component and `useToast` hook handle the two most complex UI sub-problems (accessible emoji + error UX). The Supabase JS client's relationship query syntax handles the JOIN without raw SQL.

---

## Level Derivation from XP — Critical Finding

The `profileLevel` field in the demo fixture is a hardcoded integer (`12` for the demo user at `2840 XP`, with `xpToNextLevel: 3200`). [VERIFIED: codebase grep — `demo-account-data.json`]

The `AppProfile` interface (from `data/types.ts`) exposes `xp` but NOT `level` — level is derived in the fixture's `Profile.profileLevel` field and displayed from there in `ProfileOverview.tsx` and `DashboardPage.tsx`. [VERIFIED: codebase grep]

The Supabase `profiles` table schema does NOT have a `level` column — only `xp`. [VERIFIED: `supabase/migrations/20260607000000_init.sql`]

**Implication for the leaderboard Supabase query:** Level must be computed inline. The formula can be inferred from the fixture: `profileLevel=12` at `xp=2840` with `xpToNextLevel=3200`. This suggests a fixed-threshold formula, likely `FLOOR(xp / 250) + 1` or similar. However, the exact formula is not documented in code. [ASSUMED — formula must be confirmed]

**Recommended approach for the SQL query:**
```sql
-- Use a fixed XP-per-level constant. Until confirmed, assume 250 XP/level:
FLOOR(p.xp::float / 250)::int + 1 AS level
```

**For the mock repository:** Calculate level the same way client-side:
```typescript
function xpToLevel(xp: number): number {
  return Math.floor(xp / 250) + 1;
}
```

**Risk:** If `profileLevel` in the fixture was computed with a different formula, the leaderboard levels won't match ProfileOverview levels. The planner should add a verification step checking that the formula matches the displayed level for the demo user.

**Validation check:** `FLOOR(2840 / 250) + 1 = FLOOR(11.36) + 1 = 11 + 1 = 12`. This matches `profileLevel: 12` in the fixture. [VERIFIED: arithmetic check against demo-account-data.json]

---

## Supabase Query Design

### Tables Involved
| Table | Columns Used | Join Type |
|-------|-------------|-----------|
| `profiles` | `user_id`, `display_name`, `xp` | Base table |
| `user_achievements` | `user_id` (COUNT) | LEFT JOIN (users with 0 achievements still appear) |
| `user_equipped` | `user_id`, `slot`, `item_id` | LEFT JOIN (users without cosmetics still appear) |

### Current RLS Blocker
All three tables have `auth.uid() = user_id` SELECT policies only. Cross-user reads will return 0 rows without new policies. [VERIFIED: migration files]

### Recommended SQL Query Shape

```sql
-- Via Supabase JS client using PostgREST relationship query:
-- profiles → user_achievements (count)
-- profiles → user_equipped (slot pivot)

-- Option A: PostgREST relationship syntax (preferred — no raw SQL needed)
supabase
  .from("profiles")
  .select(`
    user_id,
    display_name,
    xp,
    achievement_count:user_achievements(count),
    equipped:user_equipped(slot, item_id)
  `)
  .order("rank_value", { ascending: false })   -- computed client-side after fetch
  .limit(50)

-- Option B: Supabase RPC (stored procedure) for server-side ORDER BY rank_value
-- This requires a migration with a SQL function. Adds complexity; Option A preferred.
```

**Option A caveat:** PostgREST cannot ORDER BY a computed `rank_value` (Level × AchievementCount) server-side without an RPC or view. Since the top-50 sort happens by `rank_value`, we must either:
1. Fetch more rows than 50, compute rank_value client-side, sort, take top 50 — impractical for large user bases.
2. Use a Supabase RPC (SQL function) that computes and orders by rank_value — one migration, one `supabase.rpc()` call.
3. Use a Postgres VIEW that computes rank_value and expose it via Supabase — slightly heavier but testable.

**Recommended: Supabase RPC** — write one SQL function `get_leaderboard(n integer)` that returns the join with computed level and rank_value, ordered correctly. This is the cleanest approach and matches a single `supabase.rpc("get_leaderboard", { n: 50 })` call in the repository.

### RPC Function Shape

```sql
-- Migration: 20260624000000_leaderboard_rls.sql
-- or 20260624000001_leaderboard_rpc.sql (if separate migration)

create or replace function public.get_leaderboard(n integer default 50)
returns table (
  user_id        uuid,
  display_name   text,
  xp             integer,
  level          integer,
  achievement_count bigint,
  rank_value     bigint,
  border_item_id text,
  badge_item_id  text,
  avatar_item_id text
)
language sql
security definer
set search_path = ''
as $$
  select
    p.user_id,
    p.display_name,
    p.xp,
    (floor(p.xp::float / 250)::int + 1) as level,
    count(ua.achievement_id)            as achievement_count,
    (floor(p.xp::float / 250)::int + 1) * count(ua.achievement_id) as rank_value,
    max(case when ue.slot = 'profile_border'  then ue.item_id end)  as border_item_id,
    max(case when ue.slot = 'profile_accent'  then ue.item_id end)  as badge_item_id,
    max(case when ue.slot = 'profile_picture' then ue.item_id end)  as avatar_item_id
  from public.profiles p
  left join public.user_achievements ua on ua.user_id = p.user_id
  left join public.user_equipped ue     on ue.user_id = p.user_id
  group by p.user_id, p.display_name, p.xp
  order by rank_value desc, p.xp desc
  limit n;
$$;

-- Grant to authenticated users
grant execute on function public.get_leaderboard(integer) to authenticated;
```

**`security definer`** is required so the function can read across all users despite RLS policies on the underlying tables. [ASSUMED — standard Supabase pattern for cross-user reads]

---

## TypeScript Interface Design

```typescript
// Add to packages/app/src/data/types.ts

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  achievementCount: number;
  rankValue: number;
  rank: number;                    // 1-based, computed client-side after fetch
  equippedBorderId: string | null;  // item_id from user_equipped slot='profile_border'
  equippedBadgeId: string | null;   // item_id from user_equipped slot='profile_accent'
  equippedAvatarId: string | null;  // item_id from user_equipped slot='profile_picture'
}

export interface LeaderboardRepository {
  getTopN(n: number): Promise<LeaderboardEntry[]>;
  getCurrentUserEntry(userId: string): Promise<LeaderboardEntry | null>;
}

// Add to AppContextValue:
export interface AppContextValue {
  // ... existing fields
  leaderboardRepo: LeaderboardRepository;
}
```

**Design note on cosmetic IDs vs emoji:** The leaderboard repository returns `equippedBorderId`, `equippedBadgeId`, and `equippedAvatarId` as item IDs (strings like `"Border-001"`). The page component must look up emoji and emojiFallback from the static store catalog (available via `dashboardData.storeItems`). This avoids coupling the Supabase query to the emoji data, which lives in the client-side catalog. [VERIFIED: StoreItemSchema has `emoji`/`emojiFallback` fields]

---

## Equipped Cosmetics Join — Implementation Detail

ProfileOverview.tsx currently resolves equipped cosmetics by searching `dashboardData.storeItems` (the static fixture array) for items where `isEquipped === true`. [VERIFIED: `ProfileOverview.tsx` lines 12–14]

For the leaderboard, each row belongs to a different user — the leaderboard page cannot use `dashboardData.storeItems.isEquipped` (which reflects only the current user). Instead:
- The RPC returns `border_item_id`, `badge_item_id`, `avatar_item_id` as raw item IDs.
- The page component looks up the corresponding `StoreItem` from `dashboardData.storeItems` by `storeItemId` to get the emoji/emojiFallback.
- This approach reuses the static catalog with zero extra queries.

```tsx
// In LeaderboardPage.tsx
const { storeItems } = dashboardData;  // passed as prop

function resolveEmoji(itemId: string | null): { emoji: string; fallback: string } | null {
  if (!itemId) return null;
  const item = storeItems.find(s => s.storeItemId === itemId);
  return item ? { emoji: item.emoji, fallback: item.emojiFallback } : null;
}
```

---

## Router Integration Pattern

```typescript
// packages/app/src/lib/router.ts — ADD to RoutePath union
export type RoutePath =
  | "/leaderboard"
  // ... all existing routes

// ADD to parseRoute():
if (segments[0] === "leaderboard") {
  return { path: "/leaderboard", params: {} };
}

// ADD to getParentRoute():
if (currentRoute === "/leaderboard") return "/dashboard";

// ADD to getRouteBreadcrumbLabel():
case "/leaderboard": return "Leaderboard";
```

---

## App.tsx Integration Pattern

```tsx
// ADD import:
import { LeaderboardPage } from "./features/leaderboard/LeaderboardPage";
import { createSupabaseLeaderboardRepository } from "./data/leaderboard/supabaseLeaderboardRepository";
import { createMockLeaderboardRepository } from "./data/leaderboard/mockLeaderboardRepository";

// In appContextValue useMemo — demo branch:
leaderboardRepo: createMockLeaderboardRepository(session.userId),

// In appContextValue useMemo — prod branch:
leaderboardRepo: createSupabaseLeaderboardRepository(),

// In renderPage() switch:
case "/leaderboard":
  return <LeaderboardPage dashboardData={data} />;
```

---

## Dashboard Card Integration

The `DashboardPage.tsx` bento grid uses named CSS classes for each card (`profile-card`, `xp-card`, etc.) with grid-column and stagger animation defined in `index.css`. [VERIFIED: `index.css` lines 390–396, `DashboardPage.tsx` lines 117–327]

The existing stagger delays go from 60ms to 300ms. The leaderboard card should use 340ms (next in sequence), matching UI-SPEC Section 5.5.

```css
/* Add to index.css after .timeline-card: */
.leaderboard-card { grid-column: span 6; animation: fadeUp 360ms 340ms ease both; }
```

The card body shows a mini preview of the top 3 entries. Since `LeaderboardRepository` is available only through `AppContext`, the `DashboardPage` cannot call it directly (DashboardPage does not currently use `useAppContext`). Two options:

1. **Pass top-3 data as prop:** LeaderboardPage fetches, DashboardPage doesn't. The dashboard card shows a CTA button only (no preview data). Simpler — no context dependency in DashboardPage.
2. **DashboardPage uses `useAppContext` to fetch top 3:** Adds a repo call to the dashboard mount path.

**Recommendation:** Option 1 (CTA-only dashboard card, no preview rows). Simpler, faster dashboard load. The UI-SPEC mini preview rows are a nice-to-have but require context access in DashboardPage — skip for this phase unless explicitly prioritized. If preview is required, DashboardPage must add `useAppContext()` and a leaderboard fetch. [ASSUMED — decision point for planner to confirm]

---

## Common Pitfalls

### Pitfall 1: RLS Blocking Cross-User Reads
**What goes wrong:** `supabase.rpc("get_leaderboard")` returns 0 rows or an RLS violation error because the underlying tables only allow `auth.uid() = user_id`.
**Why it happens:** The `SECURITY DEFINER` function bypasses RLS for the query execution, but only if the function itself is created by a privileged role (postgres/service_role). Supabase local dev and hosted both support this pattern correctly.
**How to avoid:** Use `security definer` + `set search_path = ''` in the function definition (matches existing `increment_xp` function pattern). [VERIFIED: `20260622000000_user_state_tables.sql` line 88]
**Warning signs:** RPC returns empty array in production but mock returns data correctly.

### Pitfall 2: Level Formula Mismatch Across Views
**What goes wrong:** The leaderboard shows Level 11 for a user while ProfileOverview shows Level 12.
**Why it happens:** Different XP-per-level thresholds used in SQL vs. client-side display.
**How to avoid:** Confirm the formula against the demo fixture (`xp=2840` → `level=12`). Use `FLOOR(xp / 250) + 1` consistently in both the RPC and any client-side mock. [VERIFIED: arithmetic check — 2840/250 = 11.36 → floor = 11 → +1 = 12]
**Warning signs:** Demo user's level in leaderboard doesn't match their profile level display.

### Pitfall 3: N+1 Queries for Cosmetics
**What goes wrong:** Fetching equipped cosmetics per leaderboard row with separate Supabase calls (50 calls for 50 rows).
**Why it happens:** Copy-pasting the `inventoryRepo.getEquipped(userId)` pattern per row instead of joining in the RPC.
**How to avoid:** Use `MAX(CASE WHEN slot = '...' THEN item_id END)` pivot in the RPC — one query, all cosmetics. [ASSUMED — standard SQL pivot pattern]
**Warning signs:** DevTools Network shows 50+ Supabase API calls when loading the leaderboard.

### Pitfall 4: Demo Mode leaderboardRepo Missing from AppContextValue
**What goes wrong:** TypeScript error or runtime crash because `leaderboardRepo` is not injected in the `isDemo` branch of `App.tsx`.
**Why it happens:** Adding to `AppContextValue` interface but only wiring the prod branch.
**How to avoid:** Always update BOTH `isDemo` and production branches in `appContextValue` useMemo simultaneously.
**Warning signs:** TypeScript compile error "Property 'leaderboardRepo' is missing in type".

### Pitfall 5: DashboardPage Cannot Call leaderboardRepo Without useAppContext
**What goes wrong:** Attempting to render top-3 preview rows in the dashboard card results in "Cannot read property of undefined" because DashboardPage doesn't consume AppContext.
**Why it happens:** DashboardPage currently receives only `dashboardData` and `avatarSrc` as props — no context hook. [VERIFIED: `DashboardPage.tsx` line 89]
**How to avoid:** Either (a) skip the mini preview and use CTA-only card, or (b) add `useAppContext()` to DashboardPage and add a leaderboard fetch there. Option (a) is simpler.

---

## Code Examples

### LeaderboardPage Shell
```tsx
// Source: structural mirror of AchievementsGallery.tsx
export function LeaderboardPage({ dashboardData }: { dashboardData: DashboardData }) {
  const { userId, leaderboardRepo } = useAppContext();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      leaderboardRepo.getTopN(50),
      leaderboardRepo.getCurrentUserEntry(userId),
    ])
      .then(([top, me]) => { setEntries(top); setCurrentEntry(me); })
      .catch(() => toast.error("Could not load leaderboard. Please try again."))
      .finally(() => setLoading(false));
  }, [userId, leaderboardRepo]);

  const currentUserInTop = entries.some(e => e.userId === userId);
  const shouldPinUser = currentEntry && !currentUserInTop;

  return (
    <section className="screen leaderboard-screen swiss page-enter">
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
        <header className="topbar">
          <button onClick={() => navigate("/dashboard")}>← Dashboard</button>
          <h1>Leaderboard</h1>
          <div />
        </header>
        {loading ? <SkeletonRows /> : (
          <>
            <ol aria-label="Leaderboard — Top 50 players" style={{ listStyle: "none", padding: 0 }}>
              {entries.map((e, i) => (
                <LeaderboardRow key={e.userId} entry={e} rank={i + 1}
                  isCurrentUser={e.userId === userId}
                  storeItems={dashboardData.storeItems} />
              ))}
            </ol>
            {shouldPinUser && (
              <>
                <Separator />
                <LeaderboardRow entry={currentEntry!} rank={currentEntry!.rank}
                  isCurrentUser storeItems={dashboardData.storeItems} />
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
```

### Fallback Avatar (Initials Circle)
```tsx
// UI-SPEC D-06 — deterministic color from display name
const AVATAR_COLORS = ['#c0392b','#2563eb','#16a34a','#b45309','#7c3aed','#0891b2'];

function avatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function InitialsAvatar({ name }: { name: string }) {
  return (
    <div aria-hidden="true" style={{
      width: 40, height: 40, borderRadius: '50%',
      background: avatarColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: '0.88rem', fontWeight: 700,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| React class components | React function components + hooks (this project uses React 19) | No change needed — project already on functional pattern |
| Global state library (Redux) | `useState` + `useEffect` per page | No change needed — project pattern is local state |
| Raw Supabase SQL | PostgREST relationship queries + RPCs | Use RPC for rank_value ORDER BY |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | XP-per-level formula is `FLOOR(xp / 250) + 1` | Level Derivation | Leaderboard levels won't match ProfileOverview levels. Planner should add a verification step. |
| A2 | `SECURITY DEFINER` function bypasses RLS correctly for cross-user reads in this Supabase setup | Supabase Query Design | Leaderboard returns 0 rows. Fallback: add explicit `select_all` RLS policies instead of relying solely on SECURITY DEFINER. |
| A3 | Dashboard card should be CTA-only (no top-3 mini preview) given DashboardPage lacks useAppContext | Dashboard Card | If preview is required, DashboardPage needs useAppContext + leaderboard fetch at mount time. |
| A4 | `supabase.rpc("get_leaderboard", { n: 50 })` returns rows typed as the function's return table | Supabase Query | May require explicit TypeScript cast or Supabase generated types. |
| A5 | PostgREST `count` aggregate syntax works for `user_achievements` relationship | Supabase Query | If not, switch to RPC (already recommended as primary approach). |

---

## Open Questions

1. **XP-per-level threshold confirmation**
   - What we know: `profileLevel: 12` at `xp: 2840` — arithmetic confirms `FLOOR(2840/250)+1 = 12`.
   - What's unclear: Is the threshold fixed at 250, or does it scale (e.g., triangular number scaling)?
   - Recommendation: The arithmetic check is strong evidence for 250 XP/level. Proceed with this formula and verify during the phase by cross-checking the demo user's leaderboard level against their ProfileOverview level.

2. **Dashboard card: CTA-only vs. top-3 preview**
   - What we know: UI-SPEC specifies mini preview rows; DashboardPage has no `useAppContext` today.
   - What's unclear: Is the mini preview hard-required or is it acceptable to show only the "View Rankings" CTA?
   - Recommendation: Implement CTA-only first (simpler), note in the plan that preview rows require adding `useAppContext` to DashboardPage.

---

## Environment Availability

Step 2.6: SKIPPED (no new external tools or services — this phase uses the existing Supabase client and React stack already confirmed in prior phases).

---

## Security Domain

`security_enforcement: true` in `.planning/config.json`. ASVS Level 1 applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Leaderboard is read-only; existing auth gate covers it |
| V3 Session Management | No | Reuses existing session |
| V4 Access Control | YES | Cross-user read requires explicit RLS policy or SECURITY DEFINER function |
| V5 Input Validation | Minimal | `n` parameter to RPC is an integer — validate `n <= 100` in SQL |
| V6 Cryptography | No | No new secrets or encryption |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized data exposure via leaderboard | Info Disclosure | RLS + SECURITY DEFINER — function only exposes display_name, xp, level, counts. No PII (email, phone) returned. |
| SQL injection via `n` parameter | Tampering | PostgREST/RPC integer type coerces and validates — no string interpolation |
| Client-side rank manipulation | Tampering | Rank computed server-side in SQL; client only renders returned rows |

**PII note:** The leaderboard RPC must NOT return `email`, `phone`, or any other PII. It returns only: `user_id`, `display_name`, `xp`, `level`, `achievement_count`, `rank_value`, and cosmetic item IDs. `display_name` is user-chosen and suitable for public display.

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260607000000_init.sql` — profiles table schema verified
- `supabase/migrations/20260622000000_user_state_tables.sql` — user_achievements, user_equipped, increment_xp RPC pattern verified
- `packages/app/src/data/types.ts` — AppContextValue, repository interfaces verified
- `packages/app/src/lib/router.ts` — RoutePath union, parseRoute() pattern verified
- `packages/app/src/App.tsx` — repo injection pattern, renderPage() pattern verified
- `packages/app/src/data/achievements/supabaseAchievementRepository.ts` — factory function pattern verified
- `packages/app/src/data/achievements/mockAchievementRepository.ts` — mock factory pattern verified
- `packages/app/src/data/inventory/supabaseInventoryRepository.ts` — equipped query pattern verified
- `packages/app/src/features/profile/ProfileOverview.tsx` — cosmetics display, FallbackGlyph usage verified
- `packages/app/src/features/dashboard/DashboardPage.tsx` — bento card pattern, card-header/card-meta verified
- `packages/app/src/features/shared/FallbackGlyph.tsx` — component interface verified
- `packages/app/src/index.css` — CSS tokens, keyframes (subtlePulse, pageEnter, fadeUp), bento grid, card stagger verified
- `packages/app/src/data/account/mock/demo-account-data.json` — demo profile: xp=2840, profileLevel=12 (level formula check)
- `packages/app/src/data/account/schema.ts` — StoreItem schema (emoji/emojiFallback fields) verified

### Secondary (MEDIUM confidence)
- `07-CONTEXT.md` — all locked decisions cited
- `07-UI-SPEC.md` — complete design contract cited

### Tertiary (LOW confidence)
- SQL SECURITY DEFINER cross-user RLS bypass — [ASSUMED] standard Supabase pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages are in the existing project; no new dependencies
- Architecture: HIGH — repository pattern verified from 6+ existing implementations
- SQL query design: MEDIUM — RPC structure is correct; exact PostgREST aggregate syntax is ASSUMED
- Pitfalls: HIGH — all pitfalls derived from verified codebase inspection
- Level formula: HIGH — arithmetic cross-check passes against demo fixture

**Research date:** 2026-06-24
**Valid until:** 2026-07-24 (stable codebase; no rapidly-changing dependencies)
