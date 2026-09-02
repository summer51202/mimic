# Fund Activity MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a fund-scoped Activity page where members can review a merged ledger and create common contributions and equal/fixed-split expenses.

**Architecture:** A Next.js Server Component resolves group/fund context and loads authoritative data directly from the backend. Focused Client Components own filtering and URL-driven dialogs; mutations pass through same-origin BFF routes and refresh the server view after success.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, CSS Modules, Vitest, Testing Library

---

### Task 1: Activity contracts and finance calculations

**Files:**
- Create: `web/src/features/activity/activity-schema.ts`
- Create: `web/src/features/activity/activity-schema.test.ts`
- Modify: `web/src/shared/api/domain-contracts.ts`
- Modify: `web/src/shared/api/domain-contracts.test.ts`

- [ ] Write failing contract tests for contribution/expense response parsing, `majorToMinorUnit`, equal remainder allocation, fixed totals, and payer totals.
- [ ] Run `npm test -- src/features/activity/activity-schema.test.ts src/shared/api/domain-contracts.test.ts`; expect failures for missing exports.
- [ ] Add Zod response contracts and focused pure helpers. Money conversion must derive currency fraction digits through `Intl`, accept positive decimal input only, reject excess precision and values above `Number.MAX_SAFE_INTEGER`, and return an integer number for the current backend DTO.
- [ ] Implement equal allocation in selected-member order using rounded shares for every member except the last, which receives the remainder, matching `ExpensesService.allocateVariableSplits`.
- [ ] Re-run the focused tests and expect PASS.

### Task 2: Server reads and deterministic timeline merge

**Files:**
- Create: `web/src/features/activity/activity-queries.ts`
- Create: `web/src/features/activity/activity-queries.test.ts`

- [ ] Write failing tests that verify encoded fund IDs, `page=1&page_size=50&sort=occurred_on_desc`, Zod parsing, and deterministic merge order by date, kind, then ID.
- [ ] Run `npm test -- src/features/activity/activity-queries.test.ts`; expect missing-module failure.
- [ ] Implement `listContributions`, `listExpenses`, `mergeActivityRecords`, and `getFundActivity` with `authenticatedServerApi` and the schemas from Task 1.
- [ ] Re-run the focused test and expect PASS.

### Task 3: Contribution and expense BFF mutations

**Files:**
- Create: `web/src/app/api/app/funds/[fundId]/contributions/route.ts`
- Create: `web/src/app/api/app/funds/[fundId]/contributions/route.test.ts`
- Create: `web/src/app/api/app/funds/[fundId]/expenses/route.ts`
- Create: `web/src/app/api/app/funds/[fundId]/expenses/route.test.ts`

- [ ] Write failing route tests proving valid IDs forward POST JSON to `/funds/:id/contributions` or `/funds/:id/expenses`, while invalid IDs return the shared validation response.
- [ ] Run both route tests and expect missing-module failures.
- [ ] Implement thin POST handlers with `readRouteIdParam` and `forwardAppRoute({ body: "json" })`.
- [ ] Re-run both route tests and expect PASS.

### Task 4: Activity navigation and route context

**Files:**
- Modify: `web/src/shared/navigation/app-section.ts`
- Modify: `web/src/shared/navigation/app-navigation.tsx`
- Modify: `web/src/shared/navigation/app-navigation.test.tsx`
- Create: `web/src/app/app/activity/page.tsx`
- Modify: `web/src/app/app/route-boundaries.test.tsx`

- [ ] Change navigation tests first to expect an enabled `/app/activity` link and current-state matching; run them and confirm RED.
- [ ] Enable the Activity navigation item and add `/app/activity` to `AppSection` ordering before `/app`.
- [ ] Add route-boundary tests for no groups, no funds, invalid selected fund, default-first-fund redirect, and successful context loading.
- [ ] Implement the server page using `cookies`, `listGroups`, `selectGroupId`, `listFunds`, `listMembers`, `getFundSummary`, and `getFundActivity`. Normalize repeated search parameters to their first value. Redirect to the first fund when `fund` is absent; use `AppReadFailure` for rejected reads.
- [ ] Run the navigation and route-boundary tests and expect PASS.

### Task 5: Timeline-first Activity surface

