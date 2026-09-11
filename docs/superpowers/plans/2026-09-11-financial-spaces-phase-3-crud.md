# Shared Expense Persistence and CRUD Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans sequentially in this task. No subagents; execution method is already selected.

**Goal:** Deliver participant-private shared expense HTTP CRUD and authoritative payer/allocation net positions on the real local database.

**Architecture:** Keep the positive common ExpenseRecord and taxonomy. Add shared-only payer/allocation facts, a separate shared transaction service, and read projections using the verified shared accounting kernel. Do not modify the owner-only personal transaction runner or connect legacy Fund records.

**Tech Stack:** NestJS, Prisma 5, PostgreSQL, bigint, Jest/Supertest.

## Boundary

This is the next P3 checkpoint after `3400dda`. It is independently usable through authenticated HTTP. P3 is not complete until batches, corrections, locks, confirmations, lifecycle and Web acceptance are delivered. No settlement-start endpoint exists in this checkpoint, so no period can be represented as settled here. The following batch checkpoint must add old/new-date write guards before exposing batch creation. Signed corrections belong to that checkpoint and must use a separate source-linked aggregate, never a negative ExpenseRecord.

## Schema and exact file map

Modify `backend/prisma/schema.prisma`; create `backend/prisma/migrations/20260911000300_shared_expense_facts/migration.sql`:

```prisma
model SharedExpensePayer {
  expenseId String @map("expense_id") @db.Uuid
  userId String @map("user_id") @db.Uuid
  amountMinor BigInt @map("amount_minor")
  expense ExpenseRecord @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])
  @@id([expenseId, userId])
  @@index([userId])
  @@map("shared_expense_payers")
}
model SharedExpenseAllocation {
  expenseId String @map("expense_id") @db.Uuid
  userId String @map("user_id") @db.Uuid
  amountMinor BigInt @map("amount_minor")
  expense ExpenseRecord @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])
  @@id([expenseId, userId])
  @@index([userId])
  @@map("shared_expense_allocations")
}
```

Add inverse `sharedPayers`/`sharedAllocations` arrays to User and ExpenseRecord. SQL checks require payer >0 and allocation >=0. Composite keys reject duplicates; FK rejects nonexistent records/users. Application transactions enforce both sums, same-space participant eligibility, and SHARED_EXPENSES mode. Migration is additive; no copied legacy rows or schema reset. Verify upgrade from phase2 and a fresh phase3_fresh local schema; seed twice with no new financial seed records.

Existing fixture cleanup cascades the new relations through ExpenseRecord; no helper change is needed. Neutral common input fields were extracted to `src/modules/expense-records/expense-input.dto.ts`, with the existing personal DTO inheriting this base unchanged.

New Backend files:

- `src/modules/shared-expenses/dto/shared-expense.dto.ts`: strict positive/signed-free minor strings, nested UUID amount rows, complete replacement and version DTOs, bounded cursor query.
- `src/modules/shared-expenses/shared-expense-records.ts`: enriched Prisma include/projection and wire types.
- `src/modules/shared-expenses/shared-expenses.service.ts`: independent shared CRUD transaction, request receipts, facts and audit.
- `src/modules/shared-expenses/shared-expense-queries.service.ts`: repeatable-read list/detail/summary, full SQL totals independent of pagination.
- `src/modules/shared-expenses/shared-expenses.controller.ts`, `shared-expenses.module.ts`: authenticated routes and Nest wiring.
- `test/shared-expenses.e2e-spec.ts`, `test/shared-expenses-concurrency.e2e-spec.ts`: real AppModule HTTP and two-connection tests.

Modify `src/app.module.ts`, `test/jest-financial-spaces-db.json` and `test/jest-e2e.json` (explicit DB suite registration/exclusion). Reuse ExpenseRecordsService projection, parseExpenseDate/Minor, TaxonomyService selection and FinancialSpacesService participant checks. Add `shared-participant-limit.ts`/`.spec.ts` in financial-spaces and wire participant add and pre-history mode switch to the 16-current-participant bound. Test the wiring with HTTP fixtures and retain existing empty-only lifecycle guards.

## API contracts and transitions

Routes under `/api/v1/spaces/:spaceId/shared-expenses`:

| Method/path | Request | Response data |
|---|---|---|
| POST root | create below | `{record, change_minor, position_changes}` |
| GET root | optional UUID cursor, limit 1..100 default25 | `{space_id, space_version, items, next_cursor}` |
| GET summary | none | `{space_id, mode:'SHARED_EXPENSES', currency, space_version, spending_minor, positions}` |
| GET :expenseId | none | enriched record (including DELETED history) |
| PATCH :expenseId | full create fields + version | mutation result |
| POST :expenseId/delete | request_id UUID, version positive safe integer | mutation result |

```typescript
type AmountRow = { user_id: string; amount_minor: string };
type CreateSharedExpense = {
  request_id: string; amount_minor: string; occurred_on: string; title: string;
  category_id?: string; tag_ids?: string[]; note?: string | null;
  payers: AmountRow[]; allocations: AmountRow[];
};
// record = existing ExpenseProjection plus payers and allocations, both sorted by user_id.
// position_changes/positions = AmountRow[] with canonical signed amount_minor strings.
```

API accepts authoritative explicit allocations; no guessed default split. EQUAL/RATIO/HYBRID calculation helpers from the prior checkpoint can supply these facts when the UI is connected. Reject mode-specific foreign fields (contribution/payment_source/correction/split_mode), numeric money, noncanonical strings and unknown nested fields. Total and each row bounded by PG bigint; zero allowed only for allocations. Maximum16 rows on each side, no duplicates; both sums equal total.

