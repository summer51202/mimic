# P3 shared Web and browser execution

Approved design: `../specs/2026-09-11-financial-spaces-product-model-design.md`.
Plan: `2026-09-11-financial-spaces-phase-3-shared-web.md`.
Execution: sequentially in this task on `codex/financial-spaces`, continuing from `8295057`. No subagents, repeated brainstorming, merge, push or worktree removal.

## Delivered checkpoint

The PWA now exposes shared boxes through participant-private group navigation. A strict server composition loads the participant projection before any financial reads; a group governor outside the box sees only name, mode and status, while outsiders and former participants receive privacy-preserving 404 responses. No legacy Fund compatibility layer is present.

The shared workspace creates and lists multi-payer expenses, accepts EQUAL or exact FIXED allocations, and keeps every monetary value as a canonical minor-unit decimal string. Arithmetic and later-correction reconstruction use `BigInt`, including values beyond JavaScript's safe integer range. Positions remain authoritative backend `paid - allocated` facts rather than balances invented by the UI.

Managers create consecutive settlement batches and participants confirm transfers in payer-then-recipient order. Pending periods explain temporary locks; completed periods remain immutable and open an expense-correction flow. Subsequent correction targets are rebuilt from the source plus ordered signed deltas. Fully settled participants can exit, the last active manager cannot leave, and fully settled boxes can be archived into an explicit read-only view.

## Runtime isolation

- PostgreSQL data directory: `D:\Project\mimic\.worktrees\financial-spaces\.session\postgres`
- Host/port: `127.0.0.1:55439`
- Database/user: `mimic_financial_spaces_test` / `mimic_test`
- Schema: `phase2`
- URL used by verification: `postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2`
- API/Web acceptance endpoints: `http://127.0.0.1:3101/api/v1` and `http://127.0.0.1:3110`

All eight migrations were already applied with no pending migration. Only this task-owned cluster was used. The API, Web server and PostgreSQL cluster were stopped after verification; `pg_ctl status` reports no server and both HTTP endpoints reject connections.

## TDD and systematic-debugging evidence

- Missing schemas, routes and components supplied the initial contract/BFF/query/form/workspace/settlement/correction/lifecycle REDs before their focused GREEN runs.
- Real browser RED showed the taxonomy picker is `{ terms, recent_ids, frequent_ids }`, not an array; the loader now parses the actual backend projection.
- Real lock errors are `SHARED_PERIOD_TEMPORARY_LOCK` and `SHARED_PERIOD_PERMANENT_LOCK`; focused form tests failed before both mappings were added.
- Real correction payer/allocation projections are signed deltas; the strict unsigned contract failed before those rows changed to signed schemas.
- Production acceptance exposed actor-to-actor space-version races. Lifecycle conflicts now refresh authoritative state while retaining selection, and the browser verifies bounded retry until the manager-survival guard.
- Archive acceptance failed before the workspace showed `已封存 · 唯讀` and removed create/edit/delete/settlement actions.
- Self-review produced REDs for later corrections incorrectly starting from the original expense and for an archive dialog remaining open. Ordered exact delta reconstruction and post-success dialog closure made both GREEN.
- The full Web suite found the group route-boundary test importing the new server-only query. The suite failed at import before that dependency was mocked and asserted, then passed.

## Verification evidence

| Verification | Result |
|---|---|
| Backend `npm run build` | exit 0 |
| Backend `npm test -- --runInBand` | 36 suites / 390 tests passed |
| Backend `npm run test:e2e -- --runInBand` | 5 suites / 54 tests passed |
| Backend `npm run test:spaces-db`, explicit loopback phase2 URL | 12 suites / 115 tests passed |
| Web `npm run lint` | exit 0 |
| Web `npm run typecheck` | exit 0 |
| Web `npm test` | 91 files / 537 tests passed |
| Web `npm run build`, local API URL | exit 0 |
| Real-backend Playwright | phone-small 320x720, phone 390x844, tablet 768x1024 and desktop 1440x900: 4/4 passed |

The browser scenario registers isolated owner, participant, governor and outsider contexts; creates a shared box; joins a participant; posts an exact expense; verifies positions; creates and completes two batches; observes pending and permanent locks; posts an immutable next-period correction; verifies the original; exercises stale-version and idempotent replay; exits the settled participant; denies former financial reads; archives; and checks focus, dialog bounds and horizontal overflow. It contains no `page.route`, `route.fulfill` or mocked financial response.

The production build retains the pre-existing standalone copy warning for missing `(public)/page_client-reference-manifest.js`; the command exits 0 and this checkpoint does not misreport the warning as a failure. Initial Vitest/Playwright launches inside the restricted Windows sandbox hit `spawn EPERM`; identical commands completed after granting process-spawn permission.

## Self-review complete

The diff from `8295057` exceeds 200 lines, so review covered every changed production function/section and the tests exercising contracts, exact money, privacy, roles, conflict recovery, idempotency, responsive bounds and legacy leakage. Fixed the later-correction target, archive-dialog and route-boundary issues described above. No critical or important issue remains in the reviewed scope.

Implementation commits:

- `2c5f9db feat(web): add strict shared finance boundary`
- `dd0620d feat(web): open participant-private shared boxes`
- `1b00859 feat(web): manage exact shared expenses and positions`
- `c02ccd6 feat(web): confirm shared settlement batches`
- `9b5dd80 feat(web): close settled shared boxes safely`
- `1b52d9e style(web): finish responsive shared expense workspace`
- `340ec1e test(web): prove shared finance browser lifecycle`
- `c75260f fix(web): preserve corrected shared targets`
- `71483b8 test(web): preserve shared route boundaries`
- `de00a41 test(web): stabilize shared lifecycle acceptance`

## Remaining phase scope

P3 shared Web/browser delivery is complete. P4 personal references to shared expenses, P5 pooled commitments/balances/advances/reimbursements/returns, P6 full box navigation/home/quick entry/task center and P7 durable drafts/full three-mode acceptance/legacy removal remain planned. Original-root untracked `.codex-remote-attachments/` and `reference/` remain untouched.
