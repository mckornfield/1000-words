# Supabase

Per-user data only (profile, FSRS card progress, review logs). Cards themselves are
bundled in the app, not stored here.

## Local development

Requires Docker and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase start          # boots Postgres + Auth + Studio locally
supabase db reset       # applies migrations/ from scratch into the local db
```

`supabase start` prints the local API URL, publishable (anon) key, and secret
(service_role) key — copy them into the repo-root `.env` (see `.env.example`).
That single file is read by both the Vite app and the test setup.

If `supabase start` complains about `config.toml` on your CLI version, run
`supabase init` to regenerate it; the files under `migrations/` are the source of
truth and should be preserved.

## Schema

- `profiles` — one row per user (auto-created on signup via trigger).
- `card_progress` — FSRS scheduling state, one row per (user, card).
- `review_logs` — append-only review history.

All tables enforce row-level security: a user can only access rows where
`user_id = auth.uid()`. Verifying that isolation is part of task A2.
