# Financial Spaces Phase 2 Execution Record

Date: 2026-09-11. Worktree: `D:/Project/mimic/.worktrees/financial-spaces`, branch `codex/financial-spaces`.

P2 delivers personal daily bookkeeping and common taxonomy. It does not claim completion of the overall three-mode redesign. The approved design at `66f29e3` remains the product/accounting authority.

## Delivered outcomes

| Plan task | Result and evidence |
|---|---|
| 1. Exact values | Canonical positive bigint minor units, real calendar dates/months, exact decimal-text conversion; 22 backend value and 13 Web parser cases. |
| 2. Persistence | Additive expense/tag/receipt and taxonomy/audit tables with constraints; fresh and P1-upgrade histories verified locally. Legacy Fund/P1 snapshots unchanged. |
| 3. Stable defaults | 16 categories, 15 tags, stable UUIDs and zh-TW/en names. Repeated seed preserves private custom terms. |
| 4. Vocabulary | Private/group authorization, immutable defaults, rename/merge/archive, canonical history and actor-specific picker order. Real HTTP, independent-client races and audit rollback. |
| 5. Personal writes | Owner-only create/edit/soft-delete, exact money/dates, first-record latch, version checks, atomic audit/receipt and authorized idempotent replay. |
| 6. Monthly consumption | Full-month totals independent of page size, month/box/currency/cursor isolation, deleted exclusion and canonical grouping without rewriting stored IDs. |
| 7. Web boundary | Strict response contracts, UUID/query BFF boundaries, common CSRF/session handling and preserved request IDs/money strings. |
| 8. Personal PWA | Reachable 我的寶箱 entry, no-group onboarding, selected-box/month view, CRUD/reload, version-aware pagination, retained conflict input and explicit offline status. |
| 9. Taxonomy UI | Ranked/searchable categories and tags, custom creation after no search match, private management, historical labels and same-kind merge. |
| 10. Acceptance | Real backend/browser journey passed at 320/390/768/1440, baseline checks passed, devlog and feature map updated. |

## Verification

All database commands targeted the task-owned PostgreSQL17 cluster at `127.0.0.1:55439`, database `mimic_financial_spaces_test`. P2 used schema `phase2`; fresh migration verification used `phase2_fresh`. No Staging or Production connection was used.

| Command | Observed result |
|---|---|
| Backend `npx prisma validate` / `npx prisma generate` | Passed |
| Backend `npx prisma migrate deploy` | Passed for upgrade and fresh histories |
| Backend `npm run prisma:seed` twice | Passed; stable IDs/private preservation also tested |
| Backend `npm run build` | Passed |
| Backend `npm test -- --runInBand` | 31 suites / 320 tests passed |
| Backend `npm run test:e2e -- --runInBand` | 5 suites / 54 tests passed |
| Backend `npm run test:spaces-db` | 5 suites / 48 tests passed |
| Web `npm run lint` / `npm run typecheck` | Passed |
| Web `npm test` | 79 files / 498 tests passed |
| Web `npm run build` with local API base | Exit0; existing standalone warning below |
| Web `npm run test:e2e -- personal-expenses.runtime.spec.ts` | 4 projects passed; final run 1.3m |
| `git diff --check` | Passed |

The browser suite registers isolated real accounts with backend-issued tokens. It creates a box without a group, records TWD1.25, reloads, creates private category/tag choices, edits to TWD2.00, merges category identities without changing consumption, rejects outsider financial/private vocabulary reads, proves offline input has not posted, creates a separate USD box without combining totals, and deletes/reloads to authoritative zero. It checks horizontal containment, dialog centering/height and keyboard focus.

Screenshots are in ignored `web/test-results/personal-expenses.runtime--00eec-eping-uses-the-real-backend-<project>/`: `personal-month.png`, `personal-edit.png`, `personal-edit-bottom.png`. Phone, tablet and desktop captures were inspected.