Date must be a real YYYY-MM-DD, >=space.openedOn and <=today in space timezone. Every named payer/allocation participant must be currently active with effectiveFrom<=occurredOn. No retroactive responsibility for new members, and no new obligations assigned to ended members. Current participants may record expense facts involving other eligible participants. Only creator or box manager may edit/delete; group ownership alone grants neither reading nor mutation.

ACTIVE expense → ACTIVE version+1 on change, ACTIVE → DELETED version+1 on deletion. Exact no-op replacement keeps record/space versions and adds only its receipt. Payer-only/allocation-only change increments versions and audits even when total/base fields are unchanged. Deletion retains facts and source history; summary excludes DELETED records. First formal record latch is set atomically and never cleared.

Mutation order: find space identity → transaction → group lock then space lock → participant/mode authorization → compare canonical action/id/version/fields SHA256 to receipt → replay or conflict → ACTIVE space → creator/manager and expense version → fields/participants/taxonomy validation → record/facts → space version/latch → audit → receipt. Every failure rolls back all writes. Authorization precedes receipt replay; key reuse across action/record/payload gives409. Update/delete same-key retry returns original result. Receipt storage can reuse neutral ExpenseMutationReceipt; accounting rules cannot reuse Personal ExpenseMutationService.

Summary queries all ACTIVE common expenses in this space, plus SQL grouped payer/allocation sums; use bigint numeric text (never JS Number). Report all-time spending and positions, not a fund balance/current settlement period. Fail if a shared record is missing facts or sums violate the stored amount; do not render a plausible partial total. No settlement payment facts exist yet; batch integration must extend the mode read model with COMPLETED transfers and correction effects.

## Sequential TDD tasks

### 1. Persist facts and validate migration

- [x] Add real DB schema test using `SELECT to_regclass('shared_expense_payers')` expecting a table; run `npm run test:spaces-db -- --testPathPattern=shared-expenses` and observe failure before migration.
- [x] Add the models/inverses and migration SQL, with FK/check/unique constraints as defined above. Run Prisma generate, migrate deploy against explicit local phase2, then rerun schema test.
- [x] Add direct-write tests for zero payer, negative allocation, duplicate identity and nonexistent user; verify rejection and local fixture cleanup. Apply full history to phase3_fresh and run seed twice; preserve existing phase2 private expense schema/data.

### 2. HTTP financial lifecycle

- [x] Add HTTP creation test: A pays1000, allocations A400/B600; expect record facts and position changes A600/B-600. Observe route404 before adding DTO/controller/service/module.
- [x] Implement strict DTOs, participant-date and mode guards, transaction receipt and CREATE facts/audit/latch. Run real HTTP tests.
- [x] Add PATCH payer-only and allocation-only tests, expected version2 and changed position deltas; add DELETE and replay tests. Observe failure before respective implementation. Include no-op, stale409, soft-deleted409, cross-box404, creator/manager403, nonparticipant404 and archived409.
- [x] Add independent key/payload replay, rollback and concurrent edit/delete tests before implementing any missing guards. Audits must include full before/after facts and actor/time. Duplicate create must produce exactly one record and receipt.

### 3. Authoritative reads and privacy

- [x] Add missing GET list/detail/summary tests; then implement repeatable-read queries. Test spending>2^53 and >single-row max with at least2 valid expenses; limit1 cannot truncate totals. Detail preserves deleted facts; list excludes them.
- [x] Test cursor from foreign/deleted record rejects400, stable occurrence DESC/id DESC ordering, wrong mode409 and nonparticipant/group-governor404 on every read/mutation. Taxonomy allows system/group terms; rejects private/foreign group terms, wrong kind, and new archived use; edits retain original historical IDs.
- [x] Add schema corruption test in isolated fixture: delete one allocation fact directly, then summary must fail instead of reporting a partial position. Restore fixture during cleanup.

### 4. Supported participant limit

- [x] Write pure guard test accepting16/rejecting17 for SHARED_EXPENSES and leaving POOLED_FUND unaffected. Observe red, implement guard.
- [x] Wire under existing group/space locks when adding a participant or switching into shared mode. Real HTTP test creates16 current participants, rejects17th; mode switch with17 rejects. Shared expense writes independently reject unsupported existing population. No financial metadata is exposed in failure payloads.

### 5. Verify and record

- [x] From Backend run `npx prisma validate`, `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, and `npm run test:spaces-db` with explicit `DATABASE_URL=postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2`.
- [x] Self-review changed functions for mode/privacy, transaction atomicity, input immutability, numeric ranges, snapshot consistency, no-op deltas and date boundary tests. Fix important findings through red/green regression.
- [x] Update `.agents/devlog.md`, `.agents/features.md`, and checkpoint execution record; `git diff --check`; conventional commits for schema, HTTP implementation and acceptance. No merge/push.

## Plan self-review

Types align with existing ExpenseProjection and Prisma positive common records. Shared payloads have no personal income, pooled contribution, or old Fund identifiers. All monetary API values are strings, all arithmetic bigint; receipt/audit JSON contains strings. No placeholder API or unsupported settlement status is introduced. This checkpoint explicitly leaves full P3 batch/lock/correction/lifecycle/UI acceptance on the dependency sequence; it does not claim those features. Web code is unchanged, and the full Web baseline plus real shared browser journey remains mandatory at P3 acceptance.
