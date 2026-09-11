# P3 Shared Web and Browser Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This task is explicitly inline/sequential; do not dispatch subagents or ask again how to execute it.

**Goal:** Deliver the participant-private shared-expense Web journey, settlement controls, immutable correction and settled lifecycle UI, then prove it against the real task-local backend at phone, tablet and desktop widths.

**Architecture:** Add strict Zod wire contracts and thin CSRF-protected BFF routes over the existing `/api/v1` shared endpoints; accounting, authorization, period derivation and lifecycle eligibility remain exclusively in NestJS. A server-loaded `/app/spaces/[spaceId]` route renders a client shared workspace composed from small expense, settlement and lifecycle components, while group detail exposes only participant navigation and governance-safe metadata. Every money value remains a canonical decimal minor-unit string and uses `BigInt` helpers for validation, allocation and display; no legacy Fund adapter is introduced.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Vitest/Testing Library, Playwright, existing Mimic pixel primitives, NestJS/PostgreSQL authoritative API.

---

## Observed API contract and boundaries

- Space reads: `GET /groups/:groupId/spaces`, `GET /spaces/:spaceId`, `GET /spaces/:spaceId/participants`.
- Space mutations: `POST /groups/:groupId/spaces`, `POST /spaces/:spaceId/participants`, `PATCH /spaces/:spaceId/participants/:participantId/role`, `POST /spaces/:spaceId/participants/:participantId/end`, `POST /spaces/:spaceId/archive`.
- Expense reads/writes: `GET|POST /spaces/:spaceId/shared-expenses`, `GET /summary`, `GET|PATCH /:expenseId`, `POST /:expenseId/delete`.
- Settlement reads/writes: `GET|POST /spaces/:spaceId/shared-settlements`, `GET /:batchId`, `POST /:batchId/cancel`, `POST /:batchId/transfers/:transferId/sent|received`.
- Corrections: `GET /spaces/:spaceId/shared-corrections`, `POST /expenses`, `POST /transfers`.
- Participant financial routes return 404 after exit and to a group governor outside the box. Group-space listing may return the strict metadata-only `{ access: "GOVERNANCE", id, name, mode, status }` projection; the UI must never synthesize financial links or amounts from it.
- Expense row amounts and summary positions are canonical integer strings. Ordinary row amounts fit signed PostgreSQL bigint; aggregate/correction/transfer values may be wider. Version fields are safe positive integers and request IDs are UUIDs.
- `SHARED_PERIOD_LOCKED`, `SHARED_BATCH_PENDING`, `SHARED_BATCH_*_CONFLICT`, `SHARED_TRANSFER_*_CONFLICT`, `SPACE_VERSION_CONFLICT`, `SPACE_HAS_UNSETTLED_OBLIGATIONS` and `SPACE_HAS_UNFINALIZED_ACTIVITY` are authoritative conflicts; the browser refreshes without discarding safe form input.

## File map

- Create `web/src/shared/api/shared-finance-contracts.ts` and test: strict expense, summary, participant, batch, transfer, correction and paged response schemas.
- Modify `web/src/shared/api/financial-space-route.ts` and test: allow only the actual `cursor`/`limit` query keys on shared collection routes.
- Create BFF route handlers under `web/src/app/api/app/groups/[groupId]/spaces/` and `web/src/app/api/app/spaces/[spaceId]/`: one-line `forwardSpaceRoute` adapters for every observed route above.
- Create `web/src/features/shared-expenses/shared-queries.ts` and test: fail-closed server composition of space, participants, group members, taxonomy, expenses, summary, batches and corrections.
- Create `web/src/features/shared-expenses/shared-space-list.tsx`, `shared-space-form.tsx` and tests; modify group detail query/view/page to show participant links, governance-only cards and manager creation.
- Create `web/src/features/shared-expenses/shared-expense-form.tsx`, `shared-expense-list.tsx`, `shared-workspace.tsx` and tests: exact payer/allocation editor, positions and refresh/pagination state.
- Create `web/src/features/shared-settlements/settlement-panel.tsx`, `correction-form.tsx`, `shared-lifecycle-panel.tsx` and tests.
- Create `web/src/app/app/spaces/[spaceId]/page.tsx`, `loading.tsx`, and `web/src/features/shared-expenses/shared.css`.
- Create `web/e2e/shared-expenses.runtime.spec.ts`; use real API sessions and no `page.route`/financial response mocking.
- Update this plan, `.agents/features.md`, `.agents/devlog.md`; create `docs/superpowers/plans/2026-09-11-financial-spaces-phase-3-shared-web-execution.md`.

