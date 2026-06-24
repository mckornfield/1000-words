---
phase: 7
phase_name: leaderboard
status: draft
created: 2026-06-24
tool: none
---

# UI-SPEC — Phase 07: Leaderboard

> Design contract for the leaderboard page and its dashboard entry point.
> Consumed by: gsd-planner, gsd-executor, gsd-ui-checker, gsd-ui-auditor.

---

## 1. Design System

| Field | Value | Source |
|-------|-------|--------|
| Tool | None (custom CSS variables + Tailwind v4 import) | Codebase scan — no `components.json` found |
| Token file | `packages/app/src/index.css` `:root` block | Detected |
| Registry | Not applicable | N/A |
| Component library | Custom components only | Detected |
| Styling approach | CSS custom properties + Tailwind v4 utility classes | Detected |

**No shadcn gate required.** Project uses a bespoke design system; all tokens are declared in `index.css`. Do not initialize shadcn.

---

## 2. Color Contract

### Tokens (from `index.css` — use these exclusively; do not hardcode hex values)

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--bg` | `#f2efe9` | `#141210` | Page background (60% surface) |
| `--surface` | `#ffffff` | `#1e1c1a` | Card / panel background |
| `--surface-raised` | `#faf8f5` | `#242220` | Row hover + pinned-user background |
| `--border` | `#e0dbd2` | `#2e2b28` | Standard border |
| `--border-subtle` | `#ebe7e0` | `#252320` | Separator line, row dividers |
| `--text` | `#181715` | `#f0ede8` | Primary text (rank #, display name) |
| `--text-secondary` | `#504d48` | `#c4bfb8` | Secondary labels (Level label, RankValue label) |
| `--muted` | `#8a8680` | `#78746e` | Tertiary copy (meta, separator text) |
| `--accent` | `#c0392b` | `#e84040` | Accent — reserved for: current user highlight ring, rank #1 medal, back button active state, leaderboard dashboard card accent strip (swiss-rule) |
| `--status-ok` | `#16a34a` | `#22c55e` | Not used in leaderboard rows; available for error recovery toast |

### 60/30/10 Split for Leaderboard Page

- **60% — `--bg`**: page background behind the scrollable list
- **30% — `--surface`**: each leaderboard row card / bento-cell wrapper
- **10% — `--accent`**: current-user highlight ring (2px border), rank #1 gold medal indicator, dashboard card accent strip

### Current-User Highlight Treatment

The current user's row uses:
- `background: var(--surface-raised)` — slightly elevated vs other rows
- `border: 1.5px solid var(--accent)` — accent border ring (not a full fill, just ring)
- No opacity change — user's row must be fully readable
- Position: inline in rank order if top 50; pinned below separator if outside top 50

**Primary focal point:** The current-user highlighted row (accent border ring via `--accent`) draws the eye first; rank medal emojis (🥇 🥈 🥉) anchor positions 1–3 as secondary focal points.

### Separator (pinned user outside top 50)

- A `<hr>`-style divider: `border-top: 1px dashed var(--border)` + `margin: 8px 0`
- Optional label: `"···"` centered in `--muted` color, `0.7rem`, uppercase, letter-spacing `0.08em`

---

## 3. Spacing Scale

Use multiples of 4px only. Standard 8-point grid.

| Token | px | Usage |
|-------|----|-------|
| 4px | 4 | Icon internal padding, micro-gaps within avatar+border overlay |
| 8px | 8 | Gap between avatar and name column, gap between rank # and avatar |
| 12px | 12 | Row vertical padding (top/bottom) |
| 16px | 16 | Row horizontal padding (left/right), section padding |
| 24px | 24 | Section gap between page header and list |
| 32px | 32 | Page outer padding on larger viewports |
| 48px | 48 | Minimum touch target height for all leaderboard rows |
| 64px | 64 | Bottom padding to clear fixed NavBar (`--nav-height: 64px`) |

**Touch target rule:** Every leaderboard row must be at least 44px tall (48px preferred). Avatar circle is 40px — row padding makes the touch target 48px total.

---

## 4. Typography

All type uses the project's inherited `font-family` (system stack). No custom web fonts.

### Type Scale (4 sizes — maximum)

| Role | Size | Weight | Line-Height | Token equivalent |
|------|------|--------|-------------|-----------------|
| Page title ("Leaderboard") | `1rem` uppercase | 700 | 1.0 | Matches `.topbar h1` pattern |
| Rank number + Display name | `0.88rem` | 700 | 1.3 | Tabular-nums for rank; primary row label for name |
| Dashboard card meta + RankValue/Level values | `0.75rem` | 700 | 1.4 | Stacked value columns + `.card-meta` pattern |
| Level/RankValue labels + separator copy | `0.67rem` uppercase | 400 | 1.0 | `--muted`, letter-spacing `0.07em` |

**Consolidation notes:**
- The previous `0.85rem` value size for Level/RankValue is dropped; use `0.75rem` for those stacked values.
- The previous `0.9rem` page-title variant is dropped; use `1rem` only.
- Weight 650 (semibold) and weight 800 are dropped. Use `700` for all emphasized text.

### Weight Usage (2 weights — maximum)

- **400 (regular):** Labels (`Lv`, `pts`), separator copy (`You`), dashboard card meta, secondary text in `--muted`
- **700 (bold):** Page title, rank numbers, display names, stacked value columns (Level value, RankValue)

---

## 5. Component Inventory

### 5.1 Leaderboard Page (`LeaderboardPage.tsx`)

**Shell structure:** Matches `AchievementsGallery` / `AchievementDetail` page pattern:
- `<section className="screen leaderboard-screen swiss page-enter">`
- `<div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>`
- `<header className="topbar">` with back button + title

**Page header:**
- Back button: `← Dashboard` — plain `<button>` navigating to `/dashboard`, using default button styles
- Title: `<h1>Leaderboard</h1>` — inherits `.swiss h1` (weight 700, letter-spacing -0.015em)
- Third header slot: empty `<div />` (preserves topbar flex layout)

**Loading state:** Skeleton shimmer rows — 8 placeholder rows, each matching the row height (~48px). Use `subtlePulse` keyframe animation already defined in `index.css` (`animation: subtlePulse 1.4s ease infinite`). Background: `var(--border)`, border-radius `var(--radius-sm)`. No new animation needed.

**Error state:** Reuse `useToast()` pattern — `toast.error("Could not load leaderboard. Please try again.")` on fetch failure. No inline error UI needed beyond toast.

**Empty state:** Not expected (Supabase always returns at least current user), but if list is empty:
- Use `.empty-state` class pattern from `index.css`
- Icon: `🏆` (3rem, opacity 0.6)
- Heading: `"No rankings yet"`
- Body: `"Be the first to complete lessons and earn a spot."`

### 5.2 Leaderboard Row

**Structure (flex row, 48px min-height):**
```
[Rank #] [Avatar+Border] [Name + Badge] [Level] [RankValue]
  48px      40px circle     flex-1        auto     auto
```

**Column specs:**

| Column | Width | Contents | Notes |
|--------|-------|----------|-------|
| Rank # | 32px, text-align right | `#1`, `#2`, … `#50` | `font-variant-numeric: tabular-nums`; `0.88rem`, weight 700; rank 1–3 prefix with medal emoji: 🥇 🥈 🥉 replacing `#` |
| Avatar | 40px × 40px | `<img>` or initials circle | `border-radius: 50%` — circular; border: `2px solid var(--border)` default; `2px solid var(--accent)` if equipped border cosmetic |
| Border overlay | 16px × 16px | `<FallbackGlyph>` emoji | `position: absolute; bottom: -4px; right: -4px; font-size: 0.9rem` — matches ProfileOverview border overlay pattern at smaller scale |
| Name + Badge | flex: 1, min-width: 0 | Display name (0.88rem, weight 700) + badge emoji | Badge emoji rendered as `<FallbackGlyph>` inline after name, `font-size: 0.9rem`, `margin-left: 4px` |
| Level | 44px | Numeric value + "Lv" label stacked | Value: `0.75rem`, weight 700, `--accent`; label: `0.67rem`, weight 400, `--muted`, uppercase |
| RankValue | 52px | Numeric value + "pts" label stacked | Same stacked pattern as Level column; value: `0.75rem`, weight 700, `--text`; label: `0.67rem`, weight 400 |

**Fallback avatar (no equipped profile_picture):**
- Colored circle 40px × 40px, `border-radius: 50%`
- Background: deterministic color from display name (hash first char to one of 6 accent-adjacent hues: `#c0392b`, `#2563eb`, `#16a34a`, `#b45309`, `#7c3aed`, `#0891b2`)
- Center initials: first letter of display name, uppercase, `0.88rem`, weight 700, color `#fff`

**Row padding:** `padding: 12px 16px` — achieves 48px min-height with 40px avatar

**Row hover:** `background: var(--surface-raised)`, `border-color: var(--border)` — matches `.lesson-item:hover` pattern

**Row container:** Each row is `background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm)` — matches `.lesson-item` / `.achievement-item` pattern. Gap between rows: `6px`.

### 5.3 Current-User Row (highlighted)

- `background: var(--surface-raised)` (not `--surface`)
- `border: 1.5px solid var(--accent)` (accent ring)
- All other layout identical to standard row

### 5.4 Separator (pinned user outside top 50)

```html
<div style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">
  <hr style="flex: 1; border: none; border-top: 1px dashed var(--border);" />
  <span style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em;">You</span>
  <hr style="flex: 1; border: none; border-top: 1px dashed var(--border);" />
</div>
```

### 5.5 Dashboard Card (leaderboard entry point)

Add to `DashboardPage.tsx` bento grid as a new `<article>` card:
- CSS class: `bento-cell leaderboard-card` — add to grid with `grid-column: span 6` (collapses to full-width at ≤ 1000px per existing media query pattern)
- Add stagger delay matching existing pattern: `animation: fadeUp 360ms 340ms ease both`
- Card header: `<div className="card-header"><h3>Leaderboard</h3><span className="card-meta">Top 50</span></div>`
- Card body: Preview of top 3 entries — mini rows (no Level/RankValue columns, just rank + avatar + name)
- CTA: `<button onClick={() => navigate("/leaderboard")} ...>View Rankings</button>` — uses `--accent` background, `#fff` text, full-width within card footer area
- Accent strip: Apply `swiss-rule` class (existing `border-left: 3px solid var(--accent)`) to card header or card itself — matches `xp-card swiss-rule` treatment

**Mini preview row (top 3 in dashboard card):**
- Height: 36px
- Avatar: 28px circle
- No border overlay or badge in preview (space constraint)
- Rank medal emoji + display name only
- Gap: `4px` between rows

### 5.6 Skeleton Loading Pattern

Matches `AchievementsGallery` loading approach (no formal skeleton component exists — implement inline):
```jsx
// 8 skeleton rows
Array.from({ length: 8 }).map((_, i) => (
  <div key={i} style={{
    height: 48,
    background: 'var(--border)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 6,
    animation: 'subtlePulse 1.4s ease infinite',
    animationDelay: `${i * 80}ms`
  }} />
))
```

---

## 6. Interaction States

| Interaction | Behavior |
|-------------|----------|
| Page load | `page-enter` class applied to `<section>` — `pageEnter` animation (280ms, `--t-slow`) |
| Fetch in flight | 8 skeleton shimmer rows replace list |
| Fetch error | `useToast()` error toast — "Could not load leaderboard. Please try again." |
| Row hover (desktop) | `background: var(--surface-raised)`, `border-color: var(--border)` — matches `.lesson-item:hover` |
| Row tap (mobile) | No detail page — rows are non-interactive (display only). No cursor: pointer. No tap highlight. |
| Back button tap | `navigate("/dashboard")` — immediate, no confirmation |
| Dashboard card tap (full card) | `navigate("/leaderboard")` — card is not clickable as a whole; only the "View Rankings" button navigates |

**Rows are read-only.** No tap-to-profile navigation in this phase. Rows must NOT have `cursor: pointer`.

---

## 7. Copywriting Contract

| Element | Copy | Notes |
|---------|------|-------|
| Page title | `Leaderboard` | Topbar h1 |
| Back button | `← Dashboard` | Matches "← Back" pattern in AchievementDetail/ItemDetail |
| Dashboard card heading | `Leaderboard` | `.card-header h3` uppercase via CSS |
| Dashboard card meta | `Top 50` | `.card-meta` class |
| Dashboard card CTA | `View Rankings` | Button label — verb + noun |
| Empty state heading | `No rankings yet` | `.empty-state h3` |
| Empty state body | `Be the first to complete lessons and earn a spot.` | Max 28ch, centered |
| Error toast | `Could not load leaderboard. Please try again.` | `useToast()` error |
| Separator label | `You` | Centered in dashed divider above pinned row |
| Rank column label | (none — rank number is self-labelling) | No header row needed |
| Level column label | `Lv` | Stacked below level number in row |
| RankValue column label | `pts` | Stacked below rank value in row |
| Skeleton aria label | `aria-label="Loading leaderboard"` | On skeleton container |
| Leaderboard list aria | `aria-label="Leaderboard — Top 50 players"` | On `<ol>` element |
| Current user row | `aria-label="Your ranking"` | On highlighted row |

**No destructive actions in this phase.** No confirmation dialogs required.

---

## 8. Accessibility Contract

- Leaderboard list: `<ol>` with `aria-label="Leaderboard — Top 50 players"` — ordered list conveys rank order semantically
- Each row: `<li>` — no button wrapper (rows are non-interactive)
- Avatar `<img>`: `alt="{displayName} avatar"` or `alt=""` for initials fallback circle (decorative)
- Rank medal emojis: wrap in `<span aria-hidden="true">` — rank number already in text
- `FallbackGlyph` provides `aria-label` for border/badge emojis — reuse as-is
- Skeleton: `role="status"` + `aria-label="Loading leaderboard"` on container
- Back button: inherits semantic button role; no additional aria needed
- Minimum touch target: 44px height on all interactive elements (back button, dashboard CTA)
- NavBar unchanged — leaderboard page does not require NavBar modifications

---

## 9. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| > 1000px | Leaderboard page max-width 900px centered; dashboard card `span 6` of 12 columns |
| ≤ 1000px | Dashboard leaderboard card goes full-width (`grid-column: 1 / -1`) — handled by existing media query in `index.css` |
| ≤ 600px | Row columns collapse: hide Level column; RankValue column remains; Name truncates with `text-overflow: ellipsis` |
| All sizes | Rows maintain 48px min-height; avatar stays 40px; rank # stays visible |

At ≤ 600px, the row column order compresses to: `[Rank #] [Avatar] [Name + Badge] [RankValue]` — Level column hidden with `display: none`.

---

## 10. Animation Contract

| Element | Animation | Source |
|---------|-----------|--------|
| Page entry | `pageEnter 280ms var(--t-slow) both` via `.page-enter` class | Existing keyframe |
| Dashboard card | `fadeUp 360ms 340ms ease both` | Matches existing card stagger pattern |
| Skeleton rows | `subtlePulse 1.4s ease infinite` + staggered `animationDelay` | Existing keyframe |
| Row hover lift | `transform: translateY(-1px)` (implicit via button hover? — rows are NOT buttons) | None — rows are static |
| Current-user accent border | No animation — static accent ring | Design decision |

**No new keyframes required.** All animations reuse existing `index.css` keyframes.

---

## 11. File Targets

| File | Change |
|------|--------|
| `packages/app/src/features/leaderboard/LeaderboardPage.tsx` | New file — leaderboard page component |
| `packages/app/src/features/dashboard/DashboardPage.tsx` | Add leaderboard card to bento grid |
| `packages/app/src/index.css` | Add `.leaderboard-card` grid-column + animation stagger (2 lines) |

No new CSS classes beyond `.leaderboard-card` are required. All other styles derive from existing primitives (`.bento-cell`, `.topbar`, `.page-enter`, `.swiss`, `.card-header`, `.card-meta`, `.empty-state`, `.sr-only`, `.fallback-alt`).

---

## 12. Pre-Population Sources

| Decision | Source |
|----------|--------|
| Top 50 list, single scroll | CONTEXT.md D-01 |
| Current user pinned + separator | CONTEXT.md D-02 |
| Skeleton shimmer loading | CONTEXT.md D-03 |
| Row columns (Rank, Avatar+Border, Name+Badge, Level, RankValue) | CONTEXT.md D-07 |
| Entry via dashboard card, not nav tab | CONTEXT.md D-08 |
| Back button pattern | CONTEXT.md D-09 |
| Avatar 40px, fallback initials | CONTEXT.md D-05, D-06 |
| Color tokens | Detected from `index.css` |
| Spacing scale | Detected from codebase patterns (bento-cell, lesson-item) |
| Typography scale | Detected from `index.css` and component files |
| Animation keyframes | Detected from `index.css` |
| Bento grid layout | Detected from `DashboardPage.tsx` |
| `FallbackGlyph` reuse | CONTEXT.md + `FallbackGlyph.tsx` inspection |
| Touch target ≥ 44px | ROADMAP.md requirement |
| NavBar unchanged | CONTEXT.md D-08 |
| `useToast()` for errors | CONTEXT.md code_context |

---

## 13. Open Questions (None)

All design contract questions were answerable from upstream artifacts and codebase inspection. No user input was required.
