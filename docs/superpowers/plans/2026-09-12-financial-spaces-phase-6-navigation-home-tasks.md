# P6 Treasure Navigation, Home, Quick Entry, and Task Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This task is explicitly inline and must not use subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active PWA entry experience with privacy-safe treasure-box navigation, mode-specific home cards, one adaptive expense entry, and an actor-scoped task center for personal, shared, and pooled financial spaces.

**Architecture:** Add two authenticated, read-only backend projections: a context-scoped home projection and a global current-user task projection. Both authorize from current effective `SpaceParticipant` rows before reading financial facts; group governors outside a box receive metadata only on the group home and never enter summaries or tasks. The Web validates strict discriminated contracts at the server/BFF boundary, renders existing pixel-world components, and reuses the three already-shipped expense forms rather than introducing a universal accounting payload.

**Tech Stack:** NestJS 10, Prisma/PostgreSQL, Next.js 16 App Router/BFF, React 19, Zod 4, Vitest/Testing Library, Jest/Supertest, Playwright.

---

## Read-model decision and privacy proof

Existing APIs cannot safely and efficiently compose the task center. `GET /groups/:id/spaces` intentionally includes governance-only metadata, while actionable facts live in full participant-private shared-settlement and pooled-workspace projections. Client/BFF composition would require one list plus multiple full-ledger requests per space, expose unnecessary transactions to the composer, and create request-count growth with the number of boxes. P6 therefore adds a dedicated read-only projection that:

- begins from active group membership plus current effective box participation;
- never treats group ownership as box participation;
- fetches actor-owned occurrences/transfers/reimbursements and grouped pooled inputs with a fixed query set;
- calls the existing `pooledSummary` value function and existing shared-position read instead of defining a universal balance;
- performs no writes, occurrence generation, audit creation, or state transition while reading;
- emits canonical integer strings and returns no zero-valued substitute when a source fails.

The home projection follows the same boundary. Governance rows contain only `id`, `name`, `mode`, and `status`; participant rows are mode-discriminated and cannot serialize another mode's fields.

## File structure

- Create `backend/src/modules/home/home.module.ts`, `home.controller.ts`, `home.service.ts`, `home.types.ts`: authenticated home/task endpoints and fixed-query projections.
- Create `backend/src/modules/home/home.service.spec.ts`: projection, authorization, privacy, canonical-money, ordering, and read-only unit tests.
- Create `backend/test/home-tasks.e2e-spec.ts` and `backend/test/home-tasks-db.e2e-spec.ts`: HTTP contract and real PostgreSQL privacy/accounting coverage.
- Modify `backend/src/app.module.ts`: register the new module.
- Create `web/src/shared/api/home-contracts.ts` and tests: strict discriminated home/task schemas.
- Create `web/src/app/api/app/home/route.ts`, `web/src/app/api/app/tasks/route.ts` and route tests: cookie-backed BFF allowlist.
- Create `web/src/features/home/home-queries.ts`, `home-page.tsx`, `home.css` and tests: personal/group context, cards, recent activity, empty/error/stale/offline behavior.
- Create `web/src/features/quick-expense/quick-expense.tsx`, `quick-expense.css` and tests: most-recent eligible box selection and mode-specific form routing.
- Create `web/src/features/tasks/task-center.tsx`, `task-queries.ts`, `tasks.css` and tests plus `web/src/app/app/tasks/page.tsx`: actionable task list and links.
- Modify `web/src/app/app/page.tsx`, `web/src/app/app/groups/[groupId]/page.tsx`, `web/src/shared/navigation/*`, and tests: active treasure-box IA and global quick action.
- Create `web/e2e/navigation-home-tasks.real-backend.spec.ts`: four-viewport real-backend P6 acceptance without response interception.
- Modify `.agents/features.md`, append `.agents/devlog.md`, and create the P6 execution record after verification.

### Task 1: Backend home and task contracts

- [ ] **RED:** Add focused service/HTTP tests asserting personal, participant shared, participant pooled, governance-only, and task response shapes; assert `>2^53` amounts remain strings, outsiders receive no rows, former participants receive no financial rows, and reads perform no mutation calls. Run `npm test -- --runInBand home.service.spec.ts` and `npm run test:e2e -- --runInBand --testPathPattern=home-tasks`; confirm missing module/routes are the failure reason.
- [ ] **GREEN:** Implement `GET /home` with optional validated `group_id` and `GET /tasks`. Use explicit discriminated objects:

