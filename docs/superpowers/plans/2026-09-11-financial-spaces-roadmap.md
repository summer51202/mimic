# Mimic Financial Spaces Migration Roadmap

**Authority:** `docs/superpowers/specs/2026-09-11-financial-spaces-product-model-design.md`, approved design at `66f29e3`.
**Planning date:** 2026-09-11. This document changes no product behavior and authorizes no deployment. Execution waits for the user's choice.

## Observed baseline and conflicts

Repository was on `main`, HEAD `66f29e3`; recent commits include `b076988` (Activity teardown), `750a638` (Activity loop), `be3f1e9` (Activity plan). Root tracked files were clean; `.codex-remote-attachments/` and `reference/` are unrelated untracked directories and must remain untouched. Work proceeds in `.worktrees/financial-spaces`, branch `codex/financial-spaces`; `.worktrees` is ignored. `.agents/arch.md` is absent; use code and approved design, not an invented architecture document. `.agents/features.md` is dated September 2 and describes the old model.

| Evidence inspected | Conflict / required replacement | Delivery |
|---|---|---|
| `backend/prisma/schema.prisma`: Fund requires group; no mode or box membership | Personal owner scope, independent group/box roles and effective participation intervals | P1 |
| Same schema: Expense requires splitMode; Category lacks personal ownership; no tags/references | Common fields with mode-specific relations and private taxonomy | P2, P3, P4, P5 |
| `backend/src/modules/accounting/accounting-calculator.ts`: `Number(bigint)`, contributions in positions, sent settlement subtracted, received added | Bigint end-to-end; shared position = paid − allocated + completed sent − completed received; remove normalization | P3 |
| `backend/src/modules/settlements/settlements.service.ts`: `normalizeAgainstEqualFundShare`, individual completion, group-member authorization | Batch snapshots, two-party transfer workflow, manager start/cancel, temporary and permanent locks | P3 |
| `backend/src/modules/accounting/settlement-period-lock.ts`: checks COMPLETED individual settlements only | Batch lock guards all create/update/delete/correction dates, including old and new dates on moves | P3 |
| `backend/src/modules/contributions/contributions.service.ts`: any group member can post another member's contribution | Commitments and expected occurrences separate from money; assigned participant self-confirmation only | P5 |
| `backend/src/modules/expenses/expenses.service.ts`: all expenses require payer/splits; ratio arithmetic uses numbers | Mode-specific validation; integer allocation; fund-paid versus advanced source | P2, P3, P5 |
| `backend/src/modules/funds/fund-summary.service.ts`, `fund-summary.types.ts`: common formula, equal member universe, cross-box currency totals | Independent personal/shared/pooled summaries, no cross-box totals; authenticate before financial projection | P3–P6 |
| `backend/src/modules/funds/funds.controller.ts`: detail synthesizes zero positions and default lock label | No invented financial read models; remove obsolete endpoint | P7 |
| `backend/src/modules/groups/groups.service.ts`: raw SQL repeats old position formula; group archive inspects only Fund history | Group leave/removal must also respect box management/obligations, and group archive cannot bypass box lifecycle | P1, P3, P5, P7 |
| `backend/prisma/seed.ts`: one user, one Date Fund | Isolated repeatable multi-user fixtures, owner-not-participant and three modes | P1–P5 |
| `web/src/shared/api/domain-contracts.ts`: Fund mandatory balance, universal split expense, number-or-string money | Strict mode-discriminated contracts; decimal string wire money | P1, P2–P6 |
| `web/src/features/groups/treasury-dashboard.tsx`, `web/src/app/app/page.tsx`: single primary-currency treasury balance | Personal/shared context, mode cards, no totals; reuse selected-group and fail-closed read behavior | P6 |
| `web/src/features/funds/fund-summary.tsx`: contribution primary action, balance on every box | Mode summary and expense primary action; scheduled confirmations in task center | P3–P6 |
| `web/src/features/activity/activity-page.tsx`, `activity-queries.ts`, `activity-schema.ts`: Fund-only merged timeline, contribution/expense filters, numeric UI allocation | Authoritative mode activity with workflow events and correction/source labels; no partial totals | P2–P6 |
| `web/src/shared/navigation/app-navigation.tsx`: Funds and no personal/tasks entry | 寶箱, personal/shared entries, global expense, separate tasks | P6 |
| `web/src/app/sw.ts`: private requests NetworkOnly, fallback has no draft workflow | Preserve private cache boundary; explicit local drafts, manual submission and conflict recovery | P7 |
| `backend/test/fund-dashboard.e2e-spec.ts`: service overrides | Useful HTTP serialization tests, insufficient database/concurrency evidence; add real Prisma integration | P1 onward |
| `README.md`, `AGENTS.md`, `docs/design/mimic-prd-v0.2-final.md`, `docs/design/mimic-backend-accounting-module-map-v0.2.md`, `docs/design/mimic-web-ui-v0.2.md`, `.agents/features.md` | Superseded pooled-fund assumptions and stale status must not govern new implementation | P1 authority note, P7 comprehensive cleanup |

