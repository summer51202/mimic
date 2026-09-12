# Financial Spaces Phase 5: Pooled Fund Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan sequentially in this task. The user already selected inline execution; do not pause for another execution choice.

**Goal:** Deliver a complete pooled-fund backend, Web workspace, and real-backend browser journey covering scheduled contributions, fund-paid and advanced expenses, reimbursements, explicit returns, participant exit, and archival.

**Architecture:** Add one `pooled-funds` aggregate beside—not on top of—the shared-expense modules. Neutral expense fields remain in `ExpenseRecord`, while pooled payment source, commitments, occurrences, contributions, reimbursements, corrections, return plans, transition postings, receipts, and projections are owned by the pooled module. Every mutation uses the existing group→space lock, authorizes before projecting or replaying, and atomically persists facts, audit, request receipt, and versions; all accounting stays bigint/NUMERIC(65,0) internally and canonical decimal strings on the wire.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL, TypeScript bigint, Jest/Supertest, Next.js 16 App Router/BFF, React 19, Zod, Vitest, Playwright, existing pixel-world primitives.

---

## Product and accounting contract

- A pooled commitment is a recurrence definition plus one amount assignment per selected current participant. Creation and schedule updates materialize persisted occurrences through an explicit bounded `generate_through` date; no background job or read request mutates money or occurrence state.
- Supported recurrences are `WEEKLY` and `MONTHLY`, with a positive interval, real `starts_on`, optional `ends_on`, and `generate_through <= min(ends_on, starts_on + 366 days)`. Monthly dates use the last real day when the anchor day does not exist. Equal `default_amount_minor` is applied first and optional per-user overrides replace it.
- Occurrences are unique by `(commitment_id, participant_user_id, due_on)` and persist only `EXPECTED`, `CONFIRMED`, `SKIPPED`, or `CANCELED`. `UPCOMING`, `DUE`, and `OVERDUE` are response-only timing derived from the space-local today. The assigned participant alone confirms or skips; a manager alone cancels. Confirmation creates exactly one formal contribution and one immutable confirmation posting.
- Pooled expenses use only `FUND_PAID` or `PARTICIPANT_ADVANCED`. A fund-paid expense reduces book balance immediately. An advance creates a one-to-one reimbursement in `AWAITING_PAYMENT`; it reserves available balance but does not change book balance. Open edits replace the pending amount atomically. Once reimbursement is sent, the source expense cannot be edited/deleted.
- Independent summary formula:

      book = confirmed contributions - active fund-paid expenses
             - reimbursements in SENT/COMPLETED
             - returns in SENT/COMPLETED + signed corrections
      pending = reimbursements in AWAITING_PAYMENT
      available = book - pending

  `sent_awaiting_receipt` is reported separately and is excluded from pending. Negative book/available remains valid and returns an explicit shortfall amount.
- Reimbursements and fund returns transition `AWAITING_PAYMENT -> SENT -> COMPLETED`. A current manager sends; the advancing participant or named return recipient receives. SENT changes book once; COMPLETED changes workflow/audit only. Transition postings are unique by entity/type/transition and preserve actor/time.
- Sent financial facts are immutable. A manager records a new signed pooled correction with a source reference and reason; no correction mutates the source expense, reimbursement, return, contribution, actor, or timestamp.
- Lifecycle is `ACTIVE -> CLOSING -> ARCHIVED`. Entering CLOSING requires no EXPECTED occurrence, no unresolved reimbursement, and no negative available/book shortfall. A manager creates at most one active return plan whose explicit positive recipient amounts exactly equal current positive book balance. Sent returns lower book; all receipts, book=0, and pending=0 are required for archive. Zero remaining book needs no return plan.
- A participant may leave only after their EXPECTED occurrences, reimbursements, and return receipts are resolved. Group governor, box manager, participant, former participant, and outsider projections remain distinct; financial routes return no facts unless current participation is established first.

## API boundary

All paths have `/api/v1/spaces/:spaceId/pooled-funds` prefix. IDs and `request_id` are UUIDs, versions are positive safe integers, dates are strict real `YYYY-MM-DD`, amounts are canonical integer strings, and DTO whitelisting rejects shared split/payer/allocation fields.