```ts
type HomeCard =
  | { access: 'GOVERNANCE'; id: string; name: string; mode: 'SHARED_EXPENSES' | 'POOLED_FUND'; status: string }
  | { access: 'PARTICIPANT'; id: string; name: string; mode: 'PERSONAL_EXPENSES'; currency: string; spending_minor: string; recent_categories: CategorySlice[]; recent_activity: ActivityItem[] }
  | { access: 'PARTICIPANT'; id: string; name: string; mode: 'SHARED_EXPENSES'; currency: string; spending_minor: string; current_user_position_minor: string; pending_batch: PendingBatch | null; recent_activity: ActivityItem[] }
  | { access: 'PARTICIPANT'; id: string; name: string; mode: 'POOLED_FUND'; currency: string; book_balance_minor: string; pending_reimbursement_minor: string; available_balance_minor: string; shortfall_minor: string; next_occurrence: OccurrenceSummary | null; recent_activity: ActivityItem[] };

type UserTask = {
  id: string;
  kind: 'POOLED_CONTRIBUTION' | 'POOLED_REIMBURSEMENT_SEND' | 'POOLED_REIMBURSEMENT_RECEIVE' | 'SHARED_TRANSFER_SEND' | 'SHARED_TRANSFER_RECEIVE' | 'POOLED_SHORTFALL';
  urgency: 'ACTION_REQUIRED' | 'OVERDUE' | 'ATTENTION';
  space: { id: string; name: string; mode: 'SHARED_EXPENSES' | 'POOLED_FUND'; currency: string };
  amount_minor: string;
  due_on: string | null;
  href: string;
};
```

- [ ] **REFACTOR/REGRESSION:** Keep queries actor-scoped and fixed-count; use `pooledSummary` for pooled balances and the existing shared accounting reader for positions. Verify unit and HTTP suites GREEN, then commit `feat: add private home and task projections`.

### Task 2: Real PostgreSQL read-model proof

- [ ] **RED:** Add a DB suite that seeds participant, manager, former participant, outsider, and group-owner/nonparticipant cases across all modes. Assert actor-owned due/overdue occurrence, manager reimbursement-send, advancer reimbursement-receive, payer/recipient shared transfers, and pooled shortfall; assert no cross-actor facts and no row-count/state changes after repeated reads. Run with the explicit loopback `DATABASE_URL`; confirm the new acceptance fails on missing behavior before implementation adjustments.
- [ ] **GREEN:** Make only the minimal query/auth fixes required by the DB test. Confirm all money strings are canonical and no participant-private title/note is returned in task data.
- [ ] **REFACTOR/REGRESSION:** Run the home/task unit, HTTP, and DB suites together; commit `test: prove home and task privacy on postgres`.

### Task 3: Strict Web boundary and server queries

- [ ] **RED:** Add Zod tests rejecting number money, mixed-mode fields, unknown keys, governance summaries, malformed task URLs, and invented zero summaries. Add BFF tests for exact path/method forwarding and query allowlisting. Run the focused Vitest files and confirm missing contracts/routes fail.
- [ ] **GREEN:** Implement strict `homeResponseSchema` and `taskCenterSchema`, BFF GET routes, and `loadHome`/`loadTasks`. Validate selected `group` as UUID and never fall back from a failed group projection to personal or zero data.
- [ ] **REFACTOR/REGRESSION:** Run focused contract/query/route tests; commit `feat(web): add strict home and task boundaries`.

### Task 4: Treasure navigation and home

- [ ] **RED:** Add component and route tests for the five-item maximum mobile navigation (`首頁`, `我的寶箱`, `共同群組`, `任務`, `設定`), current-section matching, group/personal context switching, mode-specific card labels, governance-only non-clickable private content, task prompt omission at zero, loading/error/offline/stale messaging, keyboard links, wrapped actions, and no legacy Funds/Activity navigation. Confirm failures describe the legacy shell/home.
- [ ] **GREEN:** Replace `/app` treasury composition with the P6 home. Preserve the approved pixel-world tokens and existing components; use semantic headings/links, 44px targets, visible focus, compact task badge only when nonzero, and no cross-box total. Group detail remains governance-oriented but its primary financial entry is the shared treasure-box area rather than legacy Funds.
- [ ] **REFACTOR/REGRESSION:** Run navigation/home tests and static overflow assertions; commit `feat(web): open financial spaces from the home world`.

### Task 5: Adaptive quick expense