### Task 1: Strict shared contracts and BFF surface

- [ ] **Step 1: Write contract RED tests**

Create `web/src/shared/api/shared-finance-contracts.test.ts`. Assert that schemas accept representative backend projections, including `"9007199254740993"`, negative summary positions and batch snapshot payloads, and reject numeric money, `-0`, unknown fields, illegal transfer state/timestamps and malformed pagination.

- [ ] **Step 2: Run RED**

Run `npm test -- src/shared/api/shared-finance-contracts.test.ts` from `web/`. Expected: FAIL because `shared-finance-contracts.ts` does not exist.

- [ ] **Step 3: Implement minimal strict schemas**

Create `shared-finance-contracts.ts` with reusable `uuid`, `canonicalUnsigned`, `canonicalSigned`, `safeVersion`, and schemas matching these exact wire keys:

```ts
sharedExpense = expenseRecordSchema.extend({
  payers: z.array(amountRow).min(1).max(16),
  allocations: z.array(amountRow).min(1).max(16),
}).strict();
sharedMutation = z.object({ record: sharedExpense, change_minor: canonicalSigned,
  position_changes: z.array(signedAmountRow) }).strict();
sharedSummary = z.object({ space_id: uuid, mode: z.literal('SHARED_EXPENSES'),
  currency: currencySchema, space_version: safeVersion, spending_minor: canonicalSigned,
  positions: z.array(signedAmountRow) }).strict();
participant = z.object({ id: uuid, user_id: uuid, display_name: z.string().min(1),
  role: z.enum(['MANAGER','PARTICIPANT']), effective_from: z.iso.date(), effective_to: z.iso.date().nullable() }).strict();
transfer = z.object({ id: uuid, from_user_id: uuid, to_user_id: uuid,
  amount_minor: canonicalUnsigned, status: z.enum(['AWAITING_PAYMENT','SENT','COMPLETED']),
  version: safeVersion, sent_by: uuid.nullable(), sent_at: iso.nullable(),
  received_by: uuid.nullable(), received_at: iso.nullable() }).strict();
batch = z.object({ id: uuid, space_id: uuid, period_start: z.iso.date(), period_end: z.iso.date(),
  status: z.enum(['PENDING','COMPLETED','CANCELED']), version: safeVersion,
  snapshot: snapshotSchema, created_by: uuid, created_at: iso,
  completed_by: uuid.nullable(), completed_at: iso.nullable(),
  canceled_by: uuid.nullable(), canceled_at: iso.nullable(), transfers: z.array(transfer) }).strict();
```

Add `superRefine` state consistency checks for transfer sent/received facts and batch terminal facts. Export inferred types and strict paged list/correction schemas.

- [ ] **Step 4: Run GREEN**

Run the same focused test; expected PASS.

- [ ] **Step 5: Add BFF RED route tests**

Create `web/src/app/api/app/shared-routes.test.ts`. Import each route handler, mock `forwardAppRoute`, and assert exact upstream path, UUID rejection, CSRF forwarding and only `cursor`/`limit` query forwarding. Include expense detail/delete, summary, participants/end/archive, settlement detail/cancel/sent/received and correction collection routes.

- [ ] **Step 6: Run RED and implement routes**

Run `npm test -- src/app/api/app/shared-routes.test.ts`; expected missing module/handler failures. Add the thin route files and extend `financial-space-route.ts` so shared expense, settlement and correction collections accept only `cursor` and `limit`; unexpected query keys return `INVALID_QUERY`.

