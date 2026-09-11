# Shared Settlement Batches and Corrections Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans sequentially in this task. The user selected inline execution; no subagents or new approval round.

**Goal:** Deliver real-backend shared settlement batches, period locks, two-party confirmations and next-period corrections without changing locked source facts.

**Architecture:** Add a shared-settlement aggregate independent of legacy Settlement. All mutations serialize group→space and atomically write financial facts, audit and request receipts. One authoritative shared read function composes expenses, signed corrections and completed transfers using the existing bigint kernel; summaries and batch snapshots use that same function.

**Tech Stack:** NestJS, Prisma5, PostgreSQL, TypeScript bigint, Jest/Supertest.

## Checkpoint boundaries

Base `78ce324`; P3 expense CRUD is complete. This checkpoint delivers authenticated backend workflows. Settled participant exit/archive and the usable shared Web flow follow before P3 acceptance. Existing conservative nonempty lifecycle guards remain. P4 references, P5 pooled accounting, P6 home/tasks and P7 durable drafts remain on the approved roadmap. No bank verification or automatic financial confirmation is represented.

## Storage and types

Modify `backend/prisma/schema.prisma`; create `backend/prisma/migrations/20260911000400_shared_settlement_batches/migration.sql`.

- `SharedBatchStatus`: PENDING, COMPLETED, CANCELED.
- `SharedTransferStatus`: AWAITING_PAYMENT, SENT, COMPLETED.
- `SharedOperationAction`: BATCH_START, BATCH_CANCEL, TRANSFER_SENT, TRANSFER_RECEIVED, EXPENSE_CORRECTION, TRANSFER_CORRECTION.
- Add matching batch/transfer/correction actions to SpaceAuditAction.
- `SharedSettlementBatch`: UUID id/spaceId/createdById, DATE periodStart/periodEnd, status, positive version default1, immutable snapshot JSON, createdAt timestamp, nullable completedById/completedAt and canceledById/canceledAt. Relations to space/users/transfers. Partial unique index permits only one PENDING batch per space; CHECK periodStart<=periodEnd and lifecycle actor/time pairs. Canceled batches remain visible in history.
- `SharedSettlementTransfer`: UUID id/batchId/fromUserId/toUserId, exact integer amountMinor Decimal(65,0), status, positive version default1, nullable sentById/sentAt, receivedById/receivedAt. Parties differ, amount>0, sent actor=from, received actor=to; CHECK state/fact nullability. Foreign keys retain users and batch.
- `SharedCorrection`: UUID id/spaceId/createdById, exactly one sourceExpenseId/sourceTransferId, positive revision, DATE occurredOn, reason<=2000, signed amountMinor Decimal(65,0), nonnegative targetAmountMinor Decimal(65,0), createdAt. Unique(sourceExpenseId,revision) and unique(sourceTransferId,revision). No update/delete endpoint; every correction is a new immutable fact. Relations to sources and effects.
- `SharedCorrectionPayer`/`SharedCorrectionAllocation`: composite correctionId/userId primary key, signed integer amountMinor Decimal(65,0), FK correction/user. Application verifies each side sum equals correction.amountMinor. Transfer corrections have amountMinor0 and allocation effects empty.
- `SharedOperationReceipt`: id/spaceId/actorUserId/requestId UUIDs, action enum, payloadHash64, response JSON, createdAt; unique(spaceId,actorUserId,requestId).

Add all inverse relations to FinancialSpace, ExpenseRecord, User and the new models. All stored ordinary expense amounts remain bigint. Aggregated transfers can exceed a row's bigint limit (existing acceptance already sums two maximum rows); NUMERIC(65,0) is integer storage, not floating point. Construct Prisma amounts from canonical strings and convert loaded amounts with `BigInt(decimal.toFixed(0))`; never Number/parseFloat. Snapshot, audit and API amounts remain strings. The65-digit storage ceiling is explicitly validated before persistence; ordinary expense correction targets retain the existing PG bigint maximum.

## Exact files and responsibilities

Create under `backend/src/modules/shared-settlements/`:

- `shared-settlement-policy.ts`/`.spec.ts`: real-date consecutive inclusive periods and canonical nonnegative integer parsing.
- `shared-period-lock.ts`: `requireSharedPeriodOpen(tx,spaceId,dates)` returns409 SHARED_PERIOD_TEMPORARY_LOCK or SHARED_PERIOD_PERMANENT_LOCK; canceled batches are ignored. Used under the space lock before every expense mutation and correction write.
- `shared-operations.service.ts`: authorized/mode-checked receipt runner and atomically audited space-version helper. Receipt hash includes action/entity/version and canonical body; same key/different input409. Authentication/participation precedes replay.
- `shared-settlement-projection.ts`: string-money transfer/batch/correction projections and include constants.
- `shared-settlements.service.ts`: start/cancel/send/receive; detail/list reads with participant authorization and RepeatableRead.
- `shared-corrections.service.ts`: source-bound revisioned target replacement and delta posting; immutable correction reads.
- `shared-settlements.controller.ts`, `shared-corrections.controller.ts`, `shared-settlements.module.ts`: strict authenticated route wiring.
- `dto/shared-settlement.dto.ts`: request/version/date DTOs, bounded pagination and correction target DTOs.

