# P7 Durable Offline Drafts, Legacy Fund Removal, and Three-Mode Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This task is explicitly inline and must not use subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the financial-spaces redesign with account/context-isolated durable expense drafts, complete removal of the disconnected legacy Fund product and persistence surface, and one real-PostgreSQL/browser acceptance suite proving all three modes and privacy actors.

**Architecture:** Expense drafts remain browser-local and are never cached, synchronized, or replayed by the service worker. A strict versioned draft envelope binds each payload and idempotency request UUID to the authenticated actor, optional group, space, mode, operation, resource version, and current space version; forms read only the exact current-context key after authoritative SSR/API access checks and require explicit review before retry. Legacy Fund controllers, Web BFF/routes/UI/contracts, old Prisma models, and tests are deleted; shared `FinancialSpace`, `ExpenseRecord`, taxonomy, group locks, and all personal/shared/pooled accounting modules remain authoritative.

**Tech Stack:** NestJS 10, Prisma 5/PostgreSQL 18, Next.js 16 App Router/BFF, React 19, Zod 4, Vitest/Testing Library, Jest/Supertest, Playwright 1.61.

---

## Storage, contract, and privacy boundaries

- `localStorage` is the only draft store. Keys are exact and non-enumerated: `mimic:expense-draft:v1:<actor UUID>:<space UUID>:<CREATE|UPDATE>:<new|resource UUID>`. An actor/space-scoped index contains only those exact suffixes so an authorized workspace can advertise its own drafts without reading another actor or space's payload.
- The strict envelope is `{ schema_version: 1, status: 'NOT_SUBMITTED', actor_user_id, group_id, space_id, mode, operation, resource_id, space_version, record_version, saved_at, request_id, fingerprint, payload }`. Unknown keys, unsafe numeric versions, non-UUID identities, number-valued money, mixed-mode fields, mismatched key/context, and malformed dates are rejected before any field is rendered.
- Draft payloads retain user input as strings. Financial conversion uses the existing exact `majorToMinorString`/`BigInt` path only at review/submit; no `Number` money arithmetic is introduced. Each valid payload fingerprint owns one durable `request_id`; changing payload creates a new UUID, while reload/retry reuses the prior UUID.
- Authoritative page loads re-check the current session, group membership, space participation, mode and status before draft code mounts. The draft layer additionally compares the envelope to those exact values. Former participants and outsiders receive the existing non-enumerating read failure and never reach draft lookup; governors receive metadata only. Archived/closing workspaces may show only a context-local “not writable” draft notice and discard action, not payload content or submit controls.
- Reconnect never triggers a write. Recovery has explicit `檢視草稿`, `重新送出草稿`, and `丟棄草稿` states. Stale space/record versions, changed participant eligibility, archived taxonomy, server validation, temporary/permanent settlement locks, and pooled closing/archive conflicts preserve the local envelope and explain the required refresh/correction/new-open-period action.
- Private `/app`, `/api`, invite, group, space and retired Fund paths remain `NetworkOnly`; no Background Sync, queue, financial response cache, or optimistic authoritative totals are added.

## File structure and legacy removal inventory

