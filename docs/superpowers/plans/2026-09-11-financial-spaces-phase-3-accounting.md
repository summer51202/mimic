# Shared Expense Accounting Kernel Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in this task, as selected by the user. Execute the checkboxes sequentially without subagents.

**Goal:** Establish independently testable, exact shared-expense arithmetic before connecting database mutations or UI.

**Architecture:** Pure functions accept bigint minor units and explicit payer/allocation effects. Shared settlement suggestions use exact subset dynamic programming; no legacy Fund calculator, contribution, or pooled balance is an input. Database authorization, effective dates, locking, persistence, and idempotency belong to subsequent P3 service work.

**Tech Stack:** TypeScript, NestJS repository, Jest.

## Checkpoint scope and dependency order

P1/P2 are complete at `d6237bf`. This is the first implementation checkpoint of P3, not acceptance of the complete shared-expense journey. The remaining P3 checkpoints are ordered as follows:

1. This arithmetic kernel: allocation, signed effects, positions, exact transfer suggestions.
2. Shared expense persistence and authenticated CRUD: add mode-specific payer/allocation relations to `ExpenseRecord`; independent shared mutation service; validate current actor and occurrence-date participants; preserve common taxonomy and positive expense records. Add a separate signed correction aggregate linked to a permanently locked source, never negative personal expenses or legacy contribution corrections.
3. Settlement batches: snapshots of expense/correction identities and versions, closing positions, derived consecutive inclusive periods, one pending batch, manager start/cancel, temporary and permanent lock checks on both old and new occurrence dates.
4. Two-party transfer confirmation: AWAITING_PAYMENT → SENT → COMPLETED; only payer sends and recipient receives; actor/time facts immutable; batch completes only when all transfers complete, with atomic zero-transfer completion. Request receipts and audit share the posting transaction. Cancellation is impossible after any sent fact.
5. Shared lifecycle: settled archive and participant exit, group leave/removal guards, at least one manager; block unresolved obligations and edits that could recreate obligations for ended participants.
6. Usable shared Web entry, payer/allocation form, summary, batch controls, two-actor confirmations and correction flow; strict BFF contracts and real-backend browser acceptance at 320/390/768/1440 widths.

Each subsequent checkpoint needs its exact schema/API/test implementation plan before its production code changes. No schema/API/UI completion is claimed by this arithmetic checkpoint. P4 owns personal references, P5 pooled accounting, P6 global navigation/task center, and P7 offline drafts and legacy deletion.

## Current conflicts and integration decisions

- `ExpenseMutationService` explicitly authorizes PERSONAL_EXPENSES and its owner. Do not weaken that guard to reuse it for shared writes.
- `ExpenseRecord.amountMinor` is positive with a database constraint. Signed corrections need separate facts, while the kernel can consume their signed effects.
- `FinancialSpacesService.archive` and `SpaceParticipantsService.end` currently require no formal history. Shared settled lifecycle needs a mode-specific obligation check; removing the guard globally would expose pooled spaces prematurely.
- A current participant is not necessarily eligible on a historical occurrence date. The later service must resolve half-open participation intervals before invoking the kernel. Correction authorization must retain source historical identities and reject unsupported ended-party obligations.
- Settlement amounts affect positions only after COMPLETED, not at SENT. The kernel receives the transfer status explicitly, so intermediate facts cannot be mistaken for postings.
- An exact minimum is required. Search at most 16 nonzero positions, with O(n·2^n) time and O(2^n) memory; reject larger inputs with `SHARED_SETTLEMENT_LIMIT`. Zero positions do not consume the limit. The later participant/API plan must prevent a box from accumulating an un-settleable supported population; no hidden approximate fallback.

## Types and errors

Create `backend/src/modules/shared-expenses/shared-accounting.ts`:

```typescript
export interface MemberAmount { userId: string; amountMinor: bigint }
export interface SharedEffect {
  amountMinor: bigint;
  payers: readonly MemberAmount[];
  allocations: readonly MemberAmount[];
}
export interface SharedPayment {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
  status: 'AWAITING_PAYMENT' | 'SENT' | 'COMPLETED';
}
export function sharedPositions(
  effects: readonly SharedEffect[], payments: readonly SharedPayment[],
): MemberAmount[];
export function validateSharedExpense(effect: SharedEffect): void;
```

