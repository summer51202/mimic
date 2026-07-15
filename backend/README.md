# PairFund Backend

Phase A backend for PairFund mobile remote-mode integration.

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

Current blocker for full remote trial:

```text
localhost:5432 is not accepting PostgreSQL connections.
```

The backend code compiles and tests pass, but `prisma migrate dev` and `prisma:seed`
need a running PostgreSQL database that matches `DATABASE_URL` in `.env`.

## Setup

```powershell
cd D:\Project\mimic\backend
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
database: pairfund
user: postgres
password: postgres
```

Then run:

```powershell
cd D:\Project\mimic\backend
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Option B, use Docker Desktop:

```powershell
docker run --name pairfund-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pairfund -p 5432:5432 -d postgres:16
```

Then run the same Prisma commands above.

If Docker is not installed and local PostgreSQL is not running, backend unit/build/e2e
verification can still pass, but mobile remote mode cannot persist data yet.

Demo credentials:

```text
email: demo@pairfund.local
password: password
```

Mobile remote command:

```powershell
cd D:\Project\mimic\mobile
flutter run -d chrome --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3000/api/v1
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
* `GET /api/v1/groups/{groupId}/members`
* `GET /api/v1/groups/{groupId}/funds`
* `POST /api/v1/groups/{groupId}/funds`
* `GET /api/v1/funds/{fundId}`
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