- [ ] **Step 7: Run GREEN and commit**

Run both Task 1 test files. Commit only contracts/routes/tests:

```text
feat(web): add strict shared finance boundary
```

### Task 2: Shared box discovery, creation and private entry

- [ ] **Step 1: Write server-query RED tests**

Create `web/src/features/shared-expenses/shared-queries.test.ts`. Mock `authenticatedServerApi` and assert:

- group discovery accepts participant and governance projections but selects no governance item as a financial detail;
- direct detail loads space first, rejects non-shared modes, then loads participants, group detail/members, taxonomy, expense page, summary, batches and corrections;
- any malformed or failed financial response rejects the whole composition rather than substituting zero/empty values;
- invalid UUID and former-participant 404 remain 404.

- [ ] **Step 2: Run RED**

Run `npm test -- src/features/shared-expenses/shared-queries.test.ts`; expected missing module failure.

- [ ] **Step 3: Implement fail-closed queries**

Create `shared-queries.ts` with `listGroupSharedSpaces(groupId)` and `loadSharedWorkspace(spaceId)`. Parse every response using Task 1 schemas and existing `groupDetailSchema`, `memberSchema`, `taxonomyTermSchema`, and `financialSpaceSchema`. Load independent reads with `Promise.all` only after the participant detail establishes `group_id` and shared mode.

- [ ] **Step 4: Run GREEN**

Run the query test; expected PASS.

- [ ] **Step 5: Write shared-space list/form RED tests**

Create `shared-space-list.test.tsx` and `shared-space-form.test.tsx`. Assert participant cards link to `/app/spaces/:id`; governance cards show name/mode/status without currency, roles, participants, amount, action or financial link; only a group member may open create; create sends `{ name, mode:'SHARED_EXPENSES', currency, request_id }`, reuses the request UUID after uncertain retry, and navigates to the returned participant projection.

- [ ] **Step 6: Run RED and implement UI**

Run the two tests; expected missing component failures. Create the components, add the group-space BFF route, extend `GroupDetailPage` reads with `listGroupSharedSpaces`, and add `SharedSpaceList` to `GroupDetailView`. Keep Funds untouched and do not map them to boxes.

- [ ] **Step 7: Run GREEN and commit**

Run group query/view regression tests plus new tests. Commit:

```text
feat(web): open participant-private shared boxes
```

### Task 3: Exact shared expense editor, list and positions

- [ ] **Step 1: Write exact amount/allocation RED tests**

Create `web/src/features/shared-expenses/shared-money.test.ts` for pure helpers. Required examples:

```ts
expect(sumMinor(['9007199254740993', '7'])).toBe('9007199254741000');
expect(equalAllocations('100', ['b','a','c'])).toEqual([
  { user_id:'a', amount_minor:'34' }, { user_id:'b', amount_minor:'33' }, { user_id:'c', amount_minor:'33' }
]);
expect(() => sumMinor(['1.2'])).toThrow();
```

No helper may call `Number`, `parseInt`, `parseFloat`, unary `+`, or floating arithmetic on money.

- [ ] **Step 2: Run RED, implement and run GREEN**

Create `shared-money.ts` with canonical string/`BigInt` addition, deterministic equal remainder allocation, exact major/minor conversion through the existing currency helper and display through `formatMinorUnit`. Run the focused test to PASS.

- [ ] **Step 3: Write expense form RED tests**

Create `shared-expense-form.test.tsx`. Cover single/multiple payer rows, EQUAL and explicit allocation modes, each side summing exactly to total, duplicate/missing participant errors, effective-date eligibility, huge exact values, offline no-post, same UUID retry, edit version conflict preserving inputs, and pending/permanent lock messages derived from `AppClientError.code`.

- [ ] **Step 4: Run RED and implement form**

Run the form test; expected missing component failure. Create `shared-expense-form.tsx`, reuse `TaxonomyPicker`, `PixelField`, `PixelButton` and `useOnline`. Build canonical payloads only after string validation:

```ts
{
  amount_minor, occurred_on, title, note, category_id, tag_ids,
  payers: [{ user_id, amount_minor }],
  allocations: [{ user_id, amount_minor }],
  request_id,
  ...(record ? { version: latestVersion } : {})
}
```

Map `SHARED_PERIOD_LOCKED` to a correction invitation, version conflicts to refresh/review, and uncertain failures to safe retry copy. Never claim transfer verification by a bank.

- [ ] **Step 5: Write workspace/list/summary RED tests**

Create `shared-workspace.test.tsx`. Assert zero/positive/negative current-user positions display as settled/receive/pay, all participant names resolve without leaking group nonparticipants, empty/loading/error/stale pagination states are explicit, and stale `space_version` discards appended pages and refreshes authoritative first pages. Assert participant can create/edit own-created expense, manager can edit any, and unauthorized actions are absent.

- [ ] **Step 6: Run RED and implement workspace**

Create `shared-expense-list.tsx` and `shared-workspace.tsx`; create the route page and `loading.tsx`. Refresh all financial panels after a mutation and retain prior authoritative values on refresh failure with `role="alert"` plus retry. Use stable member display names and exact format helpers.

- [ ] **Step 7: Run GREEN and commit**

Run all shared expense tests and personal expense regressions. Commit:

```text
feat(web): manage exact shared expenses and positions
```

### Task 4: Settlement batches and two-party confirmation

- [ ] **Step 1: Write settlement RED tests**

Create `web/src/features/shared-settlements/settlement-panel.test.tsx`. Assert manager-only start/cancel, period-end input, pending/completed/canceled lists and detail, transfer direction/name/amount, payer-only “確認已付款”, recipient-only “確認已收款”, user-confirmed-not-bank-verified copy, and no receive action before SENT. Assert same request UUID retry and versions use batch version for cancel and transfer version for confirmations.

- [ ] **Step 2: Run RED**

Run the test; expected missing component failure.

- [ ] **Step 3: Implement minimal settlement panel**

Create `settlement-panel.tsx`. Parse every mutation response with `sharedBatchSchema`; replace the matching batch atomically. Use `PixelDialog` for start/cancel/confirmation, keep high-impact actions disabled offline/busy, and show actionable error text for pending batch, invalid period, cancel-after-send, stale batch/transfer, wrong actor and uncertain results.

- [ ] **Step 4: Run GREEN**

Run the focused test and shared workspace integration test; expected PASS.

- [ ] **Step 5: Add lock conflict integration RED tests**

Extend `shared-workspace.test.tsx`: an expense save receiving `SHARED_PERIOD_LOCKED` preserves fields, shows whether a pending batch may be canceled by a manager, and offers immutable correction only for completed-period sources; after refresh, no stale edit/delete action silently retries.

- [ ] **Step 6: Implement and verify GREEN**

Wire settlement state into the workspace conflict presentation and rerun the two focused suites.

- [ ] **Step 7: Commit**

```text
feat(web): confirm shared settlement batches
```

### Task 5: Immutable corrections and settled lifecycle

- [ ] **Step 1: Write correction RED tests**

Create `correction-form.test.tsx`. Assert source ID/revision are immutable, date must be in the open period, reason is required, expense correction edits the full target amount/payers/allocations, and zero target sends `amount_minor:'0'` with empty sides. Retry reuses UUID; stale source revision refreshes while retaining proposed target/reason. Include transfer correction using `actual_amount_minor` canonical string.

- [ ] **Step 2: Run RED, implement and run GREEN**

Create `correction-form.tsx`, wire it only from immutable source expense/transfer detail, parse `sharedCorrectionSchema`, refresh lists/summary after success, and pass the focused test.

- [ ] **Step 3: Write lifecycle/permission RED tests**

Create `shared-lifecycle-panel.test.tsx`. Cover:

- manager can add a current group member by `user_id`, delegate manager role, end another settled participant and archive a fully settled box;
- participant may end self only and cannot see manager controls;
- group governor projection has no component entry to financial reads;
- former participant gets the route-level read failure after exit;
- exit/archive conflicts show unresolved transfer, nonzero position or unfinalized-activity guidance;
- stale `SPACE_VERSION_CONFLICT` refreshes the space/participants and retains the selected target;
- successful archive disables all write controls.

- [ ] **Step 4: Run RED and implement lifecycle panel**

Create `shared-lifecycle-panel.tsx`. Use space version on participant add/role/end/archive; refresh detail after every mutation because each successful lifecycle write increments it. Exact-name confirmation is required for archive. Add-participant choices come only from active group members not currently participating.

- [ ] **Step 5: Run GREEN and commit**

Run correction, lifecycle, group list and workspace suites. Commit:

```text
feat(web): close settled shared boxes safely
```

### Task 6: Responsive pixel-world and accessibility acceptance

- [ ] **Step 1: Write visual behavior RED tests**

Add component assertions and `web/e2e/shared-expenses.runtime.spec.ts` geometry helpers for:

- 320x720, 390x844, 768x1024 and 1440x900 have `scrollWidth <= innerWidth`;
- payer/allocation grids stack on phones and use aligned columns at tablet/desktop;
- every interactive target has at least 44px height or an equivalent padded hit area;
- opening dialog focuses inside it, Tab stays unobscured, Escape/close restores trigger focus;
- dialog width stays centered and height `<= viewport - 32px`, with internal scrolling;
- loading UI contains no fabricated totals; empty/error states identify the next action; `prefers-reduced-motion` removes nonessential transitions.

- [ ] **Step 2: Run RED**

Run shared component tests and Playwright in one viewport against a development server; expect missing selectors/layout assertions to fail before CSS.

- [ ] **Step 3: Implement scoped CSS**

Create `shared.css` using existing brand tokens and primitives. Keep the signature element a “settlement trail” connecting payer → recipient states; surrounding cards remain quiet. Use CSS grid/minmax, logical properties, safe-area padding, `overflow-wrap:anywhere`, visible `:focus-visible`, and reduced-motion query. Do not introduce remote fonts, emoji icons, raw one-off palette or animation dependencies.

- [ ] **Step 4: Run GREEN**

Run the component suites and all four Playwright projects once the real runtime in Task 7 is available; expected all geometry/focus assertions PASS.

- [ ] **Step 5: Commit**

```text
style(web): finish responsive shared expense workspace
```

### Task 7: Real backend browser journey, documentation and final gate

- [ ] **Step 1: Write the real journey before changing runtime helpers**

Complete `shared-expenses.runtime.spec.ts` using `uniqueAccounts`, `signInWithApiSession` and separate browser contexts. It must reject non-loopback `MIMIC_API_BASE_URL` and must not call `page.route`, `route.fulfill`, mock financial fetches or import service mocks.

The scenario must:

1. Register owner, participant and outsider; owner creates a group and participant joins through the real invite flow/API.
2. Owner creates a SHARED_EXPENSES box in the Web UI and adds participant.
3. Participant navigation opens the box; outsider and group-owner-governor-without-participation financial reads return 404 and bodies contain no amount/note.
4. Create A-paid 1000 with A/B allocations 400/600 using UI; reload and assert positions A `+600`, B `-600` from backend strings.
5. Manager starts batch; assert included period/snapshot and edit/delete/create inside pending period conflict without losing form values.
6. B confirms sent; A confirms received in separate contexts; assert batch completed and positions both zero only after receipt.
7. Attempt locked source edit, then post next-open-period expense correction from UI as required; verify immutable original remains and new correction affects positions.
8. Settle any correction-created position with another batch/dual confirmation so participant exit becomes eligible.
9. Participant exits; former participant UI/API financial reads are denied. If manager exit would leave no manager, assert the guard.
10. Owner-manager archives the fully settled box; reload shows archived and no write actions. A group governor outside a separate box sees metadata only.

Additionally inject one stale version using a direct local API mutation and one repeated identical request ID; assert UI refresh/review and backend idempotency without duplicate expense/confirmation.