| Route | Actor | Request / result |
|---|---|---|
| `GET /workspace` | participant | summary, participants, commitments with occurrences, expenses/reimbursements, corrections, return plan |
| `POST /commitments` | manager | space version, recurrence, default amount, overrides, generate-through → commitment projection |
| `PATCH /commitments/:id` | manager | commitment version and mutable future schedule/amount fields → regenerated future EXPECTED occurrences only |
| `POST /occurrences/:id/confirm` | assigned participant | occurrence version → occurrence plus contribution |
| `POST /occurrences/:id/skip` | assigned participant | occurrence version → terminal skipped occurrence |
| `POST /occurrences/:id/cancel` | manager | occurrence version → terminal canceled occurrence |
| `POST /expenses` | participant | common expense fields, payment source, optional advance participant → expense/reimbursement |
| `PATCH /expenses/:id` | creator or manager | expense version and replacement common/payment facts while open |
| `POST /expenses/:id/delete` | creator or manager | expense version → soft-deleted open expense |
| `POST /reimbursements/:id/sent` | manager | reimbursement version → SENT |
| `POST /reimbursements/:id/received` | advancing participant | reimbursement version → COMPLETED |
| `POST /corrections` | manager | source kind/id, signed amount, date, reason → immutable correction |
| `POST /closing` | manager | space version → CLOSING space |
| `POST /return-plans` | manager | space version and explicit recipients/amounts → one plan with return rows |
| `POST /returns/:id/sent` | manager | return version → SENT |
| `POST /returns/:id/received` | recipient | return version → COMPLETED |
| `POST /archive` | manager | space version → ARCHIVED space |

Mutation responses include the current resource and exact pooled summary consequence. Reads use one RepeatableRead participant-authorized workspace query. Same request key/action/payload replays the saved response; the same key with another payload/action returns `409 IDEMPOTENCY_KEY_REUSED`. Repeating an already-applied authorized transition under a new key returns immutable existing facts without another posting/audit/version increment; wrong actors remain denied before either replay path.

## Files and responsibilities

Backend additions:

- `backend/prisma/migrations/20260912000200_pooled_funds/migration.sql` and `backend/prisma/schema.prisma`: enums, relations, constraints, partial unique return-plan index, occurrence/reimbursement/posting uniqueness, lifecycle state.
- `backend/src/modules/pooled-funds/dto/pooled-fund.dto.ts`: strict mutation/query DTOs.
- `pooled-values.ts`/`.spec.ts`: exact signed/unsigned parsing, real dates, recurrence materialization, derived timing, and summary arithmetic.
- `pooled-projection.ts`: string-money projections and Prisma include constants.
- `pooled-operations.service.ts`: lock, participant/manager/mode/lifecycle checks, canonical receipt hash, atomic audit/version helper.
- `pooled-commitments.service.ts`: create/update/materialize and occurrence transitions.
- `pooled-expenses.service.ts`: pooled expense CRUD, advance reconciliation, reimbursement transitions, immutable corrections.
- `pooled-closing.service.ts`: closing, explicit returns, confirmations, archive and participant-exit readiness.
- `pooled-queries.service.ts`: independent exact summary and participant-private workspace projection.
- `pooled-funds.controller.ts` and `pooled-funds.module.ts`: authenticated routes and dependency wiring.
- Modify `financial-spaces.service.ts`, `space-participants.service.ts`, `app.module.ts`, and DB fixture cleanup to delegate pooled lifecycle without changing personal/shared formulas.
- Add real HTTP and independent-connection suites: `pooled-commitments.e2e-spec.ts`, `pooled-expenses.e2e-spec.ts`, `pooled-lifecycle.e2e-spec.ts`, `pooled-concurrency.e2e-spec.ts`; include them in `jest-financial-spaces-db.json`.

Web additions:

- `web/src/shared/api/pooled-fund-contracts.ts`/`.test.ts`: strict discriminated Zod contracts and canonical money strings.
- `web/src/app/api/app/spaces/[spaceId]/pooled-funds/**/route.ts` plus `web/src/app/api/app/pooled-routes.test.ts`: thin UUID-validating CSRF/session BFF routes.
- `web/src/features/pooled-funds/pooled-queries.ts`, `pooled-money.ts`, forms/panels/workspace tests and implementation, and `pooled.css`: one participant-private responsive workspace.
- Modify `web/src/app/app/spaces/[spaceId]/page.tsx` and the existing group space list/create path to select and open `POOLED_FUND` without a Fund compatibility layer.
- Add `web/e2e/pooled-funds.runtime.spec.ts` using real API responses only.

