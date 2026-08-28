# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Mimic** — a shared-finance Web PWA for couples and small groups. Users manage shared virtual funds, track contributions and expenses, and settle balances. Key invariant: **settled periods are locked and cannot be edited retroactively**; corrections must be new transactions.

Run repository commands from the cloned repository root unless a section names a subdirectory. The root `README.md` provides the public project overview; detailed design specs live in `docs/`.

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

## Web PWA (Next.js + React)

Run Web commands from `web/`. The PWA uses Next.js App Router, server-side BFF routes under `src/app/api/`, shared API and authentication infrastructure under `src/shared/`, and feature modules under `src/features/`.

Use `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` as the baseline verification sequence. Production builds require `MIMIC_API_BASE_URL`; local development defaults to `http://localhost:3000/api/v1`.

---

## Accounting Rules (critical domain logic)

These rules are enforced in `settlements.service.ts` and are documented in `docs/design/mimic-backend-accounting-module-map-v0.2.md`:

1. A member's **position** = total contributions − total expense splits allocated to them
2. **Settlement suggestion**: calculate net positions for all members, then generate minimum transfers to balance them
3. **Lock check**: before any write (contribution, expense, correction), verify no completed settlement covers that date range for that fund
4. Corrections are never edits — they are new `Contribution` records of type `CORRECTION`

---

## Key Documentation

For deep context on business rules, read these in order:
1. `docs/design/mimic-prd-v0.2-final.md` — product rules, MVP scope, accounting invariants
2. `docs/design/mimic-backend-accounting-module-map-v0.2.md` — backend module responsibilities
3. `docs/design/mimic-web-ui-v0.2.md` — Web PWA screens, states, and interaction model

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
