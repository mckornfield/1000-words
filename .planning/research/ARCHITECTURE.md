# Architecture Research: Achievement System, Shop & Leaderboard
_Last updated: 2026-06-22_

## Summary

The existing repository pattern (interfaces in `data/types.ts`, dual mock/Supabase implementations, injection via `AppContext`) is well-established and must be followed exactly for every new data concern. The three new domains — achievement prerequisites/unlocks, Token currency, and leaderboard ranking — each have clear natural homes within this pattern. The most important architectural decision is that all unlock checking stays on the client after session end (no DB triggers), Token spending mirrors `increment_xp` exactly with a `spend_tokens` SQL function, and the leaderboard is a computed query over `profiles` plus a count of `user_achievements` rows, handled through a new `LeaderboardRepository`.

---

## Achievement System Architecture

### Prerequisite Chain Modeling

Store prerequisites as data, not code. Add a `prerequisite_achievement_id` nullable column to the achievement catalog. For MVP, the catalog lives in `data/account/mock/demo-account-data.json` (already the source of static definitions). Extend `AchievementSchema` in `data/account/schema.ts` with:

```typescript
prerequisiteId: z.string().regex(/^Ach-\d{3}$/).nullable()
```

This is an adjacency list with depth 1 per node (each achievement has at most one prerequisite). It is not a DAG of arbitrary depth — that is intentional scope control. If chains grow complex later, a closure table can be added; for now single-level adjacency is sufficient and readable.

The client derives `isLocked` for display purposes: an achievement is locked if its `prerequisiteId` is non-null and that prerequisite is not present in the `UserAchievement[]` array returned by `achievementRepo.getUserAchievements()`. This computation happens in the `AchievementsGallery` component and in `AchievementDetail`, not in the repository.

### Where Unlock Checking Lives

Unlock checking runs **client-side at session end**, inside `StudySession.tsx` in the existing `onSessionComplete` handler (currently only writes XP). This is the correct placement because:

- All the needed state is already present at session end: `results[]`, `userId`, `profileRepo`, `achievementRepo`.
- No DB trigger complexity, no Edge Function cold-starts, no fan-out latency.
- Idempotency is already handled: `supabaseAchievementRepository.unlock()` ignores duplicate-key errors.

The unlock check function should live in `packages/app/src/lib/achievementEngine.ts` (pure TypeScript, no I/O) so it can be unit-tested without mocking. It accepts the achievement catalog, the list of already-earned achievement IDs, and session result metrics, and returns a list of newly earned achievement IDs. The caller in `StudySession.tsx` iterates and calls `achievementRepo.unlock()` for each.

```typescript
// packages/app/src/lib/achievementEngine.ts
export function checkAchievements(
  catalog: Achievement[],
  earned: Set<string>,
  metrics: SessionMetrics,   // { cardsReviewed, accuracy, xpEarned, hour, streakCount, ... }
): string[] { /* returns newly unlocked achievement IDs */ }
```

**Criteria types supported in MVP:**
- `xp_total` — profile xp threshold
- `streak_days` — current streak count
- `cards_reviewed_total` — cumulative count from review_logs (pre-fetched)
- `lessons_completed` — count of lessons at 100%
- `accuracy_perfect` — session accuracy === 100
- `time_of_day` — hour of study (early bird / night owl)

These criteria are encoded as fields on the `Achievement` catalog objects. The catalog is static JSON, so adding a new criterion type requires only a JSON update plus a matching check in `achievementEngine.ts`.

### AchievementRepository Interface Extension

The existing `AchievementRepository` interface in `data/types.ts` has `getUserAchievements` and `unlock`. No additions are needed for prerequisites — that logic is purely client-side over static data. The interface stays minimal.

---

## Token Currency Architecture

### Storage

Add a `tokens` column to the existing `profiles` table via a new migration. This mirrors how `xp` is stored — a single integer column on the profile row, not a separate wallet table. The rationale: simpler joins, consistent with the XP pattern, and no additional RLS surface area.

```sql
-- new migration: 20260623000000_add_tokens.sql
alter table public.profiles add column if not exists tokens integer not null default 0;
```

### Atomic Spend Function

Add `spend_tokens(uid uuid, amount integer)` as a SQL function that mirrors `increment_xp` exactly:

```sql
create or replace function public.spend_tokens(uid uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set tokens = tokens - amount
  where user_id = uid and tokens >= amount;
  if not found then
    raise exception 'insufficient_tokens';
  end if;
end;
$$;
```

The key difference from `increment_xp` is the guard condition (`tokens >= amount`) and the explicit error raise. The caller catches the `insufficient_tokens` exception and surfaces it as a user-facing "Not enough Tokens" error, identical to how `ItemDetail.tsx` currently surfaces "Insufficient Balance" for XP.