For this Windows run, a single explicitly identified task-owned Web server was started with:

```powershell
# web/, after starting the backend with guarded phase2 DATABASE_URL and local test JWT secrets
$env:MIMIC_API_BASE_URL='http://127.0.0.1:3101/api/v1'
npm run dev -- --webpack --hostname 127.0.0.1 --port 3110
# separate web/ terminal; reuse that known task-owned process
$env:MIMIC_API_BASE_URL='http://127.0.0.1:3101/api/v1'
$env:MIMIC_RUNTIME_ACCEPTANCE='0'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3110'
npm run test:e2e -- personal-expenses.runtime.spec.ts
```

Initial attempts hit cold-start timeout, missing Chromium and corrupted generated `.next/dev` declarations. Matching Chromium was installed, only confirmed task-owned Next processes were stopped, and only the verified worktree `.next/dev` directory was removed. Final acceptance reused the known local server instead of overlapping startup attempts. Assertions use 15-second condition waits for first-route compilation, not sleeps. Dev server was stopped before the final production build.

## TDD and self-review

Observed RED→GREEN cycles included missing value modules/table, missing taxonomy/expense/month HTTP routes, missing contracts/BFF routes and missing UI components. Focused regressions exposed and fixed:

- Zod calling BigInt on invalid decimal text: guard parsing inside the refinement.
- BigInt literals incompatible with the Web TypeScript target: use exact BigInt constructors.
- Missing uncategorized default misreported as user input: explicit system configuration error.
- Conflict refresh not exposing a reviewed latest version: preserve inputs, show latest record and require explicit retry.
- Archived selection shown only with a generic label: retain original ID and display its known name.
- Global margin reset placing the personal dialog off-center: scoped centering/height limit, checked against real bounds.

Fixture corrections included explicit Testing Library cleanup, avoiding a Vitest beforeEach callback accidentally returning a mock as cleanup, Prisma-compatible JSON inputs, and matching P1's strict400 response for forbidden currency fields. Product validation was not loosened.

Self-review covered changed schema/constraints, actor/participant boundaries, lock order, rollback, money/dates, receipt identity, canonical taxonomy, monthly queries, DTO/Zod consistency, BFF forwarding, UI failures/retries, pagination and runtime visuals. The diff exceeds200 lines: review focused on changed functions/sections, not unchanged repository code. No critical or important unresolved P2 findings remain. The only Number conversion in the new financial modules is the bounded pagination limit; no Fund calculator or floating-point amount parser is imported.

## Execution differences and remaining phases

- Added `test/helpers/space-test-app.ts` using real AppModule. Lifecycle/concurrency tests mainly use real PostgreSQL HTTP/service suites instead of duplicate mocked services.
- Verified unresolved/failing reads through pure consumption and Web query/pagination tests; no fake successful backend zero response.
- UI CRUD and keyboard workflows are verified end-to-end; focused components cover precision, retries, conflicts, offline input, historical terms and stale pagination.
- Group vocabulary management is an authenticated API. P3/P5 connect shared/pooled forms; P2's manager UI is private vocabulary.
- Picker preserves backend ranking and filters loaded options locally. It does not calculate client usage.
- Grouped persistence/catalog into one commit and personal writes/monthly consumption into another. UI and private taxonomy are delivered together because the expense form uses the picker.
- P2 retains input while the form stays open. Durable drafts/locked-draft corrections are P7. Shared pending/permanent locks are P3, not simulated in personal mode.
- Existing Fund APIs/pages stay disconnected until P7 cleanup; no compatibility accounting formula. P6 owns full navigation/home/tasks.
- Existing `(public)/page_client-reference-manifest.js` standalone-copy warning persists. Build exits0, but packaging requires a separate release follow-up; deployment readiness is not claimed.

Next checkpoint: the detailed P3 shared payer/allocation and batch-settlement plan, continuing sequentially in this task. Overall beta readiness still requires all three real-backend journeys at P7.
