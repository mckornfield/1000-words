# Release Checklist

Use this checklist for every release candidate. A checked item must link to durable evidence (GitHub Actions run, test report, store build, or signed manual test record); a command merely existing is not evidence that it passed.

## Release identity

- [ ] Candidate commit SHA recorded: `________________`
- [ ] `pages-demo-dist` upload-artifact digest recorded: `________________`
- [ ] Release version/tag recorded: `________________`
- [ ] GitHub Pages environment URL recorded: `________________`
- [ ] All evidence below was produced from that exact SHA.

## Web quality and demo-enabled Pages release candidate

- [ ] **Quality job passed:** frozen pnpm install, lint, typecheck, unit/component tests, content validation, and artifact-validator tests.
  - Evidence: `________________`
- [ ] **Demo-enabled Pages release-candidate build passed with `BASE_URL=/1000-words/`.** The `demo-pages-build` job built once and `pnpm validate:dist` verified `index.html`, `404.html`, the manifest and icons, every shipped registry deck, and each deck-declared audio file. This artifact verifies deployment mechanics and demo-authenticated routes; it does not prove production Supabase authentication.
  - Evidence: `________________`
- [ ] **Downloaded-artifact E2E passed:** desktop, 320×568, and 667×320 projects ran against the static `packages/app/dist` artifact (not the Vite development server).
  - Evidence: `________________`
- [ ] Direct and reloaded `/1000-words/dashboard`, `/1000-words/study/en-es`, and `/1000-words/profile/settings` routes passed.
  - Evidence: `________________`
- [ ] Serious/critical axe checks passed for login, dashboard/pre-session, active and revealed study, completion, settings, and shop.
  - Evidence: `________________`
- [ ] 320px and short-height runs showed no horizontal document overflow on tested primary routes.
  - Evidence: `________________`

## Supabase

- [ ] `supabase start` and `supabase db reset` succeeded from the candidate migrations.
  - Evidence: `________________`
- [ ] Dedicated RLS/RPC/idempotency suites passed with **zero skipped tests**. The release workflow rejects pending/skipped integration tests.
  - Evidence (passed/total count): `________________`
- [ ] `pnpm --filter @1000words/app supabase:smoke` passed against the same reset local stack.
  - Evidence: `________________`
- [ ] Hosted Supabase project migrations and required browser-safe URL/anon-key configuration were independently verified for the target environment.
  - Evidence: `________________`
- [ ] **Blocking legacy-economy gate:** existing hosted profiles, balances, achievements, inventory, equipped items, purchase requests, study sessions, and learning totals were audited against the trusted catalogs/domain-command model. A reviewed reconciliation or rebuild plan preserves required user data, includes backup/rollback evidence, and is approved before release. Do not truncate, reset, or rewrite legacy rows merely because their provenance is uncertain.
  - Audit/plan/approval evidence: `________________`
- [ ] No service-role key or other server secret appears in the Pages artifact or Actions logs.
  - Evidence: `________________`

## Deploy and hosted verification

- [ ] `deploy` depended on quality, `demo-pages-build`, downloaded-artifact E2E, and Supabase integration, then deployed the previously tested demo-enabled Pages release-candidate artifact (`pages-demo-dist`) without rebuilding.
  - Evidence: `________________`
- [ ] Post-deploy `hosted-smoke` passed using the Pages environment URL through `PLAYWRIGHT_BASE_URL`.
  - Evidence: `________________`
- [ ] The hosted-smoke run, candidate SHA, and `pages-demo-dist` digest are linked as one workflow-run evidence chain.
  - Evidence: `________________`
- [ ] Root transport returned HTTP 200; deep-link transport status and browser recovery were recorded separately (GitHub Pages may serve `404.html` with HTTP 404 before SPA recovery).
  - Evidence: `________________`
- [ ] Browser console/network review found no unexpected production errors or missing assets.
  - Evidence: `________________`

## iOS — not releasable until all items have real device/build evidence

- [ ] A reproducible iOS project exists (tracked native tree or deterministic create/sync/post-sync script).
- [ ] Required speech/microphone permissions are present in the generated `Info.plist`, not only documented in comments.
- [ ] Release signing, bundle identifier, version/build number, archive, and export were verified.
- [ ] Physical-device smoke covered sign-in, study, speech denied/allowed, rotation/short height, safe areas, keyboard, suspend/resume, and upgrade state.
- [ ] Signed IPA/TestFlight evidence: `________________`

## Android — not releasable until all items have real device/build evidence

- [ ] A reproducible Android project exists (tracked native tree or deterministic create/sync/post-sync script).
- [ ] Required speech/microphone permissions are present in the generated manifest, not only documented in comments.
- [ ] Release signing, application ID, version code/name, AAB build, and Play integrity checks were verified.
- [ ] Physical-device smoke covered sign-in, study, speech denied/allowed, rotation/short height, system back, safe areas, keyboard, suspend/resume, and upgrade state.
- [ ] Signed AAB/internal-track evidence: `________________`

## Known limitations that must not be overstated

- The repository currently has no tracked `ios/` or `android/` projects; they are ignored, and native permission instructions in `capacitor.config.ts` are comments. Do **not** claim reproducible iOS or Android releases until a deterministic native-project/post-sync path and signed platform evidence exist.
- The web app has no service worker. Do **not** claim offline web launch or offline mutation support. Bundled Capacitor assets may permit separate native offline-content behavior only after native testing proves it.
- `manifest.webmanifest` is currently icon-only, and its `.webp` icon sources are declared as `image/png`. Treat installability/manifest metadata and MIME correctness as unresolved until corrected and revalidated.
- The release workflow currently builds the tested Pages artifact with demo login enabled so deterministic demo E2E can exercise authenticated routes. Do not describe that artifact as a production-authenticated Supabase release; changing auth mode requires a separately testable credential/fixture strategy while retaining build-once/deploy-tested-artifact integrity.
- The workflow run and artifact digest establish candidate provenance, but hosted smoke does not currently read a SHA/digest marker from deployed runtime content. Treat direct hosted SHA attestation as a future hardening item unless immutable build metadata can be added and tested without weakening the build-once artifact chain.

## Approval

- [ ] Web release approved by: `________________` / date: `________________`
- [ ] Supabase release approved by: `________________` / date: `________________`
- [ ] iOS approval (if applicable): `________________` / date: `________________`
- [ ] Android approval (if applicable): `________________` / date: `________________`