### ProfileRepository Extension

Add `addTokens(userId: string, delta: number): Promise<void>` and `spendTokens(userId: string, amount: number): Promise<void>` to `ProfileRepository` in `data/types.ts`. Extend `AppProfile` with `tokens: number`.

```typescript
// data/types.ts additions
export interface AppProfile {
  // ... existing fields
  tokens: number;
}

export interface ProfileRepository {
  // ... existing methods
  addTokens(userId: string, delta: number): Promise<void>;
  spendTokens(userId: string, amount: number): Promise<void>;
}
```

The Supabase implementation calls `supabase.rpc("spend_tokens", { uid, amount })`. The mock implementation does in-memory arithmetic with an insufficient-balance throw when `tokens < amount`.

### Token Balance Display

Token balance is read from `AppProfile.tokens` returned by `profileRepo.getProfile()`. It is displayed in the shop header and in `ItemDetail` (alongside the existing XP balance display). No new context slot is needed — it arrives via the same `profileRepo` already in context.

### Purchase Flow Change

`ItemDetail.tsx` currently calls `profileRepo.addXp(userId, -item.priceXp)` to spend XP. When items switch to Token pricing, replace this with `profileRepo.spendTokens(userId, item.tokenCost)` and add `tokenCost: number` to the `StoreItemSchema`. Items can have both an XP price and a Token price, or one or the other — the schema supports both as nullable fields and the UI shows whichever is non-null.

---

## Shop Unlock Architecture

### Lock Condition Storage

Each shop item in the catalog has an `unlockRequirementId` field (already present as `Req-XXX` strings in `demo-account-data.json`). Replace the opaque `Req-XXX` reference with a direct `achievement_id_required: string | null` field. This makes the unlock condition self-documenting and eliminates a layer of indirection.

```typescript
// Updated StoreItemSchema
achievementIdRequired: z.string().regex(/^Ach-\d{3}$/).nullable()
```

### Lock Check at Render Time

The shop page loads both `storeItems` (static catalog) and the user's `UserAchievement[]` from `achievementRepo.getUserAchievements()`. An item is locked if `achievementIdRequired !== null` and that achievement ID is not in the user's earned set. This is a pure client-side Set lookup — O(1) per item.

```typescript
const earnedIds = new Set(userAchievements.map(a => a.achievementId));
const isLocked = item.achievementIdRequired !== null
  && !earnedIds.has(item.achievementIdRequired);
```

### Locked Item UI

Locked items render with a blurred preview and a lock icon overlay. The lock overlay shows which achievement is required (looked up from the achievement catalog by ID). Clicking a locked item navigates to the achievement detail page, not the purchase flow. This is a client-side routing decision in `ShopBrowse.tsx` and `ItemDetail.tsx`.

### Purchase Guard

`ItemDetail.tsx` checks `isLocked` before showing the purchase button. If locked, it renders a "Locked — earn [Achievement Name] to unlock" block instead of the purchase button. The `purchase()` call itself does not enforce the unlock condition — that guard lives entirely in the UI layer for MVP. A future migration could add a DB-level check function if needed.

---

## Leaderboard Architecture

### Ranking Formula

`RankValue = Level × AchievementCount`

Level is derived from XP using the same formula used client-side in `ProfileOverview`. For the leaderboard, this derivation happens inside the SQL query to avoid round-tripping all profiles to the client.

### Query Design

The leaderboard uses a single Supabase query against `profiles` joined with a count subquery over `user_achievements`. RLS **blocks** this join for other users' profiles unless we bypass it, so two options exist:

**Option A (recommended for MVP): Service-role function.** Create a `get_leaderboard(limit integer)` SQL function with `security definer` that bypasses RLS. It returns only the columns needed for display: `user_id`, `display_name`, `xp`, `achievement_count`, `rank_value`, and equipped cosmetics (via a join to `user_equipped`).

```sql
create or replace function public.get_leaderboard(lim integer default 50)
returns table(
  user_id         uuid,
  display_name    text,
  xp              integer,
  tokens          integer,
  achievement_count bigint,
  rank_value      bigint,
  equipped_items  jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    p.user_id,
    p.display_name,
    p.xp,
    p.tokens,
    count(ua.achievement_id)                         as achievement_count,
    (floor(p.xp / 1000) + 1) * count(ua.achievement_id) as rank_value,
    coalesce(
      (select jsonb_object_agg(slot, item_id)
       from public.user_equipped e
       where e.user_id = p.user_id),
      '{}'::jsonb
    )                                                as equipped_items
  from public.profiles p
  left join public.user_achievements ua on ua.user_id = p.user_id
  group by p.user_id, p.display_name, p.xp, p.tokens
  order by rank_value desc
  limit lim;
$$;
```