- [ ] **Step 2: Establish task-owned runtime**

Use only a new/confirmed loopback PostgreSQL database and schema. Record exact host, port, database and schema in the execution record. Run migrations/seed only against that URL. Start backend on a task-owned loopback port and Web on another task-owned loopback port with hidden processes/log files. Confirm `/api/v1/health` before Playwright. Never use staging/production URLs or credentials.

- [ ] **Step 3: Run browser RED and debug systematically**

Run the shared runtime spec first. For every unexpected failure, read and apply `superpowers:systematic-debugging`, reproduce the root cause, add/retain a focused failing regression, then make the smallest fix. Do not weaken assertions to match bugs.

- [ ] **Step 4: Run all viewport projects GREEN**

Run:

```powershell
$env:MIMIC_RUNTIME_ACCEPTANCE='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:<web-port>'
$env:MIMIC_API_BASE_URL='http://127.0.0.1:<api-port>/api/v1'
npm run test:e2e -- shared-expenses.runtime.spec.ts
```

Expected: shared journey passes phone-small, phone, tablet and desktop with real persisted responses.

- [ ] **Step 5: Run self-review**

Read and apply `superpowers:self-review`. Review all changed source and tests for exact-money handling, privacy, permissions, conflict recovery, idempotency, accessibility, responsive bounds and legacy leakage. Fix every critical/important finding with a demonstrated RED→GREEN regression.

- [ ] **Step 6: Run verification-before-completion**

Read and apply `superpowers:verification-before-completion`, then run fresh:

Backend from `backend/`:

```powershell
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
$env:DATABASE_URL='<explicit task-local loopback URL>'; npm run test:spaces-db
```

Web from `web/`:

```powershell
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL='http://127.0.0.1:<api-port>/api/v1'; npm run build
$env:MIMIC_RUNTIME_ACCEPTANCE='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:<web-port>'; npm run test:e2e -- shared-expenses.runtime.spec.ts
```

Record exact exit codes/counts and keep the known standalone `(public)/page_client-reference-manifest.js` ENOENT warning separate from failures.

- [ ] **Step 7: Update checkpoint records**

Mark this plan's completed boxes. Update `.agents/features.md` from P3 shared Web in-progress to done while leaving P4–P7 planned. Append `.agents/devlog.md` in the repository format. Create the execution record with RED evidence, commits, runtime ports/database/schema, test counts, self-review findings, known warning and explicit remaining phases.

- [ ] **Step 8: Commit records, stop processes and prove clean**

Commit documentation only:

```text
docs: record shared Web checkpoint verification
```

Stop only task-owned PostgreSQL/backend/Web processes. Run `git diff --check`, `git status --short --branch`, and `git log -8 --oneline`. Worktree must be clean. Do not merge, push or remove the worktree. Confirm original-root `.codex-remote-attachments/` and `reference/` were not touched.

## Plan self-review

- Spec coverage: shared create/select/private navigation, expense payer/allocation, exact positions, batch list/detail/start/cancel, two-party confirmation, pending/permanent locks, immutable corrections, settled exit/archive, four actor boundaries, fail-closed loading/empty/error/stale/retry and responsive/focus acceptance all map to Tasks 1–7.
- Deferred boundaries: P4 private shared references, P5 pooled funds, P6 global navigation/home/tasks, and P7 durable drafts/full three-mode cleanup remain explicitly excluded. This checkpoint does not add a Fund compatibility layer or claim full redesign completion.
- Type consistency: mutations use `request_id`; expense and participant/space operations use their owning versions; transfer actions use transfer version; batch cancel uses batch version. All money crosses contracts as canonical strings and only `BigInt` helpers calculate it.
- Placeholder scan: angle-bracket runtime ports/URL are execution-time values that must be recorded after task-owned services are provisioned; they are not product-code placeholders. Every product file, behavior, command and expected RED/GREEN outcome is named.
- Security: financial composition begins only after participant detail succeeds; governance projections never trigger financial requests. Former/nonparticipants get no cached or synthesized amounts.

