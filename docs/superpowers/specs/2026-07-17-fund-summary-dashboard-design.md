# Fund Summary and Group Dashboard Design

**Date:** 2026-07-17  
**Status:** Approved design  
**Scope:** Phase 3 — fund summary and cross-fund group dashboard

## 1. Goal

Give a group member one reliable place to understand the group's shared finances: current unsettled activity, all-time totals, per-member positions, and fund-level drill-down. The read model must use the same accounting semantics as settlement suggestions and must never combine different currencies.

## 2. Approved Product Decisions

- Deliver the single-fund summary and group dashboard in the same phase.
- Return both the current unsettled period and all-time totals.
- Group and display values by currency; do not perform foreign-exchange conversion.
- Use a hierarchy of group/currency overview, member positions, fund cards, then fund detail.
- Define the current unsettled period as the day after the latest completed settlement `period_end`. If no completed settlement has a `period_end`, start at the fund's first transaction.
- Keep money in integer minor units throughout the API and format it only in Mobile.

## 3. Architecture

The Backend owns all aggregation and accounting calculations. Mobile consumes two purpose-built read endpoints and does not reconstruct balances from contribution, expense, and settlement lists.

Add a focused summary service under the Funds module. It will reuse or extract the position calculation currently embedded in `SettlementsService`, so the dashboard and settlement suggestion cannot diverge. The implementation will calculate summaries on demand from PostgreSQL; materialized snapshots and background aggregation are out of scope for current data volume.

Endpoints:

- `GET /api/v1/funds/:fundId/summary`
- `GET /api/v1/groups/:groupId/dashboard`

Both endpoints require an authenticated ACTIVE group member. Group dashboard results include ACTIVE funds only. Historical transactions from removed members remain part of accounting history.

## 4. Accounting Semantics

### 4.1 Fund cash balance

Fund cash balance is calculated independently from member positions:

```text
cash balance = contributions - net expenses
```

Normal expenses reduce the balance. Refund records increase it. Correction records use their stored accounting direction and amount; the summary must call the same normalization helper used by the ledger rather than infer direction in the controller.

Completed settlements transfer responsibility between members but do not change fund cash balance.

### 4.2 Member position

Member position follows the existing settlement invariant:

```text
position = contributions - allocated expense splits
```

Completed settlements adjust the two participants' positions using the existing settlement direction. PENDING and CANCELED settlements do not affect positions.

The same shared calculation function must power:

- fund summary member positions;
- group dashboard member positions;
- settlement suggestions.

### 4.3 Current unsettled period

For each fund:

1. Find the completed settlement with the greatest non-null `period_end`.
2. Set `period_start` to the next UTC calendar day.
3. Set `period_end` to today's UTC calendar date.
4. If no completed settlement has a non-null `period_end`, use the earliest contribution, expense, or settlement-relevant transaction date.
5. If the fund has no transactions, return `period_start: null`, `period_end: null`, and zero-valued totals.

A completed settlement whose `period_end` is today produces an empty current period. The API returns zero current-period totals without creating an inverted date range.

All-time values include all valid historical records. Current-period values include records whose accounting date is within the derived inclusive range.

## 5. API Contracts

### 5.1 Fund summary

`GET /funds/:fundId/summary` returns:

```json
{
  "data": {
    "fund": {
      "id": "fund-id",
      "group_id": "group-id",
      "name": "Household",
      "currency": "TWD",
      "status": "active",
      "cash_balance_minor": 520000
    },
    "current_period": {
      "period_start": "2026-07-01",
      "period_end": "2026-07-17",
      "last_completed_settlement_id": "settlement-id",
      "last_completed_period_end": "2026-06-30"
    },
    "current": {
      "net_change_minor": 120000,
      "contribution_minor": 200000,
      "expense_minor": 80000,
      "member_positions": [
        {
          "user_id": "user-id",
          "display_name": "Alex",
          "membership_status": "active",
          "position_minor": 40000
        }
      ]
    },
    "all_time": {
      "net_change_minor": 520000,
      "contribution_minor": 900000,
      "expense_minor": 380000,
      "member_positions": []
    }
  }
}
```

`last_completed_settlement_id` and `last_completed_period_end` are null when no completed settlement defines a closed period.

`fund.cash_balance_minor` is the fund's present all-time cash balance. Each period block uses `net_change_minor` for contributions minus net expenses inside that period. These names must not be interchanged in API mapping or UI copy.

Former members with a non-zero historical position remain in `all_time.member_positions` with `membership_status: "removed"`. They are read-only and never appear as available participants in new transactions. Zero-position former members may be omitted from the current view to reduce noise.

### 5.2 Group dashboard

`GET /groups/:groupId/dashboard` returns:

```json
{
  "data": {
    "group": {
      "id": "group-id",
      "name": "Our household",
      "default_currency": "TWD"
    },
    "currencies": [
      {
        "currency": "TWD",
        "cash_balance_minor": 920000,
        "current": {
          "net_change_minor": 220000,
          "contribution_minor": 360000,
          "expense_minor": 140000,
          "member_positions": []
        },
        "all_time": {
          "net_change_minor": 920000,
          "contribution_minor": 1600000,
          "expense_minor": 680000,
          "member_positions": []
        },
        "funds": [
          {
            "fund_id": "fund-id",
            "name": "Household",
            "cash_balance_minor": 520000,
            "current_net_change_minor": 120000,
            "period_start": "2026-07-01",
            "period_end": "2026-07-17"
          }
        ]
      }
    ]
  }
}
```

