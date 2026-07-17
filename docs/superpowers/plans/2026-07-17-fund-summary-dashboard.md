# Fund Summary and Group Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver consistent single-fund and cross-fund dashboard read models, with current unsettled and all-time views grouped by currency and rendered in Mobile.

**Architecture:** Extract settlement position logic into a pure accounting calculator, then build `FundSummaryService` with bounded Prisma reads in repeatable-read transactions. Expose `GET /funds/:fundId/summary` and `GET /groups/:groupId/dashboard`; Mobile maps those contracts into Riverpod state and never recomputes accounting rules.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest/Supertest, Flutter, Riverpod, Dio, GoRouter, Flutter widget tests.

---

## File Map

Backend creates `modules/accounting/accounting-calculator.ts`, `modules/funds/fund-summary.types.ts`, `modules/funds/fund-summary.service.ts`, their unit tests, and `test/fund-dashboard.e2e-spec.ts`. It modifies `settlements.service.ts`, `funds.module.ts`, `funds.controller.ts`, and `backend/README.md`.

Mobile creates `features/home/data/group_dashboard.dart`, `features/home/data/remote/group_dashboard_remote_mapper.dart`, `features/home/presentation/widgets/period_scope_control.dart`, and `currency_dashboard_section.dart`. It modifies the existing home and fund repositories, providers, screens, mappers, and their tests.

Delivery updates `.agents/features.md` and appends `.agents/devlog.md` only after runtime verification.

---

### Task 1: Extract the Shared Accounting Calculator

**Files:**
- Create: `backend/src/modules/accounting/accounting-calculator.ts`
- Create: `backend/src/modules/accounting/accounting-calculator.spec.ts`
- Modify: `backend/src/modules/settlements/settlements.service.ts`
- Test: `backend/src/modules/settlements/settlements.service.spec.ts`

- [ ] **Step 1: Write characterization tests**

Test contribution, normal expense, REFUND, split allocation, and COMPLETED/PENDING/CANCELED settlement behavior. Use this core assertion:

