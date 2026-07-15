# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PairFund** — a shared finance app for couples and small groups (iOS, Android, Web). Users manage shared virtual funds, track contributions and expenses, and settle balances. Key invariant: **settled periods are locked and cannot be edited retroactively**; corrections must be new transactions.

The working directory is `D:\project\mimic`. The project has no root `README.md`; design specs live in `docs/`.

---

## Backend (NestJS + PostgreSQL)

### Commands (run from `backend/`)

```bash
npm run start:dev          # Dev server with hot reload (port 3000)
npm run build              # Compile TypeScript → dist/
npm run test               # Jest unit tests
npm run test:e2e           # Supertest e2e tests
npm run test -- --testPathPattern=settlements  # Run a single test file

npx prisma generate        # Regenerate Prisma client after schema changes
npx prisma migrate dev     # Apply pending migrations (creates new migration)
npx prisma db seed         # Seed with test data (prisma/seed.ts)
```

### Environment

Copy `.env.example` to `.env` and set:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `PORT` (defaults to 3000)

### Architecture

API prefix: `/api/v1`. All routes are JWT-protected via `JwtAuthGuard` except auth endpoints.

Module layout under `backend/src/modules/`:

| Module | Responsibility |
|---|---|
| `auth` | Register/login, JWT access + refresh tokens |
| `users` | User profile management |
| `groups` | Group + member lifecycle, invite codes |
| `funds` | Fund CRUD within a group |
| `contributions` | Money added to a fund (REGULAR, ONE_TIME, ADJUSTMENT, CORRECTION types) |
| `expenses` | Expenses with flexible split modes (EQUAL, RATIO, FIXED, HYBRID) and multi-payer support |
| `settlements` | Balance calculations, settlement suggestions, lock enforcement |
| `prisma` | Shared `PrismaService` singleton |

Each module follows: `*.module.ts` → `*.controller.ts` (HTTP) → `*.service.ts` (logic) → `dto/` (class-validator DTOs).

Global pipes in `main.ts`: `ValidationPipe({ whitelist: true, transform: true })`.

### Data model key points

- **Money stored in minor units** (`bigint` — cents, not dollars) throughout schema and API
- **Soft deletes**: records have a `status` field (ACTIVE/DELETED), never hard-deleted
- **Audit trail**: `AuditLog` table records all mutations (CREATE, UPDATE, DELETE, COMPLETE, etc.)
- **Settlement locking**: completing a settlement locks its date range; contributions/expenses within a locked range cannot be modified
- **Multi-payer expenses**: `ExpensePayer` + `ExpenseSplit` are separate models — an expense can have multiple payers and flexible allocation per member

Schema source of truth: `backend/prisma/schema.prisma`.

---

## Mobile (Flutter + Riverpod)

### Commands (run from `mobile/`)

```bash
flutter pub get            # Install dependencies
flutter run                # Run on connected device / Chrome
flutter test               # Widget tests
flutter build apk          # Android APK
```

### Architecture

Feature-first layout under `lib/features/`. Each feature contains:
- `data/` — repository (interface + implementations: `DemoXRepository`, `RemoteXRepository`)
- `presentation/` — screens and widgets
- `providers/` — Riverpod notifiers/providers

Shared infrastructure in `lib/shared/`:
- `api/pairfund_api_client.dart` — `DioPairFundApiClient`, wraps all HTTP calls, parses `{ data: ... }` envelope via `readDataEnvelope`
- `api/api_exception_mapper.dart` — maps `DioException` → typed `ApiException` hierarchy
- `providers/session_provider.dart` — `SessionNotifier` manages auth state (token storage via `flutter_secure_storage`)
- `app/router/app_router.dart` — GoRouter with redirect logic based on session state

### Demo vs. remote mode

`lib/shared/config/app_config.dart` controls `ApiMode`. Set to `ApiMode.demo` for UI development without a running backend (repositories return hard-coded data). Set to `ApiMode.remote` to connect to `http://localhost:3000/api/v1`.

### Design tokens

Colors, spacing, and border radii are defined in `lib/shared/constants/design_tokens.dart` (`PfColors`, `PfRadii`). Use these — don't hardcode values.

---

## Accounting Rules (critical domain logic)

These rules are enforced in `settlements.service.ts` and are documented in `docs/design/pairfund-backend-accounting-module-map-v0.2.md`:

1. A member's **position** = total contributions − total expense splits allocated to them
2. **Settlement suggestion**: calculate net positions for all members, then generate minimum transfers to balance them
3. **Lock check**: before any write (contribution, expense, correction), verify no completed settlement covers that date range for that fund
4. Corrections are never edits — they are new `Contribution` records of type `CORRECTION`

---

## Key Documentation

For deep context on business rules, read these in order:
1. `docs/design/pairfund-prd-v0.2-final.md` — product rules, MVP scope, accounting invariants
2. `docs/design/pairfund-backend-accounting-module-map-v0.2.md` — backend module responsibilities
3. `docs/design/pairfund-mobile-flutter-spec-v0.2.md` — screen specs, state model, navigation

---

## Session Startup Protocol

**Before starting any implementation task**, follow these steps in order:

### 1. Load the feature map

Read `.agents/features.md`. If the file does not exist:
- Check if `.agents/skills/feature-map/SKILL.md` exists and invoke it to generate the file.
- If neither exists, note that no feature map is available and proceed — do not block on this.

The feature map gives a snapshot of implemented vs. planned features. Use it to avoid duplicating existing work and to understand what's already in place.

### 2. Write a devlog entry after implementation

After completing any non-trivial implementation (new feature, bug fix, refactor, schema change), append an entry to `.agents/devlog.md`. Create the file if it does not exist.

**Devlog format:**

```markdown
## YYYY-MM-DD — <short title>

**Task:** one-sentence description of what was asked  
**Scope:** list the files / modules touched  
**What changed:** bullet points — what was added, modified, or removed  
**Decisions:** any non-obvious choices made and why  
**Known gaps / follow-ups:** anything deferred or not yet done  
```

Keep entries factual and concise. The devlog is a running history of changes; do not delete or rewrite past entries.