Create `backend/src/modules/shared-expenses/shared-financial-read.ts`: `readSharedFinancials(tx,spaceId,end?)` yields bigint spending and MemberAmount positions. Retain the existing SQL expense integrity check and grouped sums, then add signed correction effects and COMPLETED transfer facts; optional end includes transactions up to that date and transfers whose batch periodEnd<=end. Error on inconsistent source facts; no partial total fallback.

Modify `shared-expense-queries.service.ts` to use that read function; `shared-expenses.service.ts` checks old occurrence date before update/delete and new occurrence date before create/update, including exact no-op edits. Existing receipt replay returns the previous fact without another write, even when its period later locks.

Modify `backend/src/app.module.ts`, `backend/test/helpers/space-test-app.ts` (delete fixture receipts/corrections before batches and expenses), and the two Jest e2e configurations. Create `backend/test/shared-settlements.e2e-spec.ts`, `shared-settlements-concurrency.e2e-spec.ts`, and `shared-corrections.e2e-spec.ts`.

## API and state contracts

All paths below have `/api/v1/spaces/:spaceId` prefix. Every ID is UUID; every supplied version is a positive safe integer; all request DTOs reject unknown and foreign-mode fields.

| Route | Request | data |
|---|---|---|
| POST /shared-settlements | request_id, version (space), period_end | BatchProjection |
| GET /shared-settlements | optional cursor, limit1..100 default25 | items,next_cursor |
| GET /shared-settlements/:batchId | none | BatchProjection |
| POST /shared-settlements/:batchId/cancel | request_id, version (batch) | BatchProjection |
| POST /shared-settlements/:batchId/transfers/:transferId/sent | request_id, version (transfer) | BatchProjection |
| POST /shared-settlements/:batchId/transfers/:transferId/received | request_id, version (transfer) | BatchProjection |
| POST /shared-corrections/expenses | request_id, source_expense_id, source_revision>=0, occurred_on, reason, amount_minor>=0, payers[], allocations[] | CorrectionProjection |
| POST /shared-corrections/transfers | request_id, source_transfer_id, source_revision>=0, occurred_on, reason, actual_amount_minor>=0 | CorrectionProjection |
| GET /shared-corrections | optional cursor, limit1..100 default25 | items,next_cursor |

BatchProjection fields: id,space_id,period_start,period_end,status,version,snapshot,created_by,created_at,completed_by,completed_at,canceled_by,canceled_at,transfers. TransferProjection fields: id,from_user_id,to_user_id,amount_minor,status,version,sent_by,sent_at,received_by,received_at. CorrectionProjection fields: id,space_id,source_expense_id,source_transfer_id,revision,occurred_on,reason,amount_minor,target_amount_minor,payers,allocations,created_by,created_at. Source revision starts0 and increments per correction, independent of the locked source expense/transfer version.

### Batch start and locks

Manager only. Check ACTIVE mode/space version and no pending batch. First periodStart=space.openedOn; otherwise latest COMPLETED periodEnd+1 calendar day. periodEnd>=start and <=today in space timezone. Canceled periods do not advance start. Use DATE arithmetic in UTC on already localized calendar dates.

Under one group/space transaction, read authoritative closing positions as of periodEnd; snapshot all ACTIVE expenses in [start,end] with versions and common facts, all corrections in [start,end] with revisions/effects, and closing positions. Generate exact minimumTransfers. Create PENDING batch/transfers; if no transfer, create COMPLETED batch with creator/time as completion actor/time in the same transaction. A batch is formal history and latches the mode even when empty or subsequently canceled.

Pending and completed intervals are inclusive. Reject create/backdate inside either, edits moving from or into either, deletion inside either, and metadata-only edits of locked financial records. Canceling a pending batch before any sent fact releases its temporary lock. Outside-period expenses remain writable.

### Confirmations

Sender alone performs AWAITING_PAYMENT→SENT. Recipient alone performs SENT→COMPLETED; there is no separate externally observable received-but-not-completed state. Set immutable actor/time once, increment transfer and batch versions, and audit atomically. SENT does not change shared positions. COMPLETED posts sender plus amount and recipient minus amount through the read model.

After each received transition, complete batch only if all transfers are COMPLETED. Set batch completedBy to the final recipient and completedAt to that transition time. One completed transfer while others wait leaves the whole period temporarily locked. Zero-transfer batches complete immediately.

Current participant authorization and correct party precede transition. Repeating an already-applied action with a new request key returns the existing facts without increment/audit/posting; same-key retries return the recorded response. Check version only for a new transition. Receipt before SENT rejects409. Cancel only manager/PENDING/no transfer ever sent; cancellation after any SENT/COMPLETED fact rejects409. No delete/reverse confirmation endpoint.

### Corrections

Manager creates corrections because they revise completed shared obligations. Source must belong to this space and be permanently locked: ACTIVE expense covered by a COMPLETED batch, or transfer COMPLETED in a COMPLETED batch. No correction against merely temporary locks. New occurred_on must be in the current open interval after the last completed period, not covered by a pending batch, and <=today. Correction revision must match the latest source revision; appending another correction adjusts the already corrected target rather than reapplying the first delta. New-period errors are fixed with another source-linked record.