Create `backend/src/modules/shared-expenses/shared-allocation.ts`:

```typescript
export type AllocationInput =
  | { mode: 'EQUAL'; userIds: readonly string[] }
  | { mode: 'FIXED'; amounts: readonly MemberAmount[] }
  | { mode: 'RATIO'; weights: readonly MemberAmount[] }
  | { mode: 'HYBRID'; fixed: readonly MemberAmount[]; weights: readonly MemberAmount[] };
export function allocateShared(amountMinor: bigint, input: AllocationInput): MemberAmount[];
```

Weights use positive integer bigint values (not money despite reuse of the pair shape). Fixed rows may be zero; IDs must be nonempty and unique. HYBRID assigns fixed amounts first and apportions the remainder among a disjoint weighted set. Zero remainder produces zero allocations for weighted participants. Ordinary expense payers must be positive, allocations nonnegative, total positive; both sums equal total. Signed correction effects may contain negative and zero amounts, but each side must still sum exactly to the signed total. A zero-total redistribution is valid if both side sums are zero.

Create `backend/src/modules/shared-settlements/minimum-transfers.ts`:

```typescript
export interface SuggestedTransfer {
  fromUserId: string; toUserId: string; amountMinor: bigint;
}
export const MAX_SETTLEMENT_POSITIONS = 16;
export function minimumTransfers(positions: readonly MemberAmount[]): SuggestedTransfer[];
```

All arrays are copied and deterministically ordered by code-point user ID; no mutation of caller input. Invalid domain inputs throw `Error` with stable messages: `SHARED_INPUT_INVALID`, `SHARED_TOTAL_MISMATCH`, `SHARED_POSITIONS_UNBALANCED`, or `SHARED_SETTLEMENT_LIMIT`. HTTP mapping is the responsibility of the later service. No bigint-to-number conversion of money. Aggregates may exceed a PostgreSQL row bigint maximum; row-range checks remain the persistence boundary's responsibility.

## Task 1 — Shared effects and completed-payment positions

Files: create `backend/src/modules/shared-expenses/shared-accounting.ts` and `shared-accounting.spec.ts`.

- [ ] Write failing tests, starting with the canonical example:

```typescript
const expense = {
  amountMinor: 1000n,
  payers: [{ userId: 'A', amountMinor: 1000n }],
  allocations: [{ userId: 'A', amountMinor: 400n }, { userId: 'B', amountMinor: 600n }],
};
expect(sharedPositions([expense], [])).toEqual([
  { userId: 'A', amountMinor: 600n }, { userId: 'B', amountMinor: -600n },
]);
```

- [ ] Run `npm test -- --runInBand --testPathPattern=shared-accounting` from backend; confirm missing implementation failure.
- [ ] Implement the declared functions using map accumulation: payer `+amount`, allocation `-amount`; COMPLETED sender `+amount`, recipient `-amount`. Validate all effects and payment endpoints/status/positive amounts before accumulation. Validate side uniqueness and equal sums. Preserve zero-position participants appearing in facts.
- [ ] Add red/green cases for SENT and AWAITING_PAYMENT unchanged positions, COMPLETED zeroing, multiple payers, signed reversal, zero-total redistribution, amounts above 2^53, duplicates, invalid payment, negative ordinary expense/payer/allocation, and sum mismatch.
- [ ] Rerun targeted suite; inspect implementation for incorrect signs and any contribution input.

## Task 2 — Exact allocations

Files: create `backend/src/modules/shared-expenses/shared-allocation.ts` and `shared-allocation.spec.ts`.

- [ ] Write failing equal-split test:

```typescript
expect(allocateShared(100n, { mode: 'EQUAL', userIds: ['C', 'B', 'A'] })).toEqual([
  { userId: 'A', amountMinor: 34n },
  { userId: 'B', amountMinor: 33n },
  { userId: 'C', amountMinor: 33n },
]);
```

