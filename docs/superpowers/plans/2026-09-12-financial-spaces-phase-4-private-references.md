# Financial Spaces Phase 4: Private Shared-Expense References

> **Status:** approved product design exists; execute this checklist in this task with strict RED -> GREEN.
>
> **Scope:** P4 only. Link an authoritative shared expense into one participant's personal ledger without copying a financial transaction. Do not add Fund compatibility, pooled references, navigation/task redesign, drafts, or cleanup outside the touched paths.

## Product contract

- A current participant may add only their own allocation from an active `SHARED_EXPENSES` record to an active, owned `PERSONAL_EXPENSES` space with the same currency.
- The reference is private to its owner. Its private tags and private note live in the personal scope; shared participants, shared managers, and group governors cannot read them.
- The personal month read model derives title, occurrence date, canonical source category, currency, and allocated amount from the source expense. It never creates a second `ExpenseRecord` and never treats settlement transfers as spending or income.
- Ordinary source edits flow through to the reference while the source period is editable. A completed batch permanently locks the unchanged source facts. A later immutable correction remains its own shared-period transaction and does not rewrite the old personal reference.
- A soft-deleted source and a source no longer accessible to the owner are excluded from personal consumption while the private reference row remains as history. Rejoining may restore the view if the source still exists.
- `POOLED_FUND`, foreign-currency, non-participant, former-participant, governance-only, and zero/absent-allocation sources are rejected without leaking source details.
- Reference create/update/remove are versioned, audited, idempotent by request UUID, serialized with both source and destination space locks, and use canonical minor-unit decimal strings on the wire. No `Number`/float money conversion is permitted.

## API and read-model shape

- `POST /api/v1/spaces/:personalSpaceId/personal-references`
  - body: `request_id`, `source_expense_id`, optional `tag_ids`, optional `note`
- `PATCH /api/v1/spaces/:personalSpaceId/personal-references/:referenceId`
  - body: `request_id`, `version`, optional `tag_ids`, optional `note`
- `POST /api/v1/spaces/:personalSpaceId/personal-references/:referenceId/remove`
  - body: `request_id`, `version`
- Personal month `items` becomes a discriminated union:
  - `MANUAL`: existing personal `ExpenseRecord` projection plus resolved `category_name`
  - `SHARED_REFERENCE`: private reference id/version/metadata plus authorized source ids, source title/date/category, owner allocation string, and `source_locked`
- Personal month category rows include `category_name`; pagination remains a stable descending `(occurred_on, id)` merge across manual and referenced entries.

## Task 1 — Persist private references, receipts, and audits

- [x] Add RED migration-contract/schema tests for private reference ownership, unique `(personal_space_id, source_expense_id, owner_user_id)`, private tags, soft status/version, dedicated request receipts, relations, indexes, and audit actions.
- [x] Add Prisma enums/models/relations and migration `20260912000100_personal_shared_references`.
- [x] Generate the Prisma client and run the focused migration contract tests GREEN.
- [x] Commit: `feat: persist private shared expense references`