Existing AuditLog storage does not prove every financial service records mutations: inspected contribution/expense creation and settlement completion do not write AuditLog. New mutations require atomic audit writes, tested on rollback.

## Delivery strategy and dependency order

Each phase is a separately accepted unit with small conventional commits, its own detailed plan before execution, strict RED → GREEN evidence, self-review, full relevant baseline, and an appended `.agents/devlog.md` entry. These are development checkpoints, not independent production releases. No stage may publish unfinished mode actions, fake summaries, success stubs, or silently convert a Fund into a new mode.

Use additive new-core tables in P1 and extend only when the owning mode ships. Old Fund tables/routes continue to serve only old test data until P6 cutover and P7 removal. There is no mapping, dual write, formula fallback, or permanent compatibility layer. This avoids a broken intermediate Prisma build and a giant all-module rewrite. No external database is reset or migrated in this task. New financial data is seeded locally; old financial rows are not translated.

| Phase | Dependencies | Working acceptance slice and principal files | Commit boundaries |
|---|---|---|---|
| P1 Core/governance | baseline | Real API create/list/detail/update, manager delegation, dated participation, privacy, empty archive. `backend/src/modules/financial-spaces/`, Prisma additions, strict Web API schema. No financial posting endpoints in this phase. | schema; core API; participation/group guards; contracts/acceptance |
| P2 Taxonomy + personal expense vertical | P1 | Shared category/tag capability plus actual private daily expense CRUD and monthly consumption read model. `backend/src/modules/categories/`, `tags/`, `expense-records/`, `personal-expenses/`; `web/src/features/personal-expenses/`, `web/src/app/app/personal/page.tsx`. This makes the expense core usable instead of a base-table shell. | taxonomy; personal accounting/API; personal create/list/edit UI |
| P3 Shared expenses + batch settlement | P2 | `backend/src/modules/shared-expenses/`, `shared-settlements/`; payers/allocations, corrections, snapshots/locks, two-party transfers, manager cancel, settled archive and safe participant exit. `web/src/features/shared-expenses/`, `shared-settlements/`, `web/src/app/app/spaces/[spaceId]/page.tsx`. | integer calculator; expense CRUD; batch lifecycle; confirmations; full shared UI |
| P4 Private shared references | P2 + P3 | `backend/src/modules/personal-expenses/personal-references.service.ts`, Prisma private reference relation; personal view joins allocated consumption, never duplicates a transaction; opt-in action in shared UI. | reference API/privacy; source synchronization and personal UI |
| P5 Pooled fund vertical | P2 (P3 lock/confirmation patterns may inform, never import shared formula) | `backend/src/modules/pooled-funds/`: commitments, occurrences, self-confirmation, fund-paid/advance expense, reimbursement/returns, independent summary, closing and exit guards. `web/src/features/pooled-funds/`. | commitments/occurrences; money posting/summary; reimbursements; closure/returns; pooled UI |
| P6 Home/navigation/tasks | P3 + P4 + P5 | `backend/src/modules/home/`, `tasks/` compose existing summaries; `web/src/features/home/`, `quick-expense/`, `tasks/`, app navigation and Activity switch to spaces. One global expense action, most-recent eligible box, personal/group separation. | home read model; task center; navigation/cards; quick expense/cutover |
| P7 Offline/acceptance/removal | P6 | `web/src/shared/drafts/`, offline page and service-worker regression coverage; real-backend journeys in `web/e2e/financial-spaces.runtime.spec.ts`; delete obsolete Fund modules/routes/contracts, clean docs and old dev-only schema. | drafts/conflict recovery; browser acceptance; old code/schema/docs removal |