This function is callable by authenticated users via `supabase.rpc("get_leaderboard", { lim: 50 })` while still being safe because it returns no private data (no email, no settings, no streak details).

**Option B: Public read policy on profiles.** Add a policy allowing any authenticated user to SELECT `user_id`, `display_name`, `xp` columns only (using column-level security or a view). More complex to set up correctly; defer to a later phase if needed.

**Use Option A.** It is the direct mirror of the `increment_xp` and `spend_tokens` pattern already established.

### LeaderboardRepository Interface

Add to `data/types.ts`:

```typescript
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  achievementCount: number;
  rankValue: number;
  equippedItems: Record<EquipSlot, string>;  // slot → itemId
}

export interface LeaderboardRepository {
  getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
}
```

Add `leaderboardRepo: LeaderboardRepository` to `AppContextValue`. Both mock and Supabase implementations follow the standard pattern.

Mock implementation returns a hardcoded array of 5–10 demo entries with varied ranks, seeded from `demo-account-data.json`. The demo user's entry is included.

Supabase implementation calls `supabase.rpc("get_leaderboard", { lim: limit ?? 50 })` and maps the result to `LeaderboardEntry[]`.

### RLS Concerns

The `get_leaderboard` function with `security definer` bypasses row-level security for the internal query. This is intentional and safe because:
- It returns only the columns explicitly listed (no private fields).
- The caller must still be authenticated (Supabase enforces JWT before the RPC call).
- The display name and cosmetics are already public-facing data in the product's UX.

No new RLS policies need to be added to `profiles` or `user_achievements` — the existing "own rows only" policies remain untouched.

---

## Equipped Cosmetic State Architecture

The `user_equipped` table already has the correct design: `PRIMARY KEY (user_id, slot)`. This enforces exactly one equipped item per slot at the database level. The `equip()` method already uses `upsert` with `onConflict: "user_id,slot"` — correct.

The three slots are `profile_picture`, `profile_border`, `profile_accent`, typed as `EquipSlot` in `data/types.ts`. No changes needed to the equipped state model.

For the leaderboard, equipped cosmetics are fetched as a `jsonb` object inside `get_leaderboard()` to avoid a separate N+1 query per user.

For `StudySession.tsx`, the equipped avatar/border should be fetched once on mount via `inventoryRepo.getEquipped(userId)` and stored in local component state. The study session card UI reads from this state to render the user's equipped avatar in the header.

---

## Suggested Build Order

Dependencies flow in this order; each phase unlocks the next:

1. **Token currency (migration + ProfileRepository extension)**
   - Adds `tokens` column to `profiles`
   - Adds `spend_tokens()` SQL function
   - Extends `AppProfile` and `ProfileRepository` in `types.ts`
   - Extends both mock and Supabase profile repositories
   - No UI changes yet; just the data layer

2. **Achievement catalog extension (static data + achievementEngine.ts)**
   - Add `prerequisiteId` and criteria fields to `AchievementSchema` and `demo-account-data.json`
   - Write `achievementEngine.ts` with `checkAchievements()` — pure, no I/O, unit-testable
   - Wire into `StudySession.tsx` `onSessionComplete`
   - `AchievementsGallery` + `AchievementDetail`: read prerequisite state from catalog + earned set

3. **Shop unlock conditions (catalog + ItemDetail UI)**
   - Replace `unlockRequirementId: Req-XXX` with `achievementIdRequired: Ach-XXX | null` in catalog
   - `ShopBrowse` and `ItemDetail` compute `isLocked` from earned achievements
   - Locked item renders blurred preview + lock icon + achievement name
   - Switch purchase currency from XP to Tokens (use `spendTokens`)

4. **Leaderboard (SQL function + LeaderboardRepository + LeaderboardPage)**
   - Add `get_leaderboard()` SQL function in a new migration
   - Add `LeaderboardRepository` to `types.ts`, `AppContextValue`, and `App.tsx`
   - Implement mock and Supabase repositories
   - Build `LeaderboardPage` component consuming `leaderboardRepo.getLeaderboard()`
   - Display equipped cosmetics on leaderboard rows

5. **Cosmetics in study session and profile**
   - `StudySession.tsx`: fetch `getEquipped()` on mount, render equipped avatar in session header
   - `ProfileOverview`: render equipped border/accent around profile card
   - These are pure UI reads — no new data layer work needed

**Key dependency:** Step 2 (achievements unlocking) must precede Step 3 (shop locks) because the shop lock check requires a populated earned achievement set. Steps 1 and 2 can be developed in parallel since Token currency and achievement engine are independent.
