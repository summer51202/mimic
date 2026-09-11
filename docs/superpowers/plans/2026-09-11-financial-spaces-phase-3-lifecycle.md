# Shared Settled Lifecycle Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans sequentially in this task. The user already selected inline execution. Use strict TDD; do not spawn agents or repeat execution-choice approval.

**Goal:** Allow a settled shared participant to leave and a fully settled shared box to archive without reopening obligations, breaking historical corrections or granting financial access to former participants.

**Architecture:** A shared-mode lifecycle guard reads the authoritative bigint positions and completion coverage under the existing group-to-space mutation lock. The neutral core delegates only SHARED_EXPENSES to this guard; personal and pooled conservative history guards remain. Existing lifecycle routes, optimistic versions, actor/time audits and idempotent retries are retained.

**Tech Stack:** NestJS, Prisma5, PostgreSQL17, bigint, Jest/Supertest.

## Scope and contracts

Base `ccd9181` in the existing isolated financial-spaces worktree. No schema migration or seed change is needed. No new API or financial status is introduced.

Existing routes remain `POST /api/v1/spaces/:spaceId/participants/:participantId/end` and `POST /api/v1/spaces/:spaceId/archive`, each body `{version:number}`. Successful responses retain current participant or space projections. End sets effectiveTo to the current box-local DATE and increments space version; archive sets ARCHIVED/archivedAt and increments version. Both audit exactly once. A retry after authorization returns the existing result without another state transition. Self-exit retry exposes only one's own ended interval, never financial data.

### Mode-owned eligibility

Create `backend/src/modules/shared-settlements/shared-lifecycle.ts`, exporting:

```ts
export async function requireSharedLifecycleReady(
  tx: Prisma.TransactionClient, spaceId: string, userId?: string,
): Promise<void>
```

Caller already holds the space lock and has authorized the actor. With userId this checks departure; without userId it checks archival. Checks, in order:

1. Archive rejects any PENDING batch. Departure rejects any incomplete transfer involving the target in a PENDING batch. Return409 `SHARED_BATCH_PENDING`.
2. Call `readSharedFinancials(tx,spaceId)`. Archive requires all positions0; departure requires target position0. Return409 `SHARED_UNSETTLED_POSITION`. Never duplicate the accounting formula or substitute zero after a read failure.
3. Find latest COMPLETED batch's periodEnd. Consecutive completed batches cover all dates through this boundary. Any ACTIVE expense or immutable correction after this boundary is unfinalized. With no completed batch, all such facts are unfinalized. Archive checks all facts; departure checks facts with a nonzero payer/allocation effect for the target. Return409 `SHARED_UNSETTLED_RECORDS`. Net-zero self-paid expenses or canceling correction effects still require a completed batch before departure/archive. DELETED expenses do not leave obligations; their audit/history latch remains.

A settled participant may leave while other participants have unrelated obligations. A currently involved pending batch remains blocked even if later open expenses offset its transfer amount. An archived shared box allows settled non-final-manager departure while retaining immutable history and no write capability.

Modify `financial-spaces.service.ts` archive and `space-participants.service.ts` end to call the shared guard only for SHARED_EXPENSES, otherwise retain `requireEmpty`. Preserve authorization/version ordering and final-manager protection. Update the final-manager query to count only current managers whose user and group membership are ACTIVE; disabled managers cannot satisfy the surviving-manager invariant.

### Date boundary and rejoin

Existing participation remains half-open DATE intervals. Ending a participant is immediate; rejoin creates a new interval. A finalized expense posted earlier on the exit date remains authoritative even though its historical interval now ends on that DATE. Modify `shared-corrections.service.ts` target eligibility: current participation is always required; historical eligibility may be proved by an original source payer/allocation fact OR an interval containing the original occurrence date. Original source facts are immutable and were validated when posted. This exception cannot add new historical parties and cannot authorize an ended participant. It avoids rewriting dates/source facts or inventing timestamp precision.

## Sequential TDD tasks

### 1. Real HTTP lifecycle

Create `backend/test/shared-lifecycle.e2e-spec.ts`; register it in `backend/test/jest-financial-spaces-db.json` and exclude it in `backend/test/jest-e2e.json`. Reuse `createSpaceTestApp`, `sharedSettlementCase`, `finishBatch`. Tests use the real Nest app and task-local database.

