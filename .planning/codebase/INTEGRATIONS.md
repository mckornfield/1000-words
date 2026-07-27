# External Integrations

_Last reconciled: 2026-07-26_

## Supabase

Production-mode code includes email/password auth, repository adapters, schema/RLS migrations, and reward RPCs. Demo mode defaults on when `VITE_DEMO_LOGIN` is unset and should not call Supabase.

Required browser variables:

- `VITE_DEMO_LOGIN=false`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is public; RLS/RPC authorization is the boundary. Service-role keys belong only in local integration-test tooling. The recorded foundation run skipped 4 local-Supabase tests because the stack/CLI was unavailable, so live integration is not verified by that run.

## Content Generation

`@1000words/content` contains generation, validation, and sync tooling. OpenAI is a developer/build-time dependency, not a browser runtime integration. Four JSON decks currently ship: `en-es`, `en-zh`, `en-ko`, and `en-ja`.

## Audio and Speech

MP3 paths are bundled card assets. `speechRecognition.ts` selects:

- Web Speech API when a supported browser exposes it.
- `@capacitor-community/speech-recognition` on native Capacitor platforms.

Locale mappings exist for Spanish, Mandarin, Korean, and Japanese. Support still depends on platform capability and permissions.

## Capacitor

`packages/app/capacitor.config.ts` targets iOS/Android packaging. Native platform directories are not checked in; developers must generate/sync them before Xcode/Android Studio testing.

## CI and Deployment

- `.github/workflows/ci.yml` provides repository CI.
- `.github/workflows/deploy.yml` builds production mode and deploys to GitHub Pages with `BASE_URL=/1000-words/`.
- `packages/app/public/404.html` supports SPA deep-link restoration.
- Playwright auth, study, and persistence suites exist under `e2e/`.

The existence of workflows/tests is not proof that hosted, native, or live-Supabase acceptance passed for the current uncommitted foundation.
