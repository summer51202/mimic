# mimic Web PWA

Next.js PWA foundation for the user-facing **mimic** product and the Mimiku
shared-adventure brand system.

## Local Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run verify:runtime -- --health-only
```

The Playwright server command uses webpack because the Serwist service-worker
plugin config is webpack-based and Next.js 16 defaults `next dev` to Turbopack.

## Local Runtime

Acceptance must use the backend source from this worktree. The existing
`pairfund-backend` container bind mount points to `D:\Project\mimic\backend`,
not `D:\Project\mimic\.worktrees\mimic-pwa-foundation\backend`. Do not use
that drifting prebuilt container as the acceptance backend.

Use four PowerShell terminals. From the worktree, start only PostgreSQL in
WSL:

```powershell
Set-Location D:\Project\mimic\.worktrees\mimic-pwa-foundation
wsl --exec docker start pairfund-postgres
wsl --exec docker ps --filter name=pairfund-postgres
```

Build and start the backend from this same worktree on port 3001:

```powershell
Set-Location D:\Project\mimic\.worktrees\mimic-pwa-foundation\backend
npm run build
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/pairfund?schema=public'
$env:PORT = '3001'
$env:MIMIC_BACKEND_REVISION = (git -C .. rev-parse HEAD).Trim()
npm run start:dev
```

In a separate terminal, configure and start the web PWA on port 3010:

```powershell
Set-Location D:\Project\mimic\.worktrees\mimic-pwa-foundation\web
'MIMIC_API_BASE_URL=http://localhost:3001/api/v1' | Out-File .env.local -Encoding utf8
npm run dev -- --webpack --hostname localhost --port 3010
```

In a fourth PowerShell terminal, pin the declared backend revision to the
revision expected by acceptance and run the deterministic workflow:

```powershell
Set-Location D:\Project\mimic\.worktrees\mimic-pwa-foundation\web
$env:MIMIC_BACKEND_REVISION = (git -C .. rev-parse HEAD).Trim()
$env:MIMIC_EXPECTED_BACKEND_REVISION = (git -C .. rev-parse HEAD).Trim()
npm run verify:runtime
```

`MIMIC_BACKEND_REVISION` is the revision declared when the backend process was
started. When it is set, acceptance requires an expected revision from
`--expected-revision <sha>` or `MIMIC_EXPECTED_BACKEND_REVISION` and fails if
they differ. The verifier prints only the configured Web and API roots, never
authentication tokens, cookies, or secrets. To check backend availability
without authentication or Playwright, run:

```powershell
npm run verify:runtime -- --health-only
```

The backend seed account is:

- email: `demo@pairfund.local`
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
- Flutter verification was blocked by the local Flutter runtime timing out
  before runner output; the focused mobile brand-copy test command timed out
  after 120 seconds.
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