- Create `web/src/shared/drafts/expense-draft.ts`, `expense-draft.test.ts`: strict discriminated schemas, exact key/index storage, idempotency fingerprinting, corruption/quota handling, current-context validation, discard.
- Create `web/src/shared/drafts/use-expense-draft.ts`, `draft-recovery.tsx`, `drafts.css` and focused tests: manual review/retry/discard state and workspace-level blocked notice.
- Modify the three expense forms/workspaces and their tests; extract pooled `ExpenseForm` to `web/src/features/pooled-funds/pooled-expense-form.tsx` with tests.
- Modify `web/src/app/sw.ts`, `web/src/app/pwa-cache-policy.test.ts`, offline page and service-worker registration tests/copy to prove draft-only offline behavior and prohibit replay/cache.
- Delete Web legacy routes under `web/src/app/app/funds/`, `web/src/app/app/activity/`, `web/src/app/app/groups/[groupId]/funds/`; delete BFF routes under `web/src/app/api/app/funds/`, `groups/[groupId]/funds`, and `groups/[groupId]/dashboard`; delete `web/src/features/funds/`, `web/src/features/activity/`, `treasury-dashboard*`, and obsolete Fund E2E fixtures/specs.
- Modify `web/src/shared/api/domain-contracts.ts`, group queries/tests, route-boundary/app-route tests, monitoring fixtures and navigation/privacy tests to remove every Fund/dashboard/activity contract and prove retired URLs do not call upstream APIs or disclose identifiers.
- Delete backend legacy `funds`, `contributions`, `expenses`, and `settlements` modules plus `backend/test/fund-dashboard.e2e-spec.ts`; unregister them from `backend/src/app.module.ts`. Retain and Prisma-decouple the pure bigint `accounting-calculator`; delete only the dead Fund-specific settlement lock adapter.
- Modify `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, group archive/departure logic/tests, DB fixture cleanup, and add `backend/prisma/migrations/20260912000400_remove_legacy_funds/migration.sql`. Drop only legacy `funds`, `contributions`, `expenses`, `expense_payers`, `expense_splits`, `settlements`, `recurring_contribution_rules`, and legacy `categories`, their enum types and `audit_logs.fund_id`; retain group audit rows and all financial-space/new-mode tables.
- Create `backend/test/legacy-fund-removal.e2e-spec.ts` and extend explicit PostgreSQL schema tests to prove retired endpoints are 404, old tables are absent, current-mode tables remain, and group archive/leave still enforce space participation/lifecycle.
- Create `web/e2e/financial-spaces.runtime.spec.ts` and supporting real-API helpers only where reusable setup reduces duplication. It must not use `page.route`, `route.fulfill`, service overrides, or financial mocks.
- Update `README.md`, `AGENTS.md`, `.agents/features.md`, append `.agents/devlog.md`, and create `docs/superpowers/plans/2026-09-12-financial-spaces-phase-7-offline-legacy-acceptance-execution.md`.

### Task 1: Strict durable draft store

- [ ] **RED:** Add `expense-draft.test.ts` with actual `localStorage` cases for all three discriminants, reload persistence, exact actor/group/space/operation isolation, number-money rejection, unknown/mixed fields, corrupt JSON, storage failure, stale versions, index scoping, same-payload request UUID reuse and changed-payload UUID rotation. Run `npm test -- src/shared/drafts/expense-draft.test.ts`; expect module-not-found, then assertion failures for missing behavior.
- [ ] **GREEN:** Implement strict Zod schemas and storage functions. Representative API:

```ts
export type DraftContext = {
  actorUserId: string; groupId: string | null; spaceId: string;
  mode: 'PERSONAL_EXPENSES' | 'SHARED_EXPENSES' | 'POOLED_FUND';
  operation: 'CREATE' | 'UPDATE'; resourceId: string | null;
  spaceVersion: number; recordVersion: number | null; writable: boolean;
};
export function loadExpenseDraft(context: DraftContext): DraftLoadResult;
export function saveExpenseDraft(context: DraftContext, payload: ExpenseDraftPayload): DraftSaveResult;
export function discardExpenseDraft(context: DraftContext): void;
```

- [ ] **REFACTOR/GREEN:** Add the hook/recovery component tests for explicit review, no automatic callback on `online`, discard, blocked/stale labels, focus-safe controls, and a thrown `localStorage.setItem`. Implement the smallest hook/UI, run both draft suites GREEN, then commit `feat(web): add isolated durable expense drafts`.

### Task 2: Personal expense draft lifecycle

- [ ] **RED:** Extend `personal-expense-form.test.tsx` and `personal-page.test.tsx`: type a create/edit draft, unmount/remount, assert blank form plus recovery prompt; review restores exact strings/taxonomy; offline and failed submit persist; reconnect does not call fetch; manual retry reuses `request_id`; changed input rotates it; success/discard clears only this actor/space/resource; archived and record-version-stale drafts cannot submit. Confirm focused failures precede implementation.
- [ ] **GREEN:** Pass `actorUserId`, `groupId: null`, `spaceVersion`, and writable state from the authoritative personal page. Connect form state to the draft hook, retain existing conflict refresh, and map 400/403/404/409 into validation/access/stale/locked guidance without clearing input.
- [ ] **REGRESSION:** Run personal form/page, contract, exact-money, and BFF suites; commit `feat(web): recover personal expense drafts`.

### Task 3: Shared expense draft lifecycle and lock recovery

- [ ] **RED:** Extend shared form/workspace tests for complete payer/allocation/category/tag/note persistence, participant-ID changes, current-user/group/space/mode mismatch, pending/permanent settlement locks, archived space, former participant read failure, reload review, retry UUID reuse, discard, and no auto-submit. Confirm expected draft/recovery assertions fail.
- [ ] **GREEN:** Bind drafts to `group.current_user_id`, `group.id`, exact space and record. Before restoring, verify every payer/allocation is currently effective for the draft date and every taxonomy selection is still selectable; preserve but block an invalid draft. Refresh authoritative batches/participants after 409 and offer the existing source correction only for a real locked record; for an unsubmitted locked-date create, require moving to a new open date and explain that it cannot rewrite the settled period.
- [ ] **REGRESSION:** Run shared form/workspace/money/settlement focused suites; commit `feat(web): recover shared expense drafts safely`.

### Task 4: Pooled expense draft lifecycle

- [ ] **RED:** Extract-test a pooled expense form proving FUND_PAID and PARTICIPANT_ADVANCED drafts, participant eligibility changes, exact string money, reload review, offline/save failure, reconnect no replay, durable UUID retry, success/discard, and ACTIVE versus CLOSING/ARCHIVED behavior. Confirm module/assertion RED.
- [ ] **GREEN:** Move only pooled expense entry to `pooled-expense-form.tsx`, leaving commitment/confirmation/return flows online-only. Pass the current actor/group/space/version context, validate the named advancer is still effective, forward the durable request UUID through the existing BFF, clear after parsed success, and retain on every uncertain/server failure.
- [ ] **REGRESSION:** Run pooled workspace/form/contracts/BFF tests and all draft suites; commit `feat(web): recover pooled expense drafts safely`.

### Task 5: Offline shell, privacy, and stale-state acceptance

- [ ] **RED:** Extend service-worker/cache-policy and recovery component tests to assert private NetworkOnly coverage includes `/spaces`, retired Fund paths and Next private chunks; assert no Background Sync/queue/autopost; assert offline copy says drafts are device-local and not submitted; assert account/space switches cannot render another key's title/note.
- [ ] **GREEN:** Update only source service-worker/offline UI/recovery copy needed for those contracts. Do not generate or track `public/sw.js` outside the normal production build.
- [ ] **REGRESSION:** Run PWA/cache, auth/session, quick-expense, navigation, draft and all three form suites; commit `test(web): prove offline draft privacy boundaries`.

### Task 6: Remove legacy backend Fund aggregate

- [ ] **RED:** Add `legacy-fund-removal.e2e-spec.ts` asserting authenticated and anonymous old `/groups/:id/funds`, `/funds/:id`, summary, contribution, expense and settlement endpoints are all 404 with no old financial names/values. Extend the explicit-DB schema suite so it initially fails while legacy tables/types exist and also asserts `financial_spaces`, `expense_records`, shared settlement and pooled tables survive.
- [ ] **GREEN:** Add the destructive local migration, update Prisma relations/enums/seed, unregister and delete only the legacy modules, and remove legacy balance checks from group departure/archive after retaining the authoritative current-space participation and active-space guards. Update affected group/financial-space tests to the new no-Fund invariant.
- [ ] **REGRESSION:** Run `npx prisma generate`, `npx prisma validate`, backend build, focused group/legacy HTTP tests, and explicit loopback migration/schema suites. Confirm old routes 404 and new three-mode endpoints remain GREEN; commit `refactor: remove legacy fund aggregate`.

### Task 7: Remove legacy Web routes, BFF, contracts, UI, and fixtures

- [ ] **RED:** Add route/privacy tests for `/app/funds`, `/app/funds/:uuid`, `/app/activity`, `/app/groups/:uuid/funds/new`, and matching `/api/app` paths. They must prove the retired pages/routes are absent/not-found without invoking `authenticatedServerApi` and without echoing the UUID, upstream body, space names, or money. Add source scans failing on reachable legacy imports/navigation labels and strict contracts.
- [ ] **GREEN:** Delete the inventory listed above; remove dashboard/Fund/activity exports and group query callsites; trim tests/fixtures/monitoring examples; keep the generic private-path service-worker regex. Use framework not-found behavior (no replacement fetch and no compatibility redirect) for old bookmarks.
- [ ] **REGRESSION:** Run route-boundary, app-route, group, navigation, PWA and source-scan tests plus `rg` proof that no active Web production file imports legacy features or exposes retired BFF endpoints. Commit `refactor(web): remove legacy fund product`.

### Task 8: Full real-PostgreSQL three-mode browser acceptance

- [ ] **RED:** Create `financial-spaces.runtime.spec.ts` with a source assertion rejecting `page.route`, `route.fulfill`, financial mocks and service overrides. First assertions target durable draft recovery and retired URLs so the suite visibly fails before P7 behavior exists.
- [ ] **GREEN:** Against PostgreSQL `127.0.0.1:55439` schema `phase2`, API `3101`, and Web `3110`, create real accounts and use real HTTP/BFF/UI to cover PERSONAL_EXPENSES create/navigation/input/private ledger; SHARED_EXPENSES multi-payer/allocation, positions, settlement cancel/restart/send/receive/permanent lock/correction/private reference; POOLED_FUND commitment occurrence, self-confirmation, fund-paid/advance, reimbursement, negative shortfall/additional funding, returns and archive. Assert home projections/tasks and manager, participant, former participant, governor-nonparticipant, outsider privacy including SSR, BFF errors and old URLs.
- [ ] **GREEN:** In the same suite cover offline save, reload/reopen, reconnect review, retry with response-loss duplicate protection, discard, stale version, changed participant, archived/closing box, server validation and settled-period lock. Cover keyboard-only dialog operation, Escape/focus restoration, containment, action wrapping, loading/empty/error/offline/stale messaging and `scrollWidth <= clientWidth`.
- [ ] **REGRESSION:** Set Playwright projects to exactly `320x568`, `390x844`, `768x1024`, `1440x900`; run the new spec in all four projects with no interception. Commit `test(web): accept all financial space modes`.

### Task 9: Documentation, self-review, and fresh completion verification

- [ ] Update active `README.md`/`AGENTS.md`, mark P7 and beta acceptance truthfully in `.agents/features.md`, append the required `.agents/devlog.md` entry, and create the P7 execution record with each RED reason, GREEN command/count, runtime PIDs/data path, migration evidence, commits, self-review fixes and limitations.
- [ ] Use `self-review` across `209d261..HEAD`: inspect correctness, edge cases, completeness, architecture, style, security/privacy and test symmetry. Every Critical/Important finding gets a focused regression RED, observed failure, minimum GREEN, affected-suite rerun and separate fix commit; repeat until none remain.
- [ ] Use `verification-before-completion` and freshly run: backend `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, explicit `npm run test:spaces-db`; Web `npm run lint`, `npm run typecheck`, `npm test`, production build with `MIMIC_API_BASE_URL=http://127.0.0.1:3101/api/v1`; all four real-backend `financial-spaces.runtime.spec.ts` projects.
- [ ] Run `git diff --check`; record test counts/exits; verify the worktree is clean. Resolve listener ownership by command line/PID and stop only this task's API 3101, Web 3110 and PostgreSQL 55439; prove no listener remains. Re-check root `.codex-remote-attachments/` and `reference/` metadata and Git status. Do not merge, push, or remove the worktree.