- [x] Write test: create1000 paid by A, allocations400/600; complete batch; end B with latest space version. Expect200, effective_to=today, version+1, one PARTICIPANT_ENDED audit. B's shared summary/expense/batch/correction/participant reads now404, own repeated end returns unchanged interval. Archive by A succeeds, repeat unchanged, actor/timestamp retained, all financial writes409 and current participant history readable.
- [x] Run `npm run test:spaces-db -- --testPathPattern=shared-lifecycle` with explicit local phase2 DATABASE_URL. Observe expected200 versus current409 SPACE_HAS_FINANCIAL_HISTORY before production changes.
- [x] Add manager-only archive and removal tests; unresolved position, incomplete transfer, zero-position unfinalized expense/correction, canceled batch and unrelated obligations cases. Assert exact409 codes and no version/audit changes. Completed empty batch and deleted-only history can archive. Archived last manager cannot exit; nonshared nonempty guards remain.
- [x] Implement the shared lifecycle function and two call sites; run the suite GREEN. No schema or legacy Fund formula changes.

Representative successful path:

```ts
const batch = await finishBatch(f, c.root, await start());
await f.call('post', `${c.root}/participants/${b.id}/end`, 1)
  .send({ version: await currentVersion() }).expect(200);
await f.call('get', `${c.root}/shared-settlements/${batch.id}`, 1).expect(404);
await f.call('post', `${c.root}/archive`)
  .send({ version: await currentVersion() }).expect(200);
```

### 2. Historical eligibility and manager handoff

- [x] Write failing regression: expense on exit DATE is settled; end B on that date (test controls spaces.today only for this boundary), restore current date, rejoin B, then correct the locked source in the open period. Expect201 with original B responsibility preserved. An unrelated newcomer still400 and an ended non-rejoined target remains rejected. Implement source-fact evidence plus existing interval check, then GREEN.
- [x] Write failing last-manager regression: promote B, disable B's user, attempt A's end/demotion. Expect409 SPACE_MANAGER_REQUIRED. Implement active user/group membership filters on surviving managers; restore fixture user in finally. Verify valid handoff permits manager exit with all financial history retained.

### 3. Concurrency and rollback

Create `backend/test/shared-lifecycle-concurrency.e2e-spec.ts`, register/exclude with the other realDB suite. Use an independent PrismaService and FinancialSpacesService/SpaceParticipantsService connection alongside the Nest service.

- [x] Race new expense versus archive after prior settlement; exactly one succeeds, archived box has no new expense. Race new expense or source correction versus target exit; exactly one succeeds, no departed participant receives a new obligation. Race duplicate archive and duplicate self-exit; single version/audit transition. Race manager exits after valid handoff; at least one active manager remains.
- [x] Add fixture-specific NOT VALID CHECK on space_audit_events to reject new ARCHIVE/PARTICIPANT_ENDED rows. Failed writes preserve status/archivedAt/effectiveTo/version and financial facts. Drop constraint in finally. No production mocks or test-only production methods.
- [x] Run narrow suites; for any newly discovered defect observe RED before minimum fix and GREEN after.

### 4. Verification and commits

- [x] Backend `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run test:spaces-db` with explicit `postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2`. All exit0. No migration command is required.
- [x] Web `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` with local MIMIC_API_BASE_URL. Record any existing standalone packaging warning separately; no shared browser acceptance claim before shared Web implementation.
- [x] Self-review new functions and changed sections, including corrections/read/lock/group departure integration; check no type/placeholder contradictions. Update `.agents/devlog.md`, `.agents/features.md` and lifecycle execution record. Commit plan, lifecycle behavior/tests and acceptance docs with conventional messages. `git diff --check`, clean implementation worktree, preserve unrelated root files, stop task PostgreSQL.

## Plan self-review

This checkpoint covers shared archive prerequisites and departure obligations, independent mode accounting, manager survival, privacy after ending participation, effective dates, immutable source corrections, transaction concurrency and audit. Monetary confirmations remain in the prior batch checkpoint and preserve their receipts. P3 Web delivery/browser acceptance, P4 references, P5 pooled lifecycle, P6 navigation/tasks and P7 drafts/cleanup remain on their existing roadmap. No permanent legacy compatibility or fabricated zero-obligation service is added. Signatures use the existing Prisma.TransactionClient, string UUID and bigint read types; no new enum or transport shape is needed.
