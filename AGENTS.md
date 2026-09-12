# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Mimic** — a financial-space Web PWA for individuals, couples, and small groups. Users keep a private personal ledger, split shared expenses, or operate a pooled fund. Key invariant: **settled periods are locked and cannot be edited retroactively**; corrections must be new transactions.

Run repository commands from the cloned repository root unless a section names a subdirectory. The root `README.md` provides the public project overview; detailed design specs live in `docs/`.

---

## Backend (NestJS + PostgreSQL)

### Commands (run from `backend/`)

```bash
npm run start:dev          # Dev server with hot reload (port 3000)
npm run build              # Compile TypeScript → dist/
npm run test               # Jest unit tests
npm run test:e2e           # Supertest e2e tests
npm run test -- --runInBand <test-file>  # Run a focused test file
npm run test:spaces-db     # Explicit real-PostgreSQL financial-space suites

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
| `financial-spaces` | Three-mode space metadata, participation, lifecycle, and privacy |
| `personal-expenses` | Private ledger expenses and authorized shared references |
| `shared-expenses` | Multi-payer expenses, exact allocations, and participant-private reads |
| `shared-settlements` | Batch locks, minimum transfers, confirmations, and immutable corrections |
| `pooled-funds` | Commitments, occurrences, pooled expenses, reimbursements, returns, and closing |
| `home` | Actor-scoped home and task projections |
| `taxonomy` | Private/group categories and tags |
| `expense-records` | Neutral expense persistence primitive shared by all modes |
| `prisma` | Shared `PrismaService` singleton |

Each module follows: `*.module.ts` → `*.controller.ts` (HTTP) → `*.service.ts` (logic) → `dto/` (class-validator DTOs).

Global request validation is configured in `main.ts` through `RequestValidationPipe`.

### Data model key points

- **Money stored in minor units** (`bigint` — cents, not dollars) throughout schema and API
- **Soft deletes**: records have a `status` field (ACTIVE/DELETED), never hard-deleted
- **Audit trail**: `AuditLog` table records all mutations (CREATE, UPDATE, DELETE, COMPLETE, etc.)
- **Mode isolation**: personal, shared, and pooled facts have distinct accounting rules and never collapse into a universal balance
- **Settlement locking**: completing a shared settlement batch permanently locks its covered date range
- **Multi-payer expenses**: shared payer and allocation facts remain separate and exact

Schema source of truth: `backend/prisma/schema.prisma`.

---

## Web PWA (Next.js + React)

Run Web commands from `web/`. The PWA uses Next.js App Router, server-side BFF routes under `src/app/api/`, shared API and authentication infrastructure under `src/shared/`, and feature modules under `src/features/`.

Use `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` as the baseline verification sequence. Production builds require `MIMIC_API_BASE_URL`; local development defaults to `http://localhost:3000/api/v1`.

---

## Accounting Rules (critical domain logic)

The approved source is `docs/superpowers/specs/2026-09-11-financial-spaces-product-model-design.md`:

1. Personal expenses belong only to their owner, including private metadata on authorized shared references.
2. Shared positions equal paid amounts minus allocated amounts plus completed transfers and signed corrections.
3. Pooled book, available, reimbursement, occurrence, and shortfall states are independent of shared positions.
4. Completed shared periods are immutable; corrections are new signed records in a later period.
5. Money stays as canonical decimal strings at Web boundaries and `bigint`/exact database integers in accounting code.

---

## Key Documentation

For current financial-space work, read these in order:
1. `docs/superpowers/specs/2026-09-11-financial-spaces-product-model-design.md`
2. `docs/superpowers/plans/2026-09-11-financial-spaces-roadmap.md`
3. `.agents/features.md`

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