Files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260912000100_personal_shared_references/migration.sql`
- `backend/prisma/migrations/migration-contract.spec.ts`

## Task 2 — Define exact reference DTOs and pure projection rules

- [x] Add RED DTO tests for UUID request/source ids, versions, note length, tag uniqueness/count, whitelist behavior, and no client-supplied money/source content.
- [x] Add RED pure unit tests for authoritative owner-allocation selection, zero/absent allocation rejection, exact bigint delta math, canonical category projection, source-lock flag, and stable cross-kind sort/cursor behavior.
- [x] Implement the smallest DTO, types, and pure helpers to make the tests GREEN.
- [x] Commit: `feat: define private reference contracts`

Files:

- `backend/src/modules/personal-expenses/dto/personal-reference.dto.ts`
- `backend/src/modules/personal-expenses/dto/personal-reference.dto.spec.ts`
- `backend/src/modules/personal-expenses/personal-reference-policy.ts`
- `backend/src/modules/personal-expenses/personal-reference-policy.spec.ts`
- `backend/src/modules/expense-records/expense-records.types.ts`

## Task 3 — Implement locked, idempotent private-reference mutations

- [x] Add RED service/e2e tests for create, exact retry replay, request-id payload conflict, same-currency and mode checks, owned-active personal destination, active source, current shared participation, positive owner allocation, private taxonomy validation, uniqueness/reactivation, stale reference version, update, remove, and audit/space-version effects.
- [x] Add concurrency tests proving duplicate create/retry does not double-write, same-version update/remove cannot both commit, and source participant exit cannot race authorization.
- [x] Add a deterministic pair-lock path: shared group/source first, then personal taxonomy/destination; re-run both authorizations inside the transaction.
- [x] Implement `PersonalReferencesService`, controller routes, module wiring, dedicated receipt replay, audit snapshots that contain private data only in the personal space, and first-formal-record latching.
- [x] Keep failures non-enumerating (`SOURCE_EXPENSE_NOT_FOUND` or destination-scoped errors) and never return shared source details to former/non-participants.
- [x] Run focused unit, ordinary e2e, and task-local PostgreSQL suites GREEN.
- [x] Commit: `feat: manage private shared expense references`

Files:

- `backend/src/modules/personal-expenses/personal-references.service.ts`
- `backend/src/modules/personal-expenses/personal-expenses.controller.ts`
- `backend/src/modules/personal-expenses/personal-expenses.module.ts`
- `backend/src/modules/taxonomy/taxonomy.service.ts`
- `backend/test/personal-references.e2e-spec.ts`
- `backend/test/personal-references-concurrency.e2e-spec.ts`
- `backend/test/jest-financial-spaces-db.json`

## Task 4 — Join authorized references into personal month reads

- [x] Add RED query/e2e tests for mixed manual/reference totals, source category inheritance and canonical merge, private tags/note, source-edit follow-through, completed-period immutability, source soft-delete exclusion with retained history, former-participant denial/omission, settlement exclusion, and no pooled/foreign references.
- [x] Add RED pagination tests across same-day manual/reference rows, invalid cursors, page continuity, and cross-space `view_version` stale-page recovery.
- [x] Implement one RepeatableRead read model that rechecks current source participation, merges both entry kinds by `(occurred_on, id)`, totals bigint allocations, and returns canonical decimal strings plus category names.
- [x] Ensure archived personal spaces remain readable and reference history contributes to `SPACE_HAS_FINANCIAL_HISTORY`.
- [x] Run focused unit, ordinary e2e, and task-local PostgreSQL suites GREEN.
- [x] Commit: `feat: include shared references in personal spending`

Files:

- `backend/src/modules/personal-expenses/personal-expense-queries.service.ts`
- `backend/src/modules/personal-expenses/personal-reference-projection.ts`
- `backend/src/modules/financial-spaces/financial-spaces.service.ts`
- `backend/test/personal-references.e2e-spec.ts`
- `backend/test/personal-expenses.e2e-spec.ts`

## Task 5 — Add strict Web/BFF contracts

- [x] Add RED Zod tests for the discriminated personal-month entries, nonnegative reference allocation strings, category labels, strict mutation response, lock flag, and malformed/float rejection.
- [x] Add RED BFF route tests for create/update/remove forwarding, UUID path validation, CSRF/auth behavior, and upstream error preservation.
- [x] Implement strict contracts and thin BFF routes following the existing personal/shared route pattern.
- [x] Update personal/shared server queries to load only the owned personal boxes and private tags required by the current participant.
- [x] Run focused Web tests GREEN.
- [x] Commit: `feat: expose private references through Web BFF`

Files:

- `web/src/shared/api/personal-expense-contracts.ts`
- `web/src/shared/api/personal-expense-contracts.test.ts`
- `web/src/app/api/app/spaces/[spaceId]/personal-references/route.ts`
- `web/src/app/api/app/spaces/[spaceId]/personal-references/[referenceId]/route.ts`
- `web/src/app/api/app/spaces/[spaceId]/personal-references/[referenceId]/remove/route.ts`
- `web/src/app/api/app/personal-reference-routes.test.ts`
- `web/src/features/shared-expenses/shared-queries.ts`
- `web/src/features/personal-expenses/personal-queries.ts`

## Task 6 — Add the shared-expense opt-in flow

- [x] Add RED component tests for eligibility by current-user allocation, matching owned personal boxes, destination selection, private tags/note, empty destination guidance, loading/offline disablement, focus return, retry with the same UUID, stale/conflict reload, and no manager/governor privacy bypass.
- [x] Implement a compact pixel-world reference dialog/action in each eligible shared expense without changing shared financial facts.
- [x] Keep the action available on archived/locked shared sources when the personal destination is active; show permanent-lock context without implying editability.
- [x] Add responsive CSS tests/coverage for phone, tablet, and desktop dialog bounds and action wrapping.
- [x] Run focused Web tests GREEN.
- [x] Commit: `feat: add shared expense to personal ledger`

Files:

- `web/src/features/shared-expenses/shared-expense-list.tsx`
- `web/src/features/shared-expenses/shared-workspace.tsx`
- `web/src/features/shared-expenses/personal-reference-form.tsx`
- matching `*.test.tsx`
- `web/src/app/globals.css`

## Task 7 — Render and manage references in the personal ledger

- [x] Add RED component tests for source badge, authoritative amount/category, private tags/note, locked cue, manual-vs-reference actions, edit-private-metadata only, soft remove, stale reload, idempotent retry, source-disappeared refresh, empty/loading/error states, keyboard focus, and narrow layouts.
- [x] Implement discriminated rendering so manual records retain existing edit/delete forms while references expose only private metadata edit/remove actions.
- [x] Prefer backend-projected canonical `category_name`; never attempt to fetch group taxonomy from a former participant's browser.
- [x] Run focused Web tests GREEN.
- [x] Commit: `feat: show shared references in personal spending`

Files:

- `web/src/features/personal-expenses/personal-page.tsx`
- `web/src/features/personal-expenses/personal-reference-form.tsx`
- matching `*.test.tsx`
- `web/src/app/globals.css`

## Task 8 — Real-backend browser acceptance

- [x] Add a RED Playwright journey with no mocked financial responses: register two users, create/join group, create personal and shared boxes, add participant, create shared expense, add owner allocation to personal ledger, verify personal amount/category/private metadata, edit unlocked source and observe personal update, settle and lock, remove/re-add private reference as applicable, exit participant, and verify source details disappear/financial reads remain denied.
- [x] Prove settlement transfers never appear in personal consumption and a foreign-currency/pool source cannot be referenced.
- [x] Exercise phone `320x568` and `390x844`, tablet `768x1024`, and desktop `1440x900`; assert keyboard reachability, focus restoration, dialog bounds, and no horizontal overflow.
- [x] Start only an explicitly named task-owned loopback PostgreSQL database/schema and loopback API/Web processes; record ports/PIDs/logs outside versioned paths where practical.
- [x] Use systematic debugging for every unexpected failure and keep the journey GREEN.
- [x] Commit: `test: cover private reference browser journey`

Files:

- `web/e2e/real-backend-personal-references.spec.ts`
- `web/playwright.real-backend.config.ts` if configuration extension is necessary
- focused test helpers only when required

## Task 9 — Documentation, self-review, and checkpoint verification

- [x] Run self-review over the complete P4 diff; fix critical/important findings with RED regression tests and small commits.
- [x] Update this checklist, `.agents/features.md`, and `.agents/devlog.md`.
- [x] Add `docs/superpowers/plans/2026-09-12-financial-spaces-phase-4-private-references-execution.md` with API/data decisions, RED/GREEN evidence, browser coverage, task-local database identity, exact verification counts, known warning, and remaining phases.
- [x] Run backend verification from `backend/`:
  - `npm run build`
  - `npm test -- --runInBand`
  - `npm run test:e2e -- --runInBand`
  - `DATABASE_URL=<explicit task-local URL> npm run test:spaces-db`
- [x] Run Web verification from `web/`:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `MIMIC_API_BASE_URL=http://localhost:3000/api/v1 npm run build`
  - real-backend Playwright personal-reference acceptance
- [x] Stop task-owned PostgreSQL/API/Web processes, run `git diff --check`, verify `git status --short --branch` is clean, and preserve root `.codex-remote-attachments/` and `reference/` untouched.
- [x] Commit: `docs: record private reference checkpoint verification`

## Completion boundary

P4 is complete only when private references are authoritative, private, access-rechecked, retry-safe, responsive, and proven against the real backend. Overall financial-spaces work remains incomplete after this checkpoint: P5 pooled accounting, P6 navigation/tasks, and P7 drafts/cleanup/three-mode acceptance remain.
