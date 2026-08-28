# Mimic Backend

NestJS API for the mimic Web PWA.

## Monitoring privacy

Sentry is optional and error-only: set `MIMIC_SENTRY_DSN` to enable it.
`MIMIC_ENVIRONMENT` and `MIMIC_BACKEND_REVISION` provide bounded deployment
metadata. Events are rebuilt from an allowlist: no request bodies, headers,
cookies, query strings, IP/email, messages, financial text/amounts,
breadcrumbs, contexts, exception values, PII, or attachments are sent. Traces,
replay, local-variable capture, and logs are disabled.

## Current Local Readiness

Verified in this workspace:

```powershell
npm install
npm run test -- --runInBand
npm run build
npm run test:e2e -- --runInBand
npx prisma validate
npx prisma generate
```

The local stack is operational with Docker Engine inside WSL2 (Docker Desktop is
not required): PostgreSQL is exposed on port `5432` and the API on `3001`.

## Setup

```powershell
# From the repository root
Set-Location backend
npm install
Copy-Item .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

## PostgreSQL Options

Option A, install PostgreSQL locally:

```text
host: localhost
port: 5432
database: mimic
user: postgres
password: postgres
```

Then run:

```powershell
# From the repository root
Set-Location backend
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Option B, use Docker Engine inside WSL2:

```powershell
wsl --exec docker start mimic-postgres mimic-backend
wsl --exec docker ps
Invoke-RestMethod http://localhost:3001/api/v1/health
```

After a start or restart, wait until the health endpoint returns
`{"data":{"ok":true}}` before opening the app; Nest may need several seconds to
initialize its routes.

The development backend container bind-mounts the active checkout's `backend`
directory and runs `node dist/src/main.js`. Rebuild before restarting after code
changes:

```powershell
# From the repository root
Set-Location backend
npm run build
wsl --exec docker restart mimic-backend
```

If WSL stops immediately while background containers are needed, keep one hidden
WSL process alive from PowerShell:

```powershell
Start-Process wsl -ArgumentList '--exec','sleep','infinity' -WindowStyle Hidden
```

Demo credentials:

```text
email: demo@mimic.local
password: password
```

## Phase A Endpoints

* `GET /api/v1/health`
* `POST /api/v1/auth/register`
* `POST /api/v1/auth/login`
* `POST /api/v1/auth/refresh`
* `POST /api/v1/auth/logout`
* `GET /api/v1/me`
* `POST /api/v1/me`
* `GET /api/v1/groups`
* `POST /api/v1/groups`
* `GET /api/v1/groups/{groupId}`
* `PATCH /api/v1/groups/{groupId}`
* `GET /api/v1/groups/{groupId}/members`
* `PATCH /api/v1/groups/{groupId}/members/{userId}`
* `DELETE /api/v1/groups/{groupId}/members/{userId}`
* `POST /api/v1/groups/{groupId}/leave`
* `POST /api/v1/groups/{groupId}/invites`
* `POST /api/v1/group-invites/accept`
* `GET /api/v1/groups/{groupId}/funds`
* `POST /api/v1/groups/{groupId}/funds`
* `GET /api/v1/groups/{groupId}/dashboard` — authenticated group dashboard,
  grouped by currency with current-period and all-time totals
* `GET /api/v1/funds/{fundId}`
* `GET /api/v1/funds/{fundId}/summary` — authenticated fund cash balance,
  settlement period, totals, and member positions
* `POST /api/v1/funds/{fundId}/contributions`
* `GET /api/v1/funds/{fundId}/contributions`
* `POST /api/v1/funds/{fundId}/expenses`
* `GET /api/v1/funds/{fundId}/expenses`
* `GET /api/v1/funds/{fundId}/settlement-suggestion`
* `POST /api/v1/funds/{fundId}/settlements`
* `GET /api/v1/funds/{fundId}/settlements`
* `GET /api/v1/settlements/{settlementId}`
* `POST /api/v1/settlements/{settlementId}/complete`
* `POST /api/v1/settlements/{settlementId}/cancel`