P2 deliberately moves usable personal bookkeeping earlier than the proposed shared-first ordering. P4 remains after shared editing and locks so reference semantics can actually be verified. P5 may be developed separately only with explicit execution authorization; P6 is blocked until all three summaries are proven.

## Accounting and workflow acceptance contracts

All internal money uses bigint; JSON uses canonical base-10 integer strings, never floating point. PostgreSQL bigint persistence is range checked; aggregates may exceed a row's bound and remain bigint/string. Ratios use integer weights or exact decimal-to-integer scaling; rounding uses deterministic largest remainders with stable participant ordering. No currency conversion or cross-box addition.

| Owner | Required test oracle and transitions |
|---|---|
| P2 personal | Create 125 minor units → period spend 125, edit 200 → 200, soft delete → 0; no account balance/income/transfer fields. Category omission uses stable Uncategorized ID. Note and custom taxonomy private. |
| P3 shared | A pays 1000; A/B allocated 400/600 → A +600/B −600. B sends then A receives 600 → both zero only after completed transfer. Contributions cannot appear in inputs. Include multiple payers, >2^53 values, invalid totals/duplicates and effective-date rejection. |
| P3 suggestions | Exact minimum-transfer search with deterministic tie breaking; test counterexamples to greedy matching, zero-sum input, conservation and direction. Do not call a greedy n−1 bound globally minimal. Participant-size/performance limits must be explicit in P3 plan and never silently substitute a nonminimal answer. |
| P3 batch | Start derives first start from space opening date, subsequent start = previous completed end + 1 day; end >= start and <= today in box timezone. Snapshot expense versions, corrections and closing positions atomically. One pending batch per space; no overlapping completed periods. Pending batch → COMPLETED only when every transfer completes, or CANCELED only before any sent fact. Zero-transfer batch completes atomically. |
| P3 transfer | AWAITING_PAYMENT → SENT → COMPLETED. Payer owns sent, recipient owns receipt; server timestamps/actors on each. Receipt transaction also evaluates batch completion. Out-of-order receipt fails. A duplicate confirmation returns existing fact without re-posting; wrong actor still denied. |
| P3 locks/corrections | Separate tests for temporary create/edit/delete rejection, cancel unlocking, one of multiple transfers completing without permanent lock, permanent immutability, backdated writes, moving into/out of locked dates, source edits versus batch start concurrency, next-open-period correction linked to immutable source. Corrections have signed payer/allocation effects summing consistently; never generic pooled contribution corrections. |
| P4 reference | Unique personal-space/source-expense/user reference; amount = user's authoritative share, source category inherited, private tags/note owned by user. Source edit updates view; soft delete excludes consumption but preserves reference history; permanent lock freezes financial content. No references from pooled mode or foreign currency. Source access rechecked; former/non-participant access does not leak source details. Settlements never become personal expense/income. |
| P5 occurrence | Stored EXPECTED → CONFIRMED / SKIPPED / CANCELED; UPCOMING/DUE/OVERDUE derived from due date and space timezone, never auto-paid. Unique commitment+due date; assigned user confirms, one formal contribution only. Amount schedule changes do not rewrite confirmed occurrences. |
| P5 balances | Confirm 1000 → book/available 1000. Advance 300 → book 1000/pending 300/available 700. Manager sends 300 → book 700/pending 0/available 700, sent-awaiting-receipt 300. Recipient confirms → money unchanged. Fund-paid 800 → book −100/available −100, expense accepted with shortfall. |
| P5 reimbursement/return | AWAITING_PAYMENT → SENT → COMPLETED, manager sent + advancing participant/return recipient received. Unique posting per entity+transition, actor/time immutable. Open expense edits reconcile pending reimbursement; sent financial facts cannot be rewritten, correction is a separate signed event. |
| P5 closing | ACTIVE → CLOSING → ARCHIVED. Resolve occurrences, reimbursements, shortfall before return plan; explicit recipients and amounts exactly equal remaining book balance, never automatic equal/proportional division. All sent returns lower book; receipt completes workflow. All receipts complete, book=0, pending=0 before archive. Concurrent return plans cannot double-distribute. |
| P6 composition | Personal: spending/categories only. Shared: user's pay/receive + period spend/batch. Pooled: book/pending/available/next occurrence/shortfall. No universal balance field; unauthorized and failed summaries never become zero. Actionable tasks scoped by actor; no permanent empty home panel. |
| P7 offline | Draft persists locally as NOT_SUBMITTED, no auto-replay on reconnect, no optimistic financial success. Online confirmation required. Locked draft preserved with explicit new-period correction, stale versions refresh state without losing input. Logout/account switching isolates private drafts; no API financial cache leakage. |