## Sequential TDD tasks

### Task 1: Exact domain values and persistence

- [x] Write failing pure tests for canonical bigint parsing (including beyond `2^53`), signed corrections, recurrence date generation, month-end/leap-year behavior, one-year bound, and timezone-derived occurrence timing. Run the focused Jest file and record the expected missing-module/assertion RED.
- [x] Write a failing migration contract for every new enum/table/relation/index/check and for `FinancialSpaceStatus.CLOSING`; verify the task-local schema lacks the tables.
- [x] Add the Prisma models/migration and minimal pure helpers; generate the client, deploy to explicit loopback schema `phase2`, install all migrations on fresh `phase5_fresh`, seed twice, and rerun focused tests GREEN.
- [x] Commit `feat: persist pooled fund accounting`.

### Task 2: Commitments and occurrence state machine

- [x] Write failing DTO/policy tests for strict recurrence fields, equal defaults/overrides, current-participant assignment, unique occurrence keys, and rejected money/date/foreign fields.
- [x] Add real HTTP REDs for manager create/update, persisted occurrences, assigned self-confirm, one contribution only, assigned skip, manager cancel, wrong actor, out-of-order/duplicate/stale transition, request replay/conflict, and confirmed occurrence immutability under schedule changes.
- [x] Implement the operation runner, projections, commitment materialization, terminal transitions, posting/audit/receipt transaction, and first-formal-record latch. Rerun focused unit and DB suites GREEN.
- [x] Commit `feat: schedule pooled contributions`.

### Task 3: Pooled expenses and independent summary

- [ ] Write failing exact summary tests for the roadmap oracle: confirm 1000; advance 300; fund-paid 800; negative available/shortfall; extra contribution; and no expected money in totals.
- [ ] Add HTTP REDs for both payment sources, participant-advanced actor validation, forbidden shared allocation fields, category/tags, list/detail projection, negative balance acceptance, creator/manager open edits/deletes, and pending reimbursement replacement.
- [ ] Implement pooled expense CRUD and the RepeatableRead workspace/summary query without importing shared-accounting, settlements, contributions, or Fund normalization. Keep all API money as strings.
- [ ] Commit `feat: record pooled expenses and balances`.

### Task 4: Reimbursement confirmations and immutable corrections

- [ ] Add REDs for manager-only SENT, advancing-participant-only RECEIVED, out-of-order/wrong actor, duplicate/new-key repeat, stale version, payload conflict, unique transition posting, immutable actor/time, and exact book/pending/available consequences.
- [ ] Add concurrency and rollback REDs using two Prisma clients and temporary task-local CHECK constraints for duplicate sends/receipts, edit-vs-send, audit failure, and receipt failure.
- [ ] Add REDs proving a SENT/COMPLETED source cannot be edited and a new signed correction adjusts book once without rewriting source facts.
- [ ] Implement reimbursement transitions, posting uniqueness, correction API, and atomic audit/receipt behavior; run focused DB suites GREEN.
- [ ] Commit `feat: confirm pooled reimbursements`.

### Task 5: Closing, explicit returns, exit, and archive

- [ ] Add lifecycle REDs for `ACTIVE -> CLOSING -> ARCHIVED`, unresolved EXPECTED/reimbursement/shortfall guards, zero-balance closing, explicit return totals, no automatic recipient computation, single active plan, manager SENT, recipient RECEIVED, and archive prerequisites.
- [ ] Add actor/privacy REDs for participant, manager, group governor outside the box, outsider, and former participant; assert rejected bodies contain no currency, balance, expense, note, commitment, reimbursement, or return facts.
- [ ] Add independent-connection REDs for competing return plans, send/plan, final receipts/archive, and participant-exit races; verify no double distribution.
- [ ] Implement pooled lifecycle delegation in financial-space archive and participant end, return transitions/postings, and immutable projection. Rerun focused suites GREEN.
- [ ] Commit `feat: close pooled funds safely`.