Currency groups are sorted with the group's default currency first, then alphabetically. Funds are sorted by name. Member positions are aggregated by user within a currency only; no cross-currency net amount is returned.

## 6. Backend Components

- Extract a shared accounting calculator from `SettlementsService` into a focused domain helper/service.
- Add fund summary query logic to the Funds module.
- Add controller handlers for both read endpoints.
- Keep API mapping separate from Prisma records so bigint values are converted intentionally.
- Query all records needed for a group dashboard in bounded group-level reads; do not issue one full query per fund.
- Preserve existing settlement suggestion behavior with characterization tests before extraction.

The read endpoints do not acquire mutation advisory locks. Each request runs with a consistent Prisma transaction snapshot when multiple queries are needed, preventing a dashboard response from mixing states from before and after the same write.

## 7. Mobile Components and Navigation

### 7.1 Home dashboard

The existing selected-group control remains at the top. Below it, the page renders one overview section per currency:

- currency and current unsettled period label;
- present cash balance plus current-period net change, contributions, and expenses;
- active member position tags labelled as receivable, payable, or balanced;
- fund cards with current and all-time balances;
- tap a fund card to open the fund summary page.

The group-level page defaults to current-period values and provides a Current / All time segmented control. Switching the segment uses the already-loaded response and does not trigger another API request.

### 7.2 Fund summary

The fund page displays:

- fund identity and currency;
- current balance as the primary value;
- Current / All time segmented control;
- contribution, expense, and net-change values;
- member positions with explicit receivable/payable/balanced wording;
- current period dates and latest completed settlement context;
- existing actions for contribution, expense, activity, and settlement.

### 7.3 State and concurrency

Dashboard and fund summary have separate Riverpod providers. Provider keys include group or fund ID. A selected-group change disposes the prior request so a late response cannot overwrite the new group. The UI retains navigation and group switching when a dashboard request fails.

## 8. Empty, Loading, and Error States

- A group with no funds shows a create-fund call to action.
- A fund with no transactions shows zero values and guidance to record the first contribution or expense.
- A failed currency or fund section does not replace the whole home screen when other data is available.
- A complete dashboard failure shows a friendly message and Retry action while retaining the group selector.
- Raw Backend error codes are mapped to user-facing copy.
- If the selected group is no longer available, reconcile selection to the first accessible group.
- Unauthorized responses continue through the existing token refresh flow; refresh failure clears the session and routes to login.

## 9. Testing and Acceptance

### 9.1 Backend tests

- No completed settlement: current period starts at first transaction.
- Latest completed settlement: current period starts one day after `period_end`.
- PENDING and CANCELED settlements do not define the period boundary.
- A completed settlement with today's `period_end` yields an empty zero-valued current period.
- Contributions, normal expenses, refunds, corrections, payers, splits, and completed settlements match the shared position formula.
- Current and all-time totals differ only by period filtering.
- Multiple funds aggregate by currency without conversion.
- Former members retain historical non-zero positions.
- Empty funds and empty groups return stable zero/empty structures.
- Non-members are denied; missing groups and funds return stable not-found errors.
- Settlement suggestion characterization tests remain unchanged after calculator extraction.

### 9.2 Mobile tests

- Multiple currency sections render independently.
- Current / All time switching uses one loaded response.
- Receivable, payable, and balanced member states use clear text and distinct accessible styling.
- Fund cards navigate to the correct fund summary.
- Empty group, empty fund, partial failure, full failure, and Retry states render correctly.
- A stale request cannot replace data after group switching.
- Narrow viewport widget tests detect overflow and unreadable layouts.

### 9.3 Runtime acceptance

Seed or create a real PostgreSQL scenario with two users, at least two funds, two currencies, contributions, expenses, and one completed settlement. Compare API totals to the source records, then verify group switching, currency sections, period switching, fund drill-down, empty states, and Retry behavior in the Web build.

Final verification requires Backend unit/E2E/build, Flutter analyze/test, remote Web build, real PostgreSQL smoke, and user visual acceptance.

## 10. Out of Scope

- Foreign-exchange rates or converted group totals.
- User-selected arbitrary date ranges.
- Materialized dashboard snapshots or background aggregation jobs.
- Charts that imply trends over time.
- Contribution or expense edit/delete flows.
- Category management, recurring rules, and audit-log UI.

## 11. Delivery Sequence

1. Characterize and extract the shared accounting calculator.
2. Implement and test the fund summary read model.
3. Implement and test the group dashboard aggregation.
4. Wire Mobile data models and repositories.
5. Build the group dashboard UI.
6. Upgrade the fund summary UI and navigation.
7. Add resilient loading, empty, partial-error, and Retry states.
8. Run full automated and real PostgreSQL acceptance checks.
9. Complete user visual acceptance before integration.
