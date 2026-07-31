# Coding Conventions

_Last reconciled: 2026-07-26_

## TypeScript and Modules

- Strict TypeScript, native ESM, `verbatimModuleSyntax`, and `noUncheckedIndexedAccess`.
- Use `import type` for type-only symbols.
- React components use named PascalCase exports; utilities and repositories use camelCase filenames.
- Tests are co-located as `*.test.ts` or `*.test.tsx`.

## Repository Pattern

- Shared interfaces live in `packages/app/src/data/types.ts`.
- User-state domains generally provide mock/demo and Supabase implementations under `data/<domain>/`.
- Components obtain services from `useAppContext()` rather than importing concrete implementations.
- Inject a Supabase client into repositories when focused mapping/error tests need determinism.

## React and UI

- `App.tsx` is the composition root.
- Use local state/effects unless a roadmap decision explicitly introduces broader state management.
- Tailwind v4 utilities and existing design tokens are preferred over new component-local systems.
- Recoverable async failures must have honest loading/empty/error states; never turn an operational failure into synthetic product data.
- Preserve keyboard semantics, focus movement, and narrow mobile layouts.

## Routing and Assets

- Add routes through the centralized definitions/helpers in `lib/router.ts`.
- Test both `/` and `/1000-words/` bases.
- Build asset URLs from `import.meta.env.BASE_URL`.
- Register languages through the existing content schema until the planned typed language registry replaces duplicated maps.

## Testing

- Use Vitest for package/unit/component tests and React Testing Library for UI behavior.
- Use the small helpers in `packages/app/src/test/` for deterministic context injection.
- Use Playwright for browser E2E.
- Conditional Supabase suites must skip clearly when the local stack variables are unavailable; report the skip rather than claiming integration success.
- `pnpm review` is the full repository gate.

## Documentation

Active status belongs only in `.planning/in-work/LANE_B_STABILIZATION_AND_ROADMAP.md`. Other docs summarize actual code and link to that tracker. Do not create or reference a parallel planning hierarchy.
