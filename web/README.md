# mimic Web PWA

Next.js PWA foundation for the user-facing **mimic** product and the Mimiku
shared-adventure brand system.

## Monitoring privacy

Browser reporting is optional through `NEXT_PUBLIC_MIMIC_SENTRY_DSN`; server and
edge reporting use the private `MIMIC_SENTRY_DSN`. Browser deployment metadata
uses `NEXT_PUBLIC_MIMIC_ENVIRONMENT`; server and edge use `MIMIC_ENVIRONMENT`
and `MIMIC_WEB_REVISION`. Events are error-only and reconstructed from an
allowlist: request/cookie/query data, user PII, messages, financial data,
breadcrumbs, contexts, exception values, and attachments are excluded. Traces,
replay, local-variable capture, and logs are disabled.

Source-map upload accepts the non-secret build arguments `SENTRY_ORG` and
`SENTRY_PROJECT`. If upload credentials are needed, provide
`SENTRY_AUTH_TOKEN` only as an optional BuildKit secret mount, for example
`docker build --secret id=SENTRY_AUTH_TOKEN,src=./sentry-auth-token ...`; never
pass it as a Docker `ARG`, `ENV`, or `NEXT_PUBLIC_*` value.

## Railway deployment

Railway builds this package from `/web` with `web/Dockerfile` and checks
`/api/health/ready`. The Web server reaches `mimic-api` over Railway's private
network; only the generated Web and API domains are public. The current Railway
IaC SDK cannot bind a variable to the Dockerfile's BuildKit secret mount, so
Railway source-map upload remains disabled rather than exposing
`SENTRY_AUTH_TOKEN` as a runtime/build argument. See the Staging-first gates in
[`docs/operations/railway-deployment.md`](../docs/operations/railway-deployment.md).

## Local Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:runtime-verifier
npm run build
npm run test:e2e
npm run verify:runtime -- --health-only
```

The Playwright server command uses webpack because the Serwist service-worker
plugin config is webpack-based and Next.js 16 defaults `next dev` to Turbopack.

## Local Runtime

Acceptance must use the backend source from the same active repository checkout
as the Web PWA. Do not use a drifting prebuilt container as the acceptance
backend.

Use three PowerShell terminals. From the repository root, start only PostgreSQL
in WSL:

```powershell
wsl --exec docker start mimic-postgres
wsl --exec docker ps --filter name=mimic-postgres
```

Build and start the backend from this same checkout on port 3001:

```powershell
Set-Location backend
npm run build
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/mimic?schema=public'
$env:PORT = '3001'
$env:MIMIC_BACKEND_REVISION = (git -C .. rev-parse HEAD).Trim()
npm run start:dev
```

In a separate terminal, configure the web PWA and run acceptance. The verifier
starts this worktree's web server on port 3010 with existing-server reuse
disabled, so port 3010 must be free:

```powershell
Set-Location web
'MIMIC_API_BASE_URL=http://localhost:3001/api/v1' | Out-File .env.local -Encoding utf8
npm run verify:runtime
```

The backend health payload includes `data.revision` only when the backend was
started with a valid hexadecimal `MIMIC_BACKEND_REVISION`. Acceptance derives
its expected revision from this worktree's current `git rev-parse HEAD` and
rejects a backend that omits or reports a different revision. Pin a different
expected revision explicitly only when intentional:

```powershell
Set-Location web
$expectedRevision = (git -C .. rev-parse HEAD).Trim()
npm run verify:runtime -- --expected-revision $expectedRevision
```

`MIMIC_EXPECTED_BACKEND_REVISION` is the environment equivalent of
`--expected-revision`. Runtime URLs must be exact HTTP(S) roots without
credentials, query strings, or fragments. The verifier prints only validated
Web/API paths and never authentication tokens, cookies, URL credentials, query
values, or backend response bodies. To check backend identity and availability
without authentication or Playwright, run:

```powershell
npm run verify:runtime -- --health-only
```

For manual web development outside acceptance, start port 3010 separately:

```powershell
npm run dev -- --webpack --hostname localhost --port 3010
```

The backend seed account is:

- email: `demo@mimic.local`
- password: `password`

For the two-account invitation flow, either use unique throwaway emails through
the UI or follow the Playwright fixture pattern in `e2e/fixtures/accounts.ts`.
The E2E setup creates isolated browser contexts so owner and partner cookies,
CSRF tokens, invites, group IDs, and fund IDs never cross accounts.

## PWA Build And Privacy Checks

Production PWA verification uses:

```powershell
npm run build
npm run test:e2e
```

The generated service worker keeps private routes network-only. Cache Storage
must not contain `/app/`, `/api/app/`, group IDs, fund IDs, or invite codes after
authenticated navigation. Current coverage includes source policy tests in
`src/app/pwa-cache-policy.test.ts` and browser Cache Storage assertions in
`e2e/public-and-auth.spec.ts` and `e2e/groups-funds-flow.spec.ts`.

## Pixel Assets

The authenticated shell uses generated raster pixel assets under `public/pixel-ui`
and brand assets under `public/brand`. Keep them lossless and display them with
nearest-neighbor rendering (`image-rendering: pixelated` or equivalent). The
responsive E2E suite checks that primary pixel art renders without blur-inducing
CSS defaults and that the public shell avoids horizontal overflow at phone,
tablet, and desktop sizes.

## Verification Results

Task 11 verification run on 2026-07-28:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed: 15 test files, 83 tests.
- `npm run build` passed.
- `npm run test:e2e` passed: 6 Playwright tests.
- Production visual/PWA verification passed at 320x720, 390x844, and
  1440x900.
- Lighthouse was not run because it is unavailable locally and network access is
  restricted.

## Acceptance Coverage

`e2e/public-and-auth.spec.ts` verifies:

- `/` exposes the `mimic` heading, the exact tagline
  `一起存，一起花，一起在異世界探險吧!`, and a registration CTA.
- 320x720, 390x844, and 1440x900 viewports have no horizontal overflow.
- The next home section is partially visible in the first viewport.
- `/app` redirects anonymous users to `/login?returnTo=%2Fapp`.
- Cache Storage does not retain `/api` or `/app` responses after private probes.

Production visual/PWA verification on 2026-07-28 captured:

- `web/.session/visual-pwa/home-320x720.png`
- `web/.session/visual-pwa/home-390x844.png`
- `web/.session/visual-pwa/home-1440x900.png`
- `web/.session/visual-pwa/visual-pwa-report.json`

Findings: Mimiku artwork rendered with `image-rendering: pixelated` and loaded
successfully; no text overlap or clipped controls were visible in the captured
viewports; keyboard focus was visible; reduced-motion mode kept the public page
usable; install metadata reported `name` and `short_name` as `mimic`,
`display: standalone`, `start_url: /`, and 192/512 any plus maskable icons;
private cache URL list was empty.

Task 9 verification run on 2026-07-30:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed: 36 test files, 188 tests.
- `npm run build` passed.
- `npm run test:e2e` passed: 52 Playwright tests across phone-small, phone,
  tablet, and desktop projects.
- The E2E suite covers owner/partner invitation setup, group roster visibility,
  fund summary rendering from backend data, responsive pixel shell checks,
  keyboard invite return navigation, and private Cache Storage exclusion.

## Lighthouse

Lighthouse was not run in this environment. The package is not installed locally
(`npm ls lighthouse --depth=0` returned empty), and network access is restricted,
so no score is recorded here.