- [ ] **RED:** Add tests for zero/one/many eligible active participant boxes, most-recent eligible selection, explicit switching, PERSONAL→basic form, SHARED→payer/allocation form, POOLED→fund/advancer source form, archived/governance exclusion, offline disablement, dialog containment/Escape/focus restoration, and success consequence copy. Confirm the missing global action/form router fails.
- [ ] **GREEN:** Add one shell-level `記一筆支出` action and dialog. Fetch only minimal form prerequisites after a participant box is selected; reuse `PersonalExpenseForm`, `SharedExpenseForm`, and a focused exported pooled expense form. Store only the last successful eligible space id in local storage; never calculate money with `number`, post a contribution, add pooled spend to personal records, or apply shared allocations to pooled spend.
- [ ] **REFACTOR/REGRESSION:** Deduplicate mode labels and eligibility helpers, rerun focused tests, and commit `feat(web): route quick expenses by treasure mode`.

### Task 6: Actor-scoped task center

- [ ] **RED:** Add task-center tests for every task kind and urgency, empty state, exact action wording, safe deep links, offline/stale states, long content wrapping, keyboard navigation, and absence of other participants' tasks/private details. Confirm missing page/UI fails.
- [ ] **GREEN:** Implement `/app/tasks` with task count and grouped actionable cards. Each card links to its participant-authorized treasure box and names the concrete confirmation/send action; shortfall links to the pooled box. Empty state directs users back home without a permanent home panel.
- [ ] **REFACTOR/REGRESSION:** Run task and navigation suites; commit `feat(web): add the actionable task center`.

### Task 7: Real-backend browser acceptance

- [ ] **RED:** Add `navigation-home-tasks.real-backend.spec.ts` using registration and real API/BFF writes only. Assert the old navigation and wrong-mode quick fields fail before the UI cutover. Do not use `page.route`, `route.fulfill`, or financial response mocks.
- [ ] **GREEN:** Cover personal creation/quick expense, group shared/pooled creation/opening, mode-adaptive quick entry, participant versus governor visibility, actor-specific task appearance, task deep links, offline/stale recovery, Escape/focus restoration, keyboard operation, action wrapping, dialog containment, and `scrollWidth <= clientWidth`.
- [ ] **REGRESSION:** Run at 320x568, 390x844, 768x1024, and 1440x900 against API `3101`, Web `3110`, PostgreSQL `55439`; commit `test: cover P6 navigation and tasks in browsers`.

### Task 8: Self-review, documentation, and fresh completion verification

- [ ] Update `.agents/features.md`; append `.agents/devlog.md`; create `docs/superpowers/plans/2026-09-12-financial-spaces-phase-6-navigation-home-tasks-execution.md` with RED reasons, exact counts, runtime PIDs/paths, fixes, commits, and deferred P7 scope.
- [ ] Use the `self-review` skill across the full P6 base diff. For each Critical/Important finding, add a regression RED, confirm the expected failure, apply minimal GREEN, rerun the affected suite, and repeat until none remain. Commit fixes separately.
- [ ] Use `verification-before-completion` and freshly run: backend build, all unit tests, all e2e tests, explicit-loopback `test:spaces-db`; Web lint, typecheck, all unit tests, production build with API `3101`; and four P6 real-backend Playwright projects. Record exact results only from these fresh runs.
- [ ] Run `git diff --check`, verify clean status, verify task-owned listener command lines before stopping only task-owned API/Web/PostgreSQL, verify root `.codex-remote-attachments/` and `reference/` unchanged, and commit the execution record. Do not merge, push, or remove the worktree.

## Plan self-review

- **Spec coverage:** Backend/read model, strict BFF contract, UI, privacy, RED/GREEN, and real-backend acceptance are explicit for home, navigation, quick entry, and every requested task kind. Offline durable drafts and legacy deletion remain P7; P6 only disables writes and preserves in-open-dialog input.
- **Privacy:** Every financial projection starts from current effective participation. Group governor metadata is separately discriminated and cannot carry financial fields. Former participants and outsiders are covered in unit, DB, server-render, BFF-error, and browser assertions.
- **Accounting:** No universal balance exists. Personal, shared, and pooled cards use separate shapes. All money is bigint internally/canonical decimal string on JSON; Web formatting never uses JS number arithmetic.
- **Read-model justification:** The dedicated task endpoint avoids N+1 full-workspace composition and minimizes disclosed fields; all reads are mutation-free and covered by repeated-read row/state assertions.
- **UX/accessibility:** Existing pixel-world tokens remain authoritative. Tests cover loading, empty, error, offline, stale, keyboard, visible focus, focus restoration, wrapping, containment, and horizontal overflow at all required viewports.
- **Placeholder/type scan:** No TBD implementation holes remain; discriminants, property names, URLs, test commands, and commit boundaries are consistent across tasks.
- **Deferred boundary:** P7 retains durable drafts, complete legacy removal, and combined end-to-end three-mode beta acceptance. P6 makes only the minimum navigation cutover needed to stop presenting legacy Fund as the primary model.