Expense correction request states the desired correct total, payers and allocations. Validate both sums and all nonnegative targets; a total0 void requires empty sides. Reconstruct current effective source from original facts plus previous signed effects. Persist desired-current signed deltas only. Original common content/category/tags and source version never change. A pure redistribution may have amountMinor0. Reject financial no-op with409. Affected parties must remain active participants; desired responsibility must be eligible on the original expense date (including historical intervals on a rejoin), never retroactively assigned to a newly joined person.

Transfer correction states the actual transferred amount. Compare with latest corrected target or original transfer amount; persist amountMinor0, payer effects `sender:+difference, recipient:-difference`, and no allocation effects. This changes obligations but not spending. Both source parties must remain eligible current participants. Original sent/received facts and amount remain immutable. Corrections use source revision plus request receipt to prevent duplicate/concurrent deltas.

## Sequential TDD tasks

### 1. Period policy and schema

- [ ] Test first/next period dates, leap day/year rollover, invalid dates, inverted/end-future ranges, canonical65-digit integer limits. Observe assertion failures before policy implementation, then green.
- [ ] Real database table-presence assertion must fail before adding schema/migration. Add models/inverses/indexes/checks, generate Prisma client and deploy only to task-local phase2. Verify invalid period, multiple pending batch and invalid confirmation actor/state facts fail direct writes.
- [ ] Full migration install on new local schema `phase3_batches_fresh`; seed twice. No migration reset or external DB operation.

### 2. Start/cancel and expense lock wiring

- [ ] Real HTTP start test A pays1000, A/B shares400/600 expects B→A600 and snapshot versions; observe404 before controller/service implementation.
- [ ] Pending period tests independently assert create/edit/delete/backdate blocked409. Test moving record from locked date to open date and open date into locked date. Cancel before sent permits the same edits; canceled history remains. Zero-transfer and empty batch completes atomically and permanently locks dates.
- [ ] Test manager/nonparticipant/wrong-mode authorization, one pending batch, invalid dates, stale space version, exact receipt replay and changed key payload409. Snapshot rejects incomplete facts rather than creating partial suggestions.

### 3. Two-party completion and authoritative summary

- [ ] Add failing send/receive HTTP tests: wrong actor403, out-of-order409, sender fact/time captured and summary unchanged at SENT; receipt zeros positions. Repeated keys and new-key repeated action retain timestamps and versions.
- [ ] Three participants/multiple transfers: one completed transfer does not complete batch; last receipt completes whole batch and permanent lock. Manager cancellation after any send rejects. Next batch start=prior end+1. Later open-period expenses remain outstanding after prior batch completes.
- [ ] Transfer amount beyond PG bigint row range stays exact using integer numeric storage and bigint arithmetic. Completed payments never affect spending.

### 4. Immutable corrections

- [ ] Expense correction test: settle1000 with400/600, then correct next-day total800 with320/480. Assert signed amount−200 and corresponding side deltas, new obligations A−120/B+120, spending800, original source and batch snapshot unchanged. Settle correction next batch and reach zero.
- [ ] Test zero-total responsibility redistribution and full void; second correction uses source_revision1 and targets already corrected state. Stale revision/no-op/foreign source/temporary source/locked or future correction date reject. Nonmanager and nonparticipant cannot correct.
- [ ] Transfer correction actual700 after confirmed600 produces B+100/A−100, amountMinor0 and unchanged spending. Repeat/new source revision and zero actual transfer cases remain exact. Preserve original sent/received timestamps.
- [ ] Correction list is participant-private, bounded and cursor-scoped. Correction effect IDs/revisions are present in subsequent batch snapshots.

### 5. Concurrency, rollback, review and commit

- [ ] Two Prisma connections test expense edit versus batch start, duplicate batch starts, cancel versus send, duplicate send/receive, last two receipts, duplicate source revision corrections, and correction creation versus next batch start. Assert serial outcomes and conservation.
- [ ] Fixture-specific CHECK failures on audit/receipt roll back batch/transfers/locks, confirmation state/versions, and correction/effects/revision together. No incomplete confirmation or financial posting survives a failed transaction.
- [ ] Backend baseline: `npx prisma validate`, `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run test:spaces-db` with explicit loopback phase2 URL.
- [ ] Self-review all changed functions and state/lock paths; fix important findings via red/green. Update devlog/features and execution record. `git diff --check`; conventional commits for schema, batch/locks, confirmations, corrections and acceptance. Preserve unrelated files; no merge/push.

## Plan self-review

The two distinct sources of correction prevent transfer mistakes from appearing as consumption. All financial types are minor-unit integers; numeric database fields have scale0 and all application arithmetic remains bigint. Transfer status differs from batch status; completion is checked at the batch boundary. Source and correction revisions are separate. Common personal/pooled accounting paths remain separate. This checkpoint does not claim settled archival, participant exit, shared UI or final P3 acceptance; those remain explicit following tasks.