- [ ] Run `npm test -- --runInBand --testPathPattern=shared-allocation`; confirm missing implementation failure.
- [ ] Implement fixed validation and largest remainder: `floor = total * weight / sumWeights`, `remainder = total * weight % sumWeights`. Award leftover units in descending remainder, then ascending user ID. HYBRID uses `total - sumFixed`, requires disjoint IDs and no over-allocation. Final result sorted by ID.
- [ ] Add red/green tests: ratio 1:2 with total100 →33/67; hybrid fixed A20 and weights B1/C2 →20/27/53; exact fixed amounts; zero remainder; input permutation stability; huge bigint values; nonpositive weights; duplicate/overlapping IDs; empty selections; invalid negative total/fixed amount; fixed sum mismatch.
- [ ] Rerun targeted suite and conservation assertions for each allocation mode.

## Task 3 — Exact minimum transfers

Files: create `backend/src/modules/shared-settlements/minimum-transfers.ts` and `minimum-transfers.spec.ts`.

- [ ] Write failing canonical and greedy-counterexample tests:

```typescript
const positions = [-8n, -7n, -5n, 10n, 8n, 2n]
  .map((amountMinor, i) => ({ userId: String(i), amountMinor }));
expect(minimumTransfers(positions)).toHaveLength(4);
```

- [ ] Run `npm test -- --runInBand --testPathPattern=minimum-transfers`; confirm missing implementation failure.
- [ ] Implement subset sums and the maximum number of disjoint zero-sum groups. For each mask, choose a predecessor maximizing its group count and add one if this mask sums to zero. Reconstruct a deterministic participant ordering from stored predecessors, splitting at zero-sum prefixes. Pair debtors with creditors inside each resulting group using positive minimum remaining amounts. A maximally partitioned group cannot contain a proper zero-sum subset, so it needs exactly size−1 transfers; globally this achieves the minimum `n - groupCount`.
- [ ] Add red/green tests: all zero, exact opposite pair, duplicate ID, nonzero total, deterministic reordered input, strictly debtor→creditor direction, no self transfer, bigint precision, 16 nonzero positions supported, 17 rejected, additional zero positions ignored for limit.
- [ ] Add an independent exhaustive zero-sum partition oracle for small generated balanced vectors; assert minimum count and replay every suggested payment to zero every position. The oracle enumerates subgroups, not the production prefix recurrence.
- [ ] Run the targeted suite and verify the bounded 16-member case completes within Jest's default timeout; no wall-clock microbenchmark threshold.

## Task 4 — Verification and commit checkpoint

- [ ] From backend run `npm run build`, `npm test -- --runInBand`, and `npm run test:e2e -- --runInBand`; all must exit0. No schema/DB commands are needed for this pure-function checkpoint.
- [ ] Read every new source function and test; check input immutability, money precision, validity guards, determinism, complexity, and independent oracle assertions. Fix critical/important findings with failing regression tests before implementation fixes.
- [ ] Append `.agents/devlog.md` with kernel scope, tests, explicit remaining P3 persistence/UI work and numeric search limit. Record evidence in `docs/superpowers/plans/2026-09-11-financial-spaces-phase-3-accounting-execution.md`.
- [ ] Run `git diff --check`; stage only this checkpoint's source/tests/devlog/evidence and commit `feat: calculate exact shared expense positions and settlements`.

Web files and routes do not change in this checkpoint. Its Web baseline and real-backend shared browser journey are mandatory before declaring P3 complete, alongside migrations, real PostgreSQL concurrency tests, lock/correction tests, and confirmation rollback tests. A passing arithmetic suite is not P3 acceptance.

## Plan self-review

- Coverage: shared payer/allocation sums, position signs, signed correction effects, integer allocation, and exact minimum suggestions are covered here. Privacy, membership dates, persistence, batch states, locking, confirmations, archive, and UI remain explicitly assigned to later P3 checkpoints above; other modes remain on the approved roadmap.
- Type consistency: all internal money/weights are bigint; MemberAmount has only userId/amountMinor; payment status is distinct from batch status; no Fund or personal mutation runner input exists.
- Completeness boundary: this is a complete kernel checkpoint plan, not the full P3 implementation plan. No endpoint or migration is introduced without its own detailed plan and TDD verification.