~~~ts
expect(calculateMemberPositions(input)).toEqual([
  { userId: 'user-a', positionMinor: 1300 },
  { userId: 'user-b', positionMinor: -300 },
]);
expect(normalizeAgainstEqualFundShare(positions)).toEqual([
  { userId: 'user-a', positionMinor: 800 },
  { userId: 'user-b', positionMinor: -800 },
]);
~~~

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --runInBand src/modules/accounting/accounting-calculator.spec.ts`  
Expected: FAIL because the calculator module is absent.

- [ ] **Step 3: Implement pure contracts**

~~~ts
export interface MemberPosition {
  userId: string;
  positionMinor: number;
}
export function calculateMemberPositions(input: AccountingInput): MemberPosition[];
export function normalizeAgainstEqualFundShare(values: MemberPosition[]): MemberPosition[];
export function buildSettlementSuggestions(values: MemberPosition[]): SettlementSuggestion[];
export function expenseDirection(type: ExpenseType): 1 | -1;
~~~

Move the existing algorithms unchanged. The file must not import NestJS or `PrismaService`.

- [ ] **Step 4: Replace private settlement calculations with imports**

Preserve the existing suggestion response and ordering. Delete duplicated private methods only after focused tests pass.

- [ ] **Step 5: Verify GREEN and commit**

~~~powershell
npm run test -- --runInBand src/modules/accounting/accounting-calculator.spec.ts src/modules/settlements/settlements.service.spec.ts
npm run test -- --runInBand
git add backend/src/modules/accounting backend/src/modules/settlements
git commit -m "refactor(backend): share accounting calculations"
~~~

---

### Task 2: Implement the Fund Summary Read Model

**Files:**
- Create: `backend/src/modules/funds/fund-summary.types.ts`
- Create: `backend/src/modules/funds/fund-summary.service.ts`
- Create: `backend/src/modules/funds/fund-summary.service.spec.ts`
- Modify: `backend/src/modules/funds/funds.module.ts`

- [ ] **Step 1: Define stable internal types**

~~~ts
export interface PeriodTotals {
  netChangeMinor: number;
  contributionMinor: number;
  expenseMinor: number;
  memberPositions: MemberPositionReadModel[];
}
export interface FundSummaryReadModel {
  fund: {
    id: string; groupId: string; name: string; currency: string;
    status: string; cashBalanceMinor: number;
  };
  currentPeriod: {
    periodStart: string | null; periodEnd: string | null;
    lastCompletedSettlementId: string | null;
    lastCompletedPeriodEnd: string | null;
  };
  current: PeriodTotals;
  allTime: PeriodTotals;
}
~~~

- [ ] **Step 2: Write RED tests for periods and empty data**

Cover latest completed `period_end` + one UTC day, first-transaction fallback, completed-through-today empty period, no transactions, PENDING/CANCELED ignored, all-time cash, and current net change.

- [ ] **Step 3: Verify RED**

Run: `npm run test -- --runInBand src/modules/funds/fund-summary.service.spec.ts`  
Expected: FAIL because `FundSummaryService` is absent.

- [ ] **Step 4: Implement authorization and snapshot boundary**

~~~ts
getFundSummary(fundId: string, actorUserId: string) {
  return this.prisma.$transaction(
    tx => this.getFundSummaryInTransaction(tx, fundId, actorUserId),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
~~~

Require ACTIVE fund and ACTIVE membership. Throw `FUND_NOT_FOUND` for missing/inactive funds and `GROUP_ACCESS_DENIED` for non-members.

- [ ] **Step 5: Implement period/totals mapping**

Filter accounting inputs by inclusive UTC date range before calling the calculator. `fund.cashBalanceMinor` is all-time cash; `current.netChangeMinor` is period-only. Completed settlements change positions, never cash.

- [ ] **Step 6: Preserve former-member history**

Return ACTIVE members in both views. Return removed/left members with non-zero all-time positions as read-only rows with their membership status.

- [ ] **Step 7: Register, verify, and commit**

~~~powershell
npm run test -- --runInBand src/modules/funds/fund-summary.service.spec.ts
npm run build
git add backend/src/modules/funds/fund-summary*
git add backend/src/modules/funds/funds.module.ts
git commit -m "feat(backend): add fund summary read model"
~~~

---

### Task 3: Aggregate the Group Dashboard by Currency

**Files:**
- Modify: `backend/src/modules/funds/fund-summary.types.ts`
- Modify: `backend/src/modules/funds/fund-summary.service.ts`
- Modify: `backend/src/modules/funds/fund-summary.service.spec.ts`

- [ ] **Step 1: Add multi-currency RED tests**

Use two TWD funds and one USD fund. Assert default currency first, remaining currencies alphabetically, funds by name, and no cross-currency member/net totals.

- [ ] **Step 2: Define currency contract**

~~~ts
export interface CurrencyDashboardReadModel {
  currency: string;
  cashBalanceMinor: number;
  current: PeriodTotals;
  allTime: PeriodTotals;
  funds: Array<{
    fundId: string; name: string; cashBalanceMinor: number;
    currentNetChangeMinor: number;
    periodStart: string | null; periodEnd: string | null;
  }>;
}
~~~

- [ ] **Step 3: Implement one bounded group read**

`getGroupDashboard(groupId, actorUserId)` authorizes once and loads ACTIVE funds plus accounting relations inside one repeatable-read transaction. It must map the loaded snapshot directly, not call public `getFundSummary()` in an N+1 loop.

- [ ] **Step 4: Verify and commit**

~~~powershell
npm run test -- --runInBand src/modules/funds/fund-summary.service.spec.ts
git add backend/src/modules/funds/fund-summary*
git commit -m "feat(backend): aggregate group dashboard by currency"
~~~

---

### Task 4: Expose Exact HTTP Contracts

**Files:**
- Modify: `backend/src/modules/funds/funds.controller.ts`
- Create: `backend/test/fund-dashboard.e2e-spec.ts`
- Modify: `backend/README.md`

- [ ] **Step 1: Write route RED tests**

Override `FundSummaryService` and test exact snake_case envelopes, actor forwarding, and 401 behavior for:

~~~text
GET /api/v1/funds/fund-1/summary
GET /api/v1/groups/group-1/dashboard
~~~

- [ ] **Step 2: Verify RED**

Run: `npm run test:e2e -- --runInBand test/fund-dashboard.e2e-spec.ts`  
Expected: 404 for both routes.

- [ ] **Step 3: Add authenticated controller methods**

~~~ts
@Get('funds/:fundId/summary')
getFundSummary(@Param('fundId') id: string, @CurrentUser() user: RequestUser);

@Get('groups/:groupId/dashboard')
getGroupDashboard(@Param('groupId') id: string, @CurrentUser() user: RequestUser);
~~~

Map camelCase service data to the approved snake_case spec. Add both routes to README.

- [ ] **Step 4: Full Backend verification and commit**

~~~powershell
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
git add backend/src/modules/funds/funds.controller.ts backend/test/fund-dashboard.e2e-spec.ts backend/README.md
git commit -m "feat(backend): expose fund dashboard endpoints"
~~~

---

### Task 5: Map Dashboard Contracts in Mobile

**Files:**
- Create: `mobile/lib/features/home/data/group_dashboard.dart`
- Create: `mobile/lib/features/home/data/remote/group_dashboard_remote_mapper.dart`
- Modify: `mobile/lib/features/home/data/home_repository.dart`
- Test: `mobile/test/features/home/home_repository_test.dart`

- [ ] **Step 1: Write repository RED tests**

Assert one `/groups/group-1/dashboard` request maps TWD and USD independently, including null periods and removed historical members. Assert Mobile does not fold amounts across currencies.

- [ ] **Step 2: Define immutable models**

~~~dart
enum DashboardScope { current, allTime }
class DashboardPeriodTotals {
  const DashboardPeriodTotals({
    required this.netChangeMinor,
    required this.contributionMinor,
    required this.expenseMinor,
    required this.memberPositions,
  });
  final int netChangeMinor;
  final int contributionMinor;
  final int expenseMinor;
  final List<DashboardMemberPosition> memberPositions;
}
~~~

Add `GroupDashboard`, `CurrencyDashboard`, `DashboardMemberPosition`, and `DashboardFundCard` using raw minor-unit integers.

- [ ] **Step 3: Implement mapper and repository**

For selected groups, fetch `/me` plus `/groups/$groupId/dashboard`; remove the client-side fund-list sum. Missing numeric totals map to zero; required IDs and currencies must remain non-empty.

- [ ] **Step 4: Verify and commit**

~~~powershell
flutter test test/features/home/home_repository_test.dart
git add mobile/lib/features/home/data mobile/test/features/home/home_repository_test.dart
git commit -m "feat(mobile): map group dashboard read model"
~~~

---

### Task 6: Render the Group Dashboard

**Files:**
- Create: `mobile/lib/features/home/presentation/widgets/period_scope_control.dart`
- Create: `mobile/lib/features/home/presentation/widgets/currency_dashboard_section.dart`
- Modify: `mobile/lib/features/home/providers/home_summary_provider.dart`
- Modify: `mobile/lib/features/home/presentation/home_dashboard_screen.dart`
- Test: `mobile/test/features/home/home_dashboard_screen_test.dart`
- Test: `mobile/test/features/home/home_groups_reconciliation_coordinator_test.dart`

- [ ] **Step 1: Write widget RED tests**

Assert TWD/USD sections, present cash, current net change, Receivable/Payable/Balanced labels, fund navigation, empty group/currency states, Retry, and no overflow at 360 px.

- [ ] **Step 2: Implement reusable scope control**

Use `SegmentedButton<DashboardScope>` with keys `dashboard-scope-current` and `dashboard-scope-all-time`. Switching scope uses loaded data and must not call the repository again.

- [ ] **Step 3: Implement currency section**

Use design tokens. Each position tag includes text plus sign/amount; color is supplemental. Fund cards call `AppRoutes.fundDetailPath(fund.id)`.

- [ ] **Step 4: Preserve selector and add Retry**

~~~dart
ElevatedButton(
  onPressed: () => ref.invalidate(homeSummaryProvider),
  child: const Text('Retry'),
)
~~~

The existing generation coordinator must continue preventing stale group responses from replacing current selection.

- [ ] **Step 5: Verify and commit**

~~~powershell
flutter test test/features/home/home_dashboard_screen_test.dart test/features/home/home_groups_reconciliation_coordinator_test.dart
flutter analyze
git add mobile/lib/features/home mobile/test/features/home
git commit -m "feat(mobile): render currency group dashboard"
~~~

---

### Task 7: Upgrade Fund Summary Drill-Down

**Files:**
- Modify: `mobile/lib/features/funds/data/fund_repository.dart`
- Modify: `mobile/lib/features/funds/data/remote/fund_remote_mapper.dart`
- Modify: `mobile/lib/features/funds/providers/fund_detail_provider.dart`
- Modify: `mobile/lib/features/funds/presentation/fund_detail_screen.dart`
- Test: `mobile/test/features/funds/fund_repository_test.dart`
- Test: `mobile/test/features/funds/fund_detail_screen_test.dart`

- [ ] **Step 1: Write repository RED tests**

Assert `/funds/fund-1/summary` maps cash balance, current/all-time totals, period dates, latest settlement context, and member status. Keep only the existing small activity-preview requests.

- [ ] **Step 2: Replace legacy formatted domain fields**

~~~dart
class FundDetailSummary {
  const FundDetailSummary({
    required this.fundId,
    required this.fundName,
    required this.currency,
    required this.cashBalanceMinor,
    required this.periodStart,
    required this.periodEnd,
    required this.current,
    required this.allTime,
    required this.recentActivity,
  });
}
~~~

Store raw integers in domain models and format only in widgets.

- [ ] **Step 3: Write widget RED tests**

Cover Current/All time, period label, member state wording, existing action routes, empty state, Retry, and narrow layout.

- [ ] **Step 4: Implement page using shared `PeriodScopeControl`**

Default to Current. Keep contribution, expense, activity, and settlement routes unchanged. Empty funds must show both record actions.

- [ ] **Step 5: Verify and commit**

~~~powershell
flutter test test/features/funds/fund_repository_test.dart test/features/funds/fund_detail_screen_test.dart
flutter analyze
git add mobile/lib/features/funds mobile/test/features/funds
git commit -m "feat(mobile): add fund summary drill-down"
~~~

---

### Task 8: Full Runtime Verification and Records

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`
- Runtime scripts: ignored `.session/` only; never commit tokens or credentials.

