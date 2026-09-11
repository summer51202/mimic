# P3 Shared Accounting Kernel Execution Record

Date: 2026-09-11. Branch: `codex/financial-spaces`. Base: `d6237bf`; planning commit: `3ba54cd`.

## Delivered checkpoint

Three pure-function modules, independently usable in Backend unit tests:

- `shared-accounting.ts`: ordinary expense payer/allocation validation, signed effects, and shared positions. Pending/sent transfers do not post; completed sender/recipient entries balance the original obligation.
- `shared-allocation.ts`: EQUAL/FIXED/RATIO/HYBRID, exact bigint multiplication/division, largest remainders, deterministic ID ties, no caller mutation.
- `minimum-transfers.ts`: exact maximum zero-sum partition search and debtor-to-creditor suggestions, explicit 16-nonzero-position bound.

## TDD evidence

The first accounting run failed at missing module/type resolution. Added only declared types and throwing function signatures, then reran to obtain 21 actual assertion failures before implementing behavior. Accounting GREEN: 21/21.

Allocation tests and throwing signature produced 20 assertion failures before implementation. Allocation GREEN: 20/20.

Minimum-transfer tests and throwing signature produced 11 assertion failures before implementation. Minimum-transfer GREEN: 11/11, including 625 independent exhaustive partition comparisons, replay conservation, precision beyond 2^53 and PostgreSQL row range, input permutation, and the 16-position boundary.

The three final modules contain no throwing implementation stubs. Stable invalid-input errors are intentional validation outcomes.

## Fresh verification

Commands run from `backend/`:

| Command | Result |
|---|---|
| `npm run build` | exit0 |
| `npm test -- --runInBand` | 34 suites, 372 tests passed |
| `npm run test:e2e -- --runInBand` | 5 suites, 54 tests passed |

No persistence or Web code changed, so no migrations, real PostgreSQL suite, Web build, or browser journey was executed at this checkpoint. Those remain required before P3 phase acceptance. Ordinary e2e checks above are not a claim of a real-database shared journey.

## Self-review complete

Changes reviewed: all three source files and all three test files in full; plan coverage and type contracts.

Correctness: payer/allocation sums are checked independently; signed correction effects remain separate from ordinary positive expense validation. All accounting is bigint. Transfer states, direction, zero-sum and exact minimality are independently tested. No caller arrays/rows are mutated.

Complexity: mask indices alone use JavaScript numbers, while amounts and subset sums remain bigint. At most 65,536 subsets are allocated. No greedy fallback is used outside already maximally partitioned zero-sum groups.

Security/architecture: these are internal arithmetic functions, not authorization boundaries or public HTTP parsers. Later services must validate mode, actors, dates, row ranges and replay identity before calling them.

Issues found and fixed: none requiring production changes after the initial green runs. Verdict: CLEAN for the arithmetic checkpoint; P3 integration is incomplete.

## Next checkpoint

Plan shared expense persistence/CRUD against the existing positive `ExpenseRecord` and taxonomy services. Define payer/allocation rows, separate signed corrections, API DTOs/projections, supported participant population and archived/ended-participant behavior before implementation. Batch/confirmation work follows that dependency. Preserve the independent personal mutation runner and all unrelated root-worktree files.