All mutation transactions serialize by group (shared governance) then space; personal mutations lock space only. Each confirmation has resource/action identity plus request idempotency key and payload digest. Same key/different body yields 409; same transition/same authorized actor returns existing confirmation even under a new key. Persist fact, posting, audit and response receipt atomically. Failure rolls all back. Test concurrent duplicates against real PostgreSQL, not only mocked transaction callbacks.

## Spec coverage ledger

| Spec sections | Coverage |
|---|---|
| Goal, Product Promise/Brand, Terminology | P1 neutral names; P6 寶箱 and preserved pixel identity, explicit user-confirmed copy; P7 public/docs copy |
| Information Architecture, Participants/Roles/Privacy | P1 scope/roles/effective intervals; P3/P5 resolved-obligation exits and nonempty archive; P6 context navigation |
| Home Experience, Status Cards, Global Quick Expense | P6; per-mode UI and formulas precede composition |
| Personal Expense Mode | P2; daily spending only |
| Shared Expense Mode, Shared Settlement Batches | P3; P4 private reference subfeature |
| Pooled Fund Mode, Commitments, Advances, Reimbursements, Closing | P5 |
| Categories/Tags | P2: 16 system categories, localized stable IDs; private/group scopes; recent/frequent/context/search/custom ranking; rename/merge/archive maintain analytic identity |
| Task Center | P5 exposes due/overdue and shortfall facts; P6 actor-scoped tasks, including materially overdue; no push |
| Editing/Locking/Audit/Offline | P1 atomic governance audit; P2 mutable expense audit; P3 locks; P5 confirmations; P7 drafts/reconciliation |
| Technical Architecture, Existing Conflicts | P1 core; three independent P2/P3/P5 services; P6 composition; P7 removal |
| Verification Strategy | Every phase baseline + PostgreSQL checks; P7 mandatory real backend/browser journeys at 320/390/768/1440 widths |
| Deferred Work | Remains excluded: personal income/accounts/budgets/investments, banking, pooled personal references, FX, push, OCR/AI, mode change after formal record |

## Verification and release gates

Backend working directory `backend/`: `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`. New real-DB suites run only with an explicitly provisioned loopback PostgreSQL database, e.g. database name `mimic_financial_spaces_test`, and no service overrides. Require the database suite to fail fast rather than skip when invoked without that environment.

Web working directory `web/`: `npm run lint`, `npm run typecheck`, `npm test`, `$env:MIMIC_API_BASE_URL='http://127.0.0.1:3101/api/v1'; npm run build`. Start API against isolated local DB on 3101; use `MIMIC_RUNTIME_ACCEPTANCE=1`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110`, `MIMIC_API_BASE_URL=http://127.0.0.1:3101/api/v1`; run `npm run test:e2e -- financial-spaces.runtime.spec.ts`. Existing `web/playwright.config.ts` has phone-small, phone, tablet, desktop projects and can supply viewport coverage. New acceptance must assert real responses and persisted records, with no route fulfillment mocking financial endpoints.

Final journeys: personal create/edit/category + no balance; shared multi-payer expense → private reference → cancel-before-send → restart → both confirmations → next-period correction; pooled commitment → self-confirm → advance/shortfall → additional funding → manager sent/participant received → explicit return plan and confirmations → archive. Include user outside box, group owner outside box, stale/conflicting request, offline draft and reconnect in browser coverage.

At each gate record exact command, exit, test counts, RED failure reason, and remaining limitations in devlog. Tests not run are not passing. Do not migrate staging/production, deploy, push or merge as part of implementation acceptance. Destructive P7 SQL is generated/reviewed and exercised only locally; external execution needs separate explicit authorization.

## Planning self-review

Reviewed all approved spec sections against the ledger. Corrected risks in the proposed staging: moved real personal bookkeeping into P2; kept private references behind shared locks; replaced ambiguous all-mode position service with separate formulas; separated governance-only projection; made P1 empty-only lifecycle scope explicit; prohibited number money contracts and permanent Fund mapping. Later phases are scoped work packages, not claimed implementation-complete plans. P1's exact implementation tasks are in `2026-09-11-financial-spaces-phase-1.md`.