**Files:**
- Create: `web/src/features/activity/activity-page.tsx`
- Create: `web/src/features/activity/activity-timeline.tsx`
- Create: `web/src/features/activity/activity-page.test.tsx`
- Create: `web/src/features/activity/activity.module.css`

- [ ] Write failing component tests for the selected fund, fund switching URL, date grouping, deterministic row labels, All/Contributions/Expenses filters, empty ledger, and filtered-empty state.
- [ ] Run `npm test -- src/features/activity/activity-page.test.tsx`; expect missing-module failure.
- [ ] Implement a client Activity shell with accessible `<select>`, three pressed-state filter buttons, and a timeline list. Preserve the selected group in available fund choices and use `router.push('/app/activity?fund=...')` for switching.
- [ ] Style with existing tokens only: two-column header/actions on wide screens, single-column controls below 48rem, 44px controls, no horizontal overflow, and non-color kind labels.
- [ ] Re-run the focused test and expect PASS.

### Task 6: Contribution form and dialog orchestration

**Files:**
- Create: `web/src/features/activity/contribution-form.tsx`
- Create: `web/src/features/activity/contribution-form.test.tsx`
- Create: `web/src/features/activity/activity-dialogs.tsx`

- [ ] Write failing tests for signed-in contributor default, `regular`/`one_time` only, local-date default, major-to-minor conversion, duplicate-submit lock, field errors, preserved values on API failure, success callback, and payload shape.
- [ ] Run the contribution form test and expect missing-module failure.
- [ ] Implement the form with labeled native select/textarea controls plus existing PixelField, PixelButton, and PixelNotice primitives. Submit through `/api/app/funds/:id/contributions` with `appFetch`.
- [ ] Add URL-driven dialog opening for `action=contribution`, closing via `router.replace('/app/activity?fund=...')`, and success via close plus `router.refresh()`.
- [ ] Re-run the focused test and expect PASS.

### Task 7: Equal/fixed expense form

**Files:**
- Create: `web/src/features/activity/expense-form.tsx`
- Create: `web/src/features/activity/expense-form.test.tsx`
- Modify: `web/src/features/activity/activity-dialogs.tsx`

- [ ] Write failing tests for title/amount/date, multiple payer toggles and amounts, payer-total mismatch, equal participants and preview, fixed participant amounts and total mismatch, exact backend payloads, duplicate-submit lock, preserved values on failure, and success callback.
- [ ] Run the expense form test and expect missing-module or missing-export failure.
- [ ] Implement payer and participant fieldsets from active members. Default the current member as sole payer for the full entered total and select all active members for equal sharing. Build only `equal` or `fixed` split payloads.
- [ ] Submit through `/api/app/funds/:id/expenses`; map locked-period, authorization, validation, and connectivity failures to actionable copy.
- [ ] Add `action=expense` dialog orchestration and the same close/refresh behavior as contribution creation.
- [ ] Re-run the focused test and expect PASS.

### Task 8: Fund-summary shortcuts and integrated behavior

**Files:**
- Modify: `web/src/features/funds/fund-summary.tsx`
- Modify: `web/src/features/funds/fund-summary.test.tsx`
- Modify: `web/src/features/funds/fund-summary.module.css`
- Modify: `web/src/features/activity/activity-page.tsx`

- [ ] Replace the placeholder-copy test with failing assertions for Add contribution, Add expense, and View all activity URLs.
- [ ] Add shortcut links using the summary fund ID and remove the “next phase” notice.
- [ ] Wire Activity actions, dialogs, success notice with `role="status"`, and refresh callback into the page component.
- [ ] Run Activity, fund-summary, navigation, route, and schema tests together; expect PASS.

### Task 9: Verification and project records

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test` from `web/`; fix every Activity-related failure.
- [ ] Run `$env:MIMIC_API_BASE_URL='http://localhost:3000/api/v1'; npm run build`; expect a successful production build.
- [ ] Update the feature map factually: contribution creation/listing is done; expense/activity remain `in-progress` because ratio, hybrid, correction, settlement, and unified pagination are deferred.
- [ ] Append the required 2026-09-02 devlog entry with touched scope, decisions, verification evidence, and deferred work.
- [ ] Review `git diff --check`, `git status --short`, and the final diff without modifying unrelated `.codex-remote-attachments/` content.
