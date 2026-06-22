# Coding Conventions

_Last updated: 2026-06-22_

## Summary

The codebase uses strict TypeScript 5.9 with a factory-function pattern for all repository implementations. React 19 components are PascalCase named exports with co-located interfaces; all cross-cutting state flows through a single `AppContext`. Tailwind v4 is used via the Vite plugin with inline utility classes; custom CSS properties are used for theming.

---

## TypeScript Configuration

**Base config:** `/workspaces/1000-words/tsconfig.base.json`

**Strict settings enabled:**
- `strict: true` — all strict type checks
- `noUncheckedIndexedAccess: true` — array/object access returns `T | undefined`
- `noImplicitOverride: true` — class overrides must be explicit
- `noFallthroughCasesInSwitch: true`
- `verbatimModuleSyntax: true` — type-only imports must use `import type`
- `isolatedModules: true` — each file is independently compilable
- `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`

**Per-package overrides:**

| Package | Key additions |
|---------|--------------|
| `packages/app` | `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, `"jsx": "react-jsx"`, `"types": ["vite/client"]` |
| `packages/engine` | inherits base only |
| `packages/content` | inherits base only |

**Type-only imports — always use `import type` for type-only symbols:**

```typescript
import type { Card } from "@1000words/content";
import type { AppContextValue, AuthSession } from "./data/types";
```

---

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` — e.g., `StudySession.tsx`, `ProfileOverview.tsx`
- Repository implementations: `supabase<Feature>Repository.ts` (production) and `mock<Feature>Repository.ts` (demo) — e.g., `supabaseProfileRepository.ts`, `mockProfileRepository.ts`
- Shared utilities and hooks: `camelCase.ts` — e.g., `appConfig.ts`, `router.ts`
- Type definitions: `types.ts` (single file per layer/package)
- Test files: `<module>.test.ts` — co-located with the file under test
- Mock/fixture data: `<module>.mock.ts` — e.g., `progressStore.mock.ts`

**Components:** PascalCase named exports — `export function StudySession(...)`, `export function NavBar(...)`

**Interfaces:** PascalCase prefixed by domain — `AuthRepository`, `ProfileRepository`, `InventoryRepository`, `AppContextValue`

**Factory functions:** `create<Name>` prefix — `createProgressStore(client)`, `createMockProfileRepository(fixture)`, `createSupabaseAchievementRepository()`

**Variables and function parameters:** camelCase

**Unused variables / parameters:** prefix with `_` to satisfy the ESLint `no-unused-vars` rule — e.g., `_userId`, `_date`

---

## Repository File Pattern

Every persistence layer feature has exactly two files:

```
packages/app/src/data/<feature>/
  supabase<Feature>Repository.ts   ← production implementation using Supabase client
  mock<Feature>Repository.ts       ← in-memory implementation for demo mode
```

Both files export a factory function returning the shared interface from `data/types.ts`. Example:

```typescript
// mockProfileRepository.ts
export function createMockProfileRepository(fixture: Profile): ProfileRepository {
  let current: AppProfile = { ... };
  return {
    async getProfile(_userId) { return { ...current }; },
    async updateProfile(_userId, patch) { ... },
    ...
  };
}
```

All repository interfaces live exclusively in `packages/app/src/data/types.ts` — the single source of truth.

---

## Import Organization

**Order (enforced by convention, not a linter rule):**
1. Node built-ins (when applicable in scripts/content package)
2. Workspace packages (`@1000words/engine`, `@1000words/content`)
3. External packages (`react`, `@supabase/supabase-js`, `zod`)
4. Internal absolute-ish paths (`../../lib/router`, `../shared/Toast`)
5. Relative sibling imports (`./types`, `./AppContext`)

**No barrel index files in `features/`** — components import directly from sibling paths.

**Path aliases:** None configured. All imports use relative paths or workspace package names.

---

## React Patterns

**Component structure:**
- Named exports only — no default exports for components
- Props interfaces defined inline above the component with `interface <Name>Props { ... }`
- Internal sub-components (e.g., `SessionComplete`) defined in the same file above the primary export when they are only used there

**Context pattern:**
- Single `AppContext` provides all repositories to the component tree — `packages/app/src/data/AppContext.ts`
- `useAppContext()` throws if used outside provider (fail-fast guard):

```typescript
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppContext.Provider");
  return ctx;
}
```

**State management:**
- All repository injection happens in `App.tsx` via `useMemo` — split into `isDemo` and production branches
- Singleton repos created once outside the component at module level:

```typescript
const supabaseAuthRepo = createSupabaseAuthRepository();
const supabaseProgressStore = createProgressStore(supabase);
```

**Hooks used:** `useState`, `useEffect`, `useRef`, `useMemo` from React 19 core. No third-party state library.

**Async effects:** `useEffect` with `.then()/.catch()` chaining (not async/await inside effect directly).

---

## Tailwind v4 Usage

Tailwind v4 is loaded via `@tailwindcss/vite` plugin — no `tailwind.config.js` file required.

**Usage pattern:** Utility classes applied directly in JSX `className` props. Custom CSS variables (e.g., `var(--text-secondary)`) used for theming values that need to be dynamic.

**No CSS Modules** — styles are either Tailwind utilities or inline `style` props for one-off overrides.

---

## Error Handling

- Repository methods throw on failure; callers use `.catch()` or `try/catch`
- Supabase errors are checked with the `{ data, error }` destructure pattern:

```typescript
const { data, error } = await client.from("table").select("*");
if (error) throw error;
```

- UI-level errors surface via the `Toast` system (`useToast()` hook from `features/shared/Toast`)

---

## Comments and Documentation

- Section dividers use the `// ─── Title ───` pattern throughout
- JSDoc is not used; inline comments explain non-obvious logic
- Agent notes (for AI context) live in `.agent_notes/` — not source code comments

---

## Linting

**Config:** `/workspaces/1000-words/eslint.config.js`

**Rules:**
- Base: `@eslint/js` recommended + `typescript-eslint` recommended
- Custom: `@typescript-eslint/no-unused-vars` set to `error` with `^_` ignore pattern for args, vars, and caught errors
- Ignored: `dist/`, `node_modules/`, `ios/`, `android/`, `*.config.{js,ts}`

---

## Git Commit Style

Based on recent history:

```
feat: add supabase integration and tests (#19)
feat: add engine (#18)
feat: add chinese cards (#17)
chore: move en-es assets (#15)
```

**Pattern:** `<type>: <lowercase description> (#PR)` — conventional commits with PR reference. Types observed: `feat`, `chore`. Squash-merged PRs use the PR title as the commit message.