- [ ] **Step 1: Run full automated verification**

~~~powershell
cd backend
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
cd ../mobile
flutter analyze
flutter test
flutter build web --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
~~~

- [ ] **Step 2: Deploy worktree to local WSL acceptance stack**

Mount this worktree Backend at `/app`, preserve PostgreSQL, keep port 3001, and retain CORS for `localhost:8080`. Do not print JWT secrets or full environment files.

- [ ] **Step 3: Create deterministic real data**

Through the API create two users, one group, two TWD funds, one USD fund, contributions, expenses, a refund/correction, and a completed settlement with non-null `period_end`.

- [ ] **Step 4: Assert runtime behavior**

Compare fund summaries to source records; verify period boundary, currency separation, group totals equal fund totals, removed-member history remains read-only, and non-members receive 403.

- [ ] **Step 5: Update records and commit**

Promote `view-fund-summary`, `fund-summary`, and `group-dashboard` only after runtime verification. Record exact test counts and remaining gaps.

~~~powershell
git add .agents/features.md .agents/devlog.md
git commit -m "docs: record fund dashboard delivery"
~~~

---

### Task 9: User Visual Acceptance and Integration Handoff

**Files:** No product changes unless acceptance reveals a defect.

- [ ] **Step 1: Serve the verified build**

Serve at `http://localhost:8080/?v=8#/login`. Verify Web 200, Backend health, and CORS preflight first.

- [ ] **Step 2: User acceptance checklist**

Ask the user to verify group switching, TWD/USD sections, Current/All time without loading flash, member labels, fund drill-down, period boundary, empty states, Retry, and readability.

- [ ] **Step 3: Fix any defect with TDD**

For each defect: add one failing focused test, implement one fix, rerun focused and impacted full suites, append devlog evidence, and commit separately.

- [ ] **Step 4: Finish the branch**

Run `git diff --check`, confirm clean status, obtain independent review, and invoke `superpowers:finishing-a-development-branch` for merge/PR/keep/discard options.

---

## User Decision and Operation Points

- No more product-rule decisions are required before implementation; A2, B1, C1, D1, and E1 are encoded in the spec.
- User operation is required at Task 9 visual acceptance.
- FX conversion, arbitrary date ranges, charts, edit/delete records, and materialized snapshots require a separate scope decision.
