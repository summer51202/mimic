## 2026-07-15 — Initialize PostgreSQL and Prisma migration

**Task:** Complete Phase 0 database setup for the PairFund remote-mode development environment.  
**Scope:** WSL2 Docker environment, `backend/prisma/migrations/20260715125137_init/migration.sql`, PostgreSQL seed data  
**What changed:**
- Updated WSL and restored systemd/Docker Engine operation without Docker Desktop.
- Created a persistent PostgreSQL 16 container and the `pairfund` database.
- Generated and applied the initial Prisma migration.
- Seeded and verified the demo account.
**Decisions:** Used a temporary Node 20 Linux container with OpenSSL to run Prisma because the Windows schema engine could validate the schema but failed before reaching PostgreSQL.  
**Known gaps / follow-ups:** Backend startup and API-level login/persistence checks remain in Phase 0D; npm reported 24 dependency audit findings for later security triage.

## 2026-07-15 — Run backend in WSL Docker

**Task:** Start the NestJS backend and verify health, authentication, and PostgreSQL persistence.  
**Scope:** `backend/Dockerfile.dev`, `backend/.dockerignore`, WSL Docker runtime, PairFund API and database  
**What changed:**
- Added a minimal Node 20 and OpenSSL development image for Prisma compatibility.
- Started the backend on `localhost:3001` because Grafana already owns port 3000.
- Verified health, demo login, JWT-authenticated profile reads, registration, and the persisted ACTIVE user row.
**Decisions:** Run NestJS and PostgreSQL on the same WSL Docker network because Windows Prisma processes cannot reach the WSL PostgreSQL endpoint in this managed environment. Keep WSL alive with a hidden Windows `wsl.exe ... sleep infinity` process during development.  
**Known gaps / follow-ups:** Convert the ad-hoc Docker commands into a reproducible Compose workflow; review the broad TypeScript build output and add `tsconfig.build.json` later.

## 2026-07-15 — Launch Flutter Web remote mode

**Task:** Run PairFund in Chrome against the real NestJS and PostgreSQL stack.  
**Scope:** backend CORS bootstrap and e2e test, Flutter Web scaffold, mobile runtime config, widget test harness, local run documentation  
**What changed:**
- Added environment-controlled CORS and verified the browser preflight with an e2e test.
- Added the standard Flutter Web platform files and documented the remote-mode command.
- Made compile-time app configuration compatible with Dart 3.11 web builds.
- Fixed a stale widget test harness by adding the required Riverpod `ProviderScope`.
- Built the Web bundle and launched Chrome on `http://localhost:8080` against the API on port 3001.
**Decisions:** Use fixed development origins and ports (`8080` web, `3001` API) because Grafana owns port 3000. Keep CORS disabled unless `CORS_ORIGIN` is explicitly configured.  
**Known gaps / follow-ups:** Dependency upgrades and WebAssembly compatibility are deferred; package versions remain pinned for MVP stabilization.
## 2026-07-15 — Group owner invite creation

**Task:** Implement owner-only group invite creation rules.  
**Scope:** `backend/src/modules/groups/dto/create-group-invite.dto.ts`, `backend/src/modules/groups/groups.service.ts`, `backend/src/modules/groups/groups.service.spec.ts`  
**What changed:**
- Added optional `invited_email` normalization and validation.
- Restricted invite creation to active owners of active groups with stable `GROUP_OWNER_REQUIRED` errors.
- Added secure 72-bit invite codes, seven-day expiry, and focused service/DTO tests.
**Decisions:** Keep inactive-group and non-owner failures indistinguishable through the same stable error code.
**Known gaps / follow-ups:** Invite acceptance, HTTP endpoints, code-collision retry, and mobile UI remain for later tasks.
## 2026-07-15 — Atomic group invite acceptance

**Task:** Implement atomic acceptance of group invites.  
**Scope:** `backend/src/modules/groups/dto/accept-group-invite.dto.ts`, `backend/src/modules/groups/groups.service.ts`, `backend/src/modules/groups/groups.service.spec.ts`  
**What changed:**
- Added invite-code validation and transactional invite acceptance.
- Added stable domain errors, conditional one-use consumption, and membership creation/reactivation.
- Added race handling for invite consumption, membership uniqueness, and inactive membership reactivation.
**Decisions:** Archived groups are rejected as `INVITE_NOT_FOUND`; future group-archive mutation must coordinate row locking or transaction isolation with invite acceptance.
**Known gaps / follow-ups:** HTTP endpoints, PostgreSQL concurrency integration tests, and mobile integration remain for later tasks.
