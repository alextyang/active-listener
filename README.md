# Active Listener

Active Listener is a Next.js 15 app that turns a Spotify track into a live context surface: playback state, article discovery, and an AI-generated summary all flow through one server-side hydration pipeline and one client runtime.

## Stack

- Next.js App Router
- Spotify Web API and Spotify auth
- Google Programmable Search Engine / Custom Search JSON API
- OpenAI summary generation
- Neon Postgres for durable track state
- Upstash Redis for cache and refresh locks
- Local JSON fallback when `DATABASE_URL` is not set

## What changed in the hardened v1 shape

- One track API contract now drives the UI.
- Server hydration runs `metadata -> articles -> summary`.
- Old internal self-fetch and Vercel KV paths are removed.
- Summary generation streams into the UI over NDJSON.
- Refresh routes are rate-limited and same-origin guarded.
- CI covers lint, typecheck, unit/integration tests, build, and Playwright e2e.

## Required environment variables

Required for full functionality:

- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `APP_ORIGIN`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`

Required for production-grade persistence and cache:

- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional local fallback:

- `ACTIVE_LISTENER_DATA_PATH`

Start from `/Users/alexyang/Developer/active-listener/.env.example`.

## Spotify setup

The Spotify app must allow these redirect URIs:

- `http://127.0.0.1:3000/`
- `https://activelistener.alexya.ng/`

If the Spotify app remains in development mode:

- add each tester account in the Spotify dashboard
- use a Spotify Premium account for authenticated playback controls

## Local development

Use Node `22.13+` for the cleanest install experience with the current ESLint toolchain.

1. Install dependencies: `npm install`
2. Copy env file: `cp .env.example .env.local`
3. Fill the required environment variables
4. Run migrations when `DATABASE_URL` is set: `npm run db:migrate`
5. Start the app with the Spotify-safe loopback host: `npm run dev -- --hostname 127.0.0.1`

## Validation commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run e2e`
- `npm run e2e:manual`
- `BASE_URL=https://example.com TRACK_ID=3n3Ppam7vgaVa1iaRUc9Lp npm run smoke:remote`

Postgres and Redis integration tests run automatically when the managed-service variables are present.

## Architecture map

- `/Users/alexyang/Developer/active-listener/app/api/tracks/[trackId]/route.ts`
  - read the current persisted track DTO
- `/Users/alexyang/Developer/active-listener/app/api/tracks/[trackId]/refresh/route.ts`
  - refresh one stage behind a lock
- `/Users/alexyang/Developer/active-listener/app/api/tracks/[trackId]/summary/stream/route.ts`
  - stream summary deltas to the client
- `/Users/alexyang/Developer/active-listener/app/(domain)/server`
  - providers, repositories, cache, observability, and orchestration
- `/Users/alexyang/Developer/active-listener/app/(components)/app/trackRuntimeProvider.tsx`
  - the single client runtime that hydrates the existing UI

## CI/CD

GitHub Actions now includes:

- `ci.yml`
- `staging-smoke.yml`
- `dependency-review.yml`
- `codeql.yml`
- Dependabot updates via `.github/dependabot.yml`

Recommendation: keep live third-party credentials out of pull request CI. Use the manual staging smoke workflow with repository or environment variables for deployment-only checks.

## Operational notes

- Vercel project id: `prj_kMn9Zm2K8zpDL7Y21sfr71UeXhOS`
- Google Programmable Search is acceptable for v1, but it should be replaced before the January 1, 2027 transition window closes.
- `npm run lint` still uses `next lint`; migrate that script to the ESLint CLI before upgrading to Next.js 16.

## Live authenticated Spotify regression

Mocked Playwright coverage remains the default. For real Spotify playback and auth validation, use the optional live suite:

- `npm run e2e:spotify:auth`
  - Starts the app on the authorized local Spotify redirect origin.
  - Opens a real browser flow.
  - Saves the resulting Playwright storage state to `/.playwright/auth/spotify-live.json`.
  - On macOS, also stores the same captured app session in Keychain via `security` unless `LIVE_SPOTIFY_AUTH_STORAGE=file`.
- `npm run e2e:spotify`
  - Canonical live Spotify regression command.
  - Restores the saved auth state from Keychain or file.
  - Opens the browser headed on macOS and runs the proven live regression path for login reuse, now-playing refresh, summary hydration, library sync, seek, pause/resume, next, and previous controls.
- `npm run e2e:spotify:interactive`
  - Alias for the canonical headed live regression flow.
- `npm run e2e:spotify:clear`
  - Removes the cached live auth state file and the optional macOS Keychain entry.

Notes:

- The live suite does not scrape browser credentials from Keychain. The app stores Spotify PKCE session state in browser localStorage, so the test harness captures and reuses the app session itself.
- Live auth runs against `NEXT_PUBLIC_APP_URL` from `.env.local` by default so the redirect origin stays authorized.
- For reliable control coverage, start playback from a multi-track album or playlist on a Spotify Premium account.
- If auth capture or reuse fails on macOS, rerun `npm run e2e:spotify:auth`; the harness will fall back from Keychain to the local Playwright auth-state file when no saved Keychain item exists.
- Keep the local origin aligned across `NEXT_PUBLIC_APP_URL`, `APP_ORIGIN`, and the Spotify app redirect configuration. The supported local loopback origin is `http://127.0.0.1:3000/`, not `http://localhost:3000/`.