## Plan self-review

- **Requirement and evidence coverage:** Tasks 1–5 cover durable local storage, strict contracts, all three expense modes, reload/reopen, manual review/retry/discard, idempotency, exact money, validation/access/status/lock conflicts, offline shell and context isolation. Tasks 6–7 contain an explicit backend/schema/Web/BFF/UI/test/fixture removal inventory plus old-URL privacy evidence. Task 8 contains every requested role, accounting transition, UI state, accessibility/overflow dimension and the exact four viewports against real services.
- **Data source and storage boundary:** Drafts never enter PostgreSQL or Cache Storage; only parsed current-context `localStorage` keys are read. Authoritative access and accounting always come from current server responses. The service worker remains NetworkOnly for all private data and never replays a draft.
- **Strict Web/BFF behavior:** Mode payload schemas reject mixed/unknown fields and number money. Existing create BFFs forward the durable UUID unchanged. No draft endpoint is introduced. Removed BFFs become framework 404 and never proxy legacy identifiers.
- **Privacy:** SSR/API authorization precedes draft mounting. Exact actor/group/space keys and no cross-context enumeration prevent UI disclosure. Former participants/outsiders cannot mount workspaces; governors see metadata only; archived contexts expose only count/status/discard. Old routes do not fetch before returning not-found.
- **TDD observability:** Every behavior/removal begins with a named focused test or schema/source assertion and an expected missing/incorrect behavior failure. Each GREEN has a focused command before commit, and Task 8 requires real persisted server effects rather than intercepted responses.
- **Legacy safety:** The deletion list is limited to disconnected old Fund tables/modules, legacy Category, and the unused Fund-specific lock adapter. The pure bigint accounting calculator, new `ExpenseRecord`, financial spaces, taxonomy, group serialization, shared batches and pooled facts are positively asserted after migration. There is no mapper, redirect lookup, dual write or compatibility API.
- **Known design limitation:** Browser local storage cannot defend against a same-origin XSS or someone using developer tools; the product boundary is that app code never reads or renders another authenticated context's key. This is recorded rather than misrepresented as encryption.
- **Placeholder/type scan:** No TBD/TODO steps remain. Actor/group/space/mode/operation/version/request-id names and status semantics are consistent across tasks.
