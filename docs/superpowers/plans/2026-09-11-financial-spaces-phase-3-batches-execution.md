# P3 shared batches and corrections execution

Approved design: `../specs/2026-09-11-financial-spaces-product-model-design.md`.
Plan: `2026-09-11-financial-spaces-phase-3-batches.md`.
Execution: sequentially in this task, isolated `codex/financial-spaces` worktree, base `78ce324`. No subagents, brainstorming, merge or push.

## Delivered checkpoint

Authenticated shared-only APIs now start/list/read/cancel settlement batches, confirm sent/received transfers, and post/list immutable expense and transfer corrections. Batch snapshots retain original financial facts and versions. Pending periods block all old/new-date expense edits; canceled periods unlock; completed periods remain locked. The final recipient completes the batch. Zero-transfer batches complete immediately. Current participant authorization precedes receipt replay; group governors outside a box cannot read financial content.

All source mutations serialize group then space and atomically persist audit and request receipt. Same request key with changed payload conflicts. Repeating an applied confirmation with another key preserves actor/time/version. Only completed transfers affect positions; they never change consumption. Signed corrections target the already-corrected source revision, preserve original facts, and enter a later open period. Full void uses total0 and empty sides. Newly joined participants cannot receive historical expense allocations.

Storage uses ordinary bigint expense amounts and NUMERIC(65,0) for aggregate transfers/correction effects, with canonical string boundaries and bigint arithmetic. There is no floating-point money calculation or legacy Fund compatibility mapping.

## TDD and verification evidence

- Period/integer policy:15 assertion failures before implementation, then15 passing tests.
- Schema table-presence assertion failed before migration, then passed.
- Batch start/cancel/lock HTTP tests initially returned404; two-party confirmation tests initially returned404; all became green after implementation.
- Five correction lifecycle tests initially returned404, then passed with immutable delta posting.
- Direct completed-transfer insertion with missing received_at initially succeeded unexpectedly. A new migration requires non-null received_at for COMPLETED; regression then passed. The applied migration was not rewritten.
- Independent Prisma connections cover duplicate starts, edit/start, cancel/send, duplicate confirmations, final two receipts, correction revision and correction/start races. Audit/receipt fault injection proves rollback of snapshots, transfers, confirmations, corrections, effects, versions and receipts. Fault-injection CHECK constraints use NOT VALID to retain existing fixture rows while rejecting new writes.
- Review added tests for wrong-mode routes, incomplete source facts and malformed correction targets. These confirm existing guards and do not represent an additional production change.

| Verification | Result |
|---|---|
| Task-local phase2 upgrade | Both new migrations applied |
| Fresh phase3_batches_fresh install | All8 migrations applied; seed twice passed |
| `npx prisma validate` | valid |
| `npm run build`, backend | exit0 |
| `npm test -- --runInBand`, backend |36 suites /390 tests passed |
| `npm run test:e2e -- --runInBand` |5 suites /54 tests passed |
| `npm run test:spaces-db`, explicit loopback phase2 URL |10 suites /91 tests passed |
| Final expanded shared settlement/correction suites |3 suites /28 tests passed, including3 additional review cases |
| Web `npm run lint`, `npm run typecheck` | both exit0 |
| Web `npm test` |79 files /498 tests passed |
| Web `npm run build`, local MIMIC_API_BASE_URL | exit0, existing standalone manifest-copy warning remains |

Web source was unchanged. Vitest initially hit sandbox spawn EPERM; the identical test command passed with local process-spawn permission. Build retains the previously documented ENOENT warning copying `(public)/page_client-reference-manifest.js` into standalone output; this checkpoint does not certify a deployable standalone artifact. The shared real-backend browser journey follows the Web implementation.

No external database was accessed. Fixture destruction and schema installation were restricted to task-owned loopback PostgreSQL at127.0.0.1:55439. No destructive reset was used. Original-root untracked `.codex-remote-attachments/` and `reference/` remain preserved.

## Self-review complete

Changes reviewed: every new source function, both migrations, HTTP/concurrency tests, and changed schema/module/shared-expense/read/fixture sections. The diff exceeds200 lines, so unrelated existing code was not re-reviewed.

Issues found and fixed: PostgreSQL CHECK allowed NULL received_at through unknown truth value; added explicit non-null constraint with a demonstrated failing regression. The test-only fault injection initially rejected existing fixture audit rows; NOT VALID now targets new writes as intended. No production placeholder, unimplemented API branch or contradictory source/transfer revision type remains.

Correctness review covered inclusive dates, local calendar derivation, pending versus permanent locks, exact totals, cumulative corrected targets, completed-only payment effects and zero-transfer completion. Security review covered current membership before replay, manager versus transfer-party authorization and scoped cursor/source lookup. Transaction review covered lock order, atomic receipts/audits and last-transfer completion. Verdict: CLEAN for this checkpoint; no critical or important issue remains in the reviewed scope.

Plan adjustments: correction DTOs live in a separate `dto/shared-correction.dto.ts`. Migration00401 was added for the demonstrated NULL constraint issue. Commits separate schema, period/read core, HTTP workflow with its tests, and acceptance documentation; confirmation and correction HTTP wiring stays together so no exposed batch endpoint lacks the corresponding lock/correction path.

## Remaining phase scope

P3 remains in progress. Next implement settled participant exit/archive with unresolved-obligation checks, then shared Web contracts/forms/batch confirmations/corrections and the real-backend browser journey. Existing conservative nonempty exit/archive guards remain. P4 shared expense references, P5 pooled accounting, P6 navigation/tasks and P7 durable offline drafts/three-mode acceptance/legacy removal remain on the approved roadmap. This backend HTTP checkpoint does not claim final P3 or three-mode browser acceptance.

Implementation commits: `826ef2f` schema, `adf2099` period/read core, `9bf999c` HTTP workflows and acceptance tests. Planning commit: `9718b67`.
