# Active Listener TODO

Last verified: 2026-04-14

## Goal alignment

- Reliable: no stale-track races, no duplicate auth clicks, no stuck loading states, deterministic refresh behavior.
- Clean: explicit boundaries, small server modules, typed DTOs, minimal legacy overlap.
- Compact: one hydration path, one client runtime, no redundant cache/provider layers.
- Responsive: preserve the current UI shape while keeping auth, playback, and summary flows fast.
- Full functionality: Spotify playback and demo search, article aggregation, streamed summary generation, deployable managed-service setup.

## Current repo status

- [x] `next` upgraded to `15.5.15`.
- [x] Vulnerable `node-vibrant` chain removed and replaced with a compact `sharp`-based palette path.
- [x] `npm audit --omit=dev` is clean.
- [x] Security headers are set in `/Users/alexyang/Developer/active-listener/next.config.mjs`.
- [x] Refresh and summary-stream POST routes enforce same-origin requests.
- [x] Auth callback shell, login pending state, streamed summary rendering, and queue-action JSON parsing regressions are fixed.
- [x] Server track hydration is unified behind `metadata -> articles -> summary`.
- [x] Durable persistence uses Neon Postgres with a local file fallback.
- [x] Runtime cache and refresh locks use Upstash Redis with a safe local fallback.
- [x] Legacy dead code removed from the old provider/self-fetch chain.
- [x] CI covers install, prod dependency audit, lint, typecheck, test, build, and Playwright e2e.
- [x] Dependency Review, CodeQL, and Dependabot are configured.
- [x] Optional manual-intervention Playwright flow exists at `/Users/alexyang/Developer/active-listener/e2e/manual-intervention.spec.ts`.

## Latest validation snapshot

- [x] `npm run lint`
- [x] `npm run typecheck -- --pretty false`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run e2e`
- [x] Live authenticated Spotify regression is verified end to end with keychain-backed session reuse and CLI auth capture via `npm run e2e:spotify:auth` and `npm run e2e:spotify`.
- [x] `npm audit --omit=dev`

## Repo-side v1 blockers

- [x] None currently open.

## Release hardening completed

- [x] Canonical real-session Spotify regression uses the reliable headed Playwright flow.
- [x] Keychain auth-state restore handles missing entries and legacy hex-encoded payloads.
- [x] Summary stream teardown is safe on client disconnect and covered by regression tests.
- [x] Generated local artifacts are ignored and can be cleaned without touching source state.

## External or manual prerequisites for a fresh setup

- [ ] Create or reuse a Spotify developer app.
- [ ] Add `http://127.0.0.1:3000/` and `https://activelistener.alexya.ng/` as Spotify redirect URIs.
- [ ] If the Spotify app remains in development mode, add each tester account to the Spotify allowlist.
- [ ] Use a Spotify Premium account for authenticated playback-control testing.
- [ ] Provide `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET`.
- [ ] Provide `NEXT_PUBLIC_APP_URL` and `APP_ORIGIN`.
- [ ] Provide `OPENAI_API_KEY`.
- [ ] Provide `GOOGLE_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`.
- [ ] Create a Neon database and provide `DATABASE_URL`.
- [ ] Create an Upstash Redis database and provide `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- [ ] If skipping Postgres locally, provide `ACTIVE_LISTENER_DATA_PATH` or use the default `.cache/active-listener-store.json`.
- [ ] Run `npm run db:migrate` before full authenticated/manual testing when `DATABASE_URL` is set.

## CI/CD operating decision

- [x] Keep privileged managed-service credentials out of default pull request CI.
- [x] Use `/Users/alexyang/Developer/active-listener/.github/workflows/staging-smoke.yml` as the manual deployment smoke gate.
- [x] Store only the deployment smoke inputs you actually need in GitHub repository or environment variables, for example `SMOKE_BASE_URL`, `SMOKE_TRACK_ID`, and `SMOKE_TIMEOUT_MS`.

## Deferred strategic follow-up

- [ ] Replace Google Programmable Search before January 1, 2027, or earlier if API behavior degrades.
- [ ] Migrate `npm run lint` from `next lint` to the ESLint CLI before a Next.js 16 upgrade.
