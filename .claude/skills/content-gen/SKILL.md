---
name: content-gen
description: Run the full content pipeline — generate → validate → sync. Accepts an optional language pair (e.g. /content-gen en-zh). Stops and reports on the first failure.
---

Run the 1000-words content pipeline in this exact order. Stop immediately if any step fails and report the error.

## Steps

1. **Generate** — `pnpm --filter @1000words/content generate`
   - If args were provided (e.g. a language pair like `en-zh`), pass them as an env var or argument if the script supports it; otherwise run for all languages
   - Report how many cards were generated

2. **Validate** — `pnpm --filter @1000words/content validate`
   - Report validation errors with card IDs and field names if any fail
   - Do NOT proceed to sync if validation fails

3. **Sync** — `pnpm --filter @1000words/content sync`
   - Copies generated assets into the app package
   - Report which files were written

## Final report

```
Content Pipeline — <language or "all">
  Generate:  ✅ <N cards generated>  |  ❌ <error>
  Validate:  ✅ all valid            |  ❌ <N errors> — <card IDs>
  Sync:      ✅ synced to app        |  ❌ <error>  |  ⏭ skipped (prior step failed)
```
