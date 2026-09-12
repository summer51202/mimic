# P6 treasure navigation, home, quick entry and task center execution

Approved design: `../specs/2026-09-11-financial-spaces-product-model-design.md`.  
Plan: `2026-09-12-financial-spaces-phase-6-navigation-home-tasks.md`.

Execution was sequential in this task on `codex/financial-spaces`; no subagents, merge, push, worktree removal or legacy Fund compatibility layer were used.

## Delivered checkpoint

P6 changes the active product entry to three financial-space modes. `/app` now has separate personal and selected-group contexts, mode-discriminated cards, no cross-box total, a compact task prompt only when nonzero and an always-visible expense action. Group detail reads shared and pooled spaces and no longer renders or fetches a legacy Fund panel.

`GET /home` and `GET /tasks` are authenticated, RepeatableRead, read-only projections. Financial facts begin from current effective participation and active group membership. A group owner outside a space receives only `id`, `name`, `mode` and `status`; former participants and outsiders receive no financial facts. Task queries select only the signed-in user's due/overdue occurrence, manager-send reimbursement, advancer receipt, shared payer/recipient transfer and participant-relevant pooled shortfall. ACTIVE/CLOSING spaces and ACTIVE commitments are explicit predicates. Repeated reads leave audit, receipt, occurrence and contribution counts unchanged.

Personal cards combine manual expenses and currently authorized private shared-expense references in one fixed query composition. Shared cards report current-user position, period spend and pending batch. Pooled cards report book, reserved reimbursement, available balance, next occurrence and shortfall. Money remains bigint/Decimal in backend calculations and canonical decimal strings across JSON; Web formatting never converts money through JS number.

Quick entry skips selection for one eligible ACTIVE participant space, offers multiple eligible spaces with the most recently used first, excludes governance/archived spaces and opens the existing mode-specific form. Current personal, group and space routes are preserved. Offline single-space actions are visible but non-navigable. Same-route query changes open the correct dialog without shared allocations appearing in pooled expense UI.

## TDD and self-review evidence

Every behavior began with an observable RED: missing backend projection/routes, missing strict Web contracts/BFF, legacy navigation/home, missing quick/task UI, wrong-mode query transitions and real browser failures. Real PostgreSQL acceptance caught omitted private references in personal home. The first browser RED caught locale-dependent SSR hydration; the next caught same-route quick query state. Both received focused regression tests before fixes.

Three self-review passes covered correctness, privacy/security, canonical money, performance, accessibility/responsive behavior, contracts and test symmetry. Critical/Important regression REDs found and fixed:

- archived spaces and inactive commitments entering task candidates;
- malformed/ambiguous BFF query input and malformed composite task UUIDs;
- offline quick action navigating to `#`;
- current group/space context being lost by the shell quick action;
- personal home omitting authorized shared references;
- Node/Chromium timestamp hydration mismatch;
- general Jest e2e accidentally collecting explicit-database suites.

No Critical or Important issue remains. The fixed-query recent-activity projection may later adopt per-space SQL window limits; it is not N+1 and performs no writes.

## Runtime isolation

- PostgreSQL data directory: `D:\Project\mimic\.worktrees\financial-spaces\.session\postgres`
- Database/user/schema: `mimic_financial_spaces_test` / `mimic_test` / `phase2`
- URL: `postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2`
- API/Web: `127.0.0.1:3101` / `127.0.0.1:3110`
- Final API listener loaded `backend/dist/src/main.js`; Playwright owned and stopped its Web server.

Port 3000 was neither reused nor stopped. No external database was accessed.

## Fresh verification evidence

| Verification | Result |
|---|---|
| Backend `npm run build` | exit 0 |
| Backend `npm test -- --runInBand` | 42 suites / 443 tests passed |
| Backend `npm run test:e2e -- --runInBand` | 5 suites / 54 tests passed |
| Backend `npm run test:spaces-db`, explicit loopback phase2 URL | 20 suites / 150 tests passed |
| Web `npm run lint` | exit 0 |
| Web `npm run typecheck` | exit 0 |
| Web `npm test` | 108 files / 597 tests passed |
| Web production build with API `http://127.0.0.1:3101/api/v1` | exit 0 |
| P6 real-backend Playwright | 4/4 passed: 320x568, 390x844, 768x1024, 1440x900 |

The production build retains the existing standalone trace-copy warning for `(public)/page_client-reference-manifest.js`; the command exits 0.

## Commits

- `3c693c7 docs: plan financial spaces phase 6`
- `6315bf4 feat: add private home and task projections`
- `954ab46 feat(web): add strict home and task boundaries`
- `b92c35a feat(web): route quick expenses by space mode`
- `2754e66 feat(web): add treasure home and task center`
- `a327eab refactor(web): remove legacy funds from group entry`
- `f7235fb test: prove private home tasks against postgres`
- `52bb4bb test(web): cover P6 navigation with real backend`
- `ce9d311 fix: harden P6 task and quick-entry boundaries`
- `d7a7a5b test: isolate financial space database suites`

## Remaining P7 scope

P6 checkpoint is complete. P7 remains responsible for durable offline drafts and reconnect review, complete legacy Fund route/code/UI removal, and the combined three-mode real-backend beta acceptance. This task did not merge, push or remove the worktree.