### Task 6: Strict Web contracts and BFF routes

- [ ] Write failing Zod tests for every workspace/resource variant, canonical signed/unsigned money, derived timing, shortfall, lifecycle and malformed/float rejection.
- [ ] Write failing BFF tests for all routes, UUID paths, CSRF/session forwarding, same request UUID reuse by retry, and upstream stale/idempotency errors.
- [ ] Implement strict contracts, queries and thin routes; run focused Vitest suites GREEN.
- [ ] Commit `feat(web): add pooled finance boundary`.

### Task 7: Responsive pooled workspace

- [ ] Use `frontend-design` and `ui-ux-pro-max` before UI implementation. Write failing component tests for box creation/opening, manager schedule/override editing, participant occurrence actions, pooled expense source selection, advance participant, exact balance cards, shortfall warning, reimbursement actions, closing/return/archive, and role-specific visibility.
- [ ] Add failure-state REDs for loading, empty, error, offline prevention, stale-version refresh with preserved safe input, same UUID retry, focus restoration, keyboard operation, action wrapping, dialog bounds and no horizontal overflow.
- [ ] Implement the minimal pixel-world workspace using existing typography, buttons, dialogs, tickets, coin/vault motifs and responsive primitives; never add pooled expenses to personal records.
- [ ] Run focused and full Web component tests GREEN.
- [ ] Commit `feat(web): manage pooled fund journeys`.

### Task 8: Real-backend browser acceptance

- [ ] Add one Playwright journey with no `page.route`, `route.fulfill`, or financial mocks: create pooled box; add participant; create/materialize commitment; assigned self-confirm; verify summary; add advance and fund-paid shortfall; add contribution; send/receive reimbursement; resolve occurrences; close; create explicit return; send/receive; reach zero; settled participant exits; archive; former/governor/outsider financial reads denied.
- [ ] Exercise `320x568`, `390x844`, `768x1024`, and `1440x900`; assert keyboard reachability, focus restoration, dialog containment, action wrapping and no horizontal overflow.
- [ ] Run only task-owned PostgreSQL `127.0.0.1:55439` schema `phase2`, API `127.0.0.1:3101`, and Web `127.0.0.1:3110`. Use systematic debugging for every unexpected RED until 4/4 GREEN.
- [ ] Commit `test: cover pooled fund browser lifecycle`.

### Task 9: Review, documentation, verification, and cleanup

- [ ] Run `self-review` over every P5 production function and state/authorization path; create regression REDs for all critical/important findings, fix them, and rerun affected suites.
- [ ] Check every requirement above, remove placeholders, verify backend/Web type-name symmetry, mark this plan's completed boxes, update `.agents/features.md`, append `.agents/devlog.md`, and add `2026-09-12-financial-spaces-phase-5-pooled-funds-execution.md` with exact evidence and remaining P6/P7 work.
- [ ] Run backend `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, and explicit task-local `npm run test:spaces-db`.
- [ ] Run Web `npm run lint`, `npm run typecheck`, `npm test`, production build with `MIMIC_API_BASE_URL=http://127.0.0.1:3101/api/v1`, and the real-backend pooled Playwright suite.
- [ ] Stop only task-owned PostgreSQL/API/Web processes, run `git diff --check`, confirm the worktree is clean, and preserve root `.codex-remote-attachments/` and `reference/` unchanged. Commit `docs: record pooled fund checkpoint verification`.

## Plan self-review

Every P5 requirement maps to a task: persisted/derived occurrence states and schedule immutability (Tasks 1–2), independent money and negative shortfall (Task 3), two-party reimbursements and immutable corrections (Task 4), lifecycle/returns/exit/privacy/concurrency (Task 5), strict BFF and responsive Web states (Tasks 6–7), and the full real-backend journey (Task 8). No expected amount enters accounting; no shared position/batch formula or legacy Fund adapter is referenced. The bounded explicit generation horizon prevents hidden schedulers and infinite materialization while preserving recurrence semantics. All transition and money-changing facts have a single actor/time/posting, receipt digest, version check and atomic audit path. P6 navigation/home/quick-entry/tasks and P7 durable drafts/legacy cleanup/full three-mode acceptance remain outside this checkpoint.
