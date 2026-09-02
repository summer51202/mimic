# Fund Activity MVP Design

**Date:** 2026-09-02  
**Status:** Approved for implementation  
**Scope:** Web/PWA fund-scoped bookkeeping loop

## Goal

Turn Activity from a disabled navigation placeholder into a usable bookkeeping loop: select one fund, review its contribution and expense history, create common contributions and expenses, and immediately see the updated ledger and fund balance.

## Product Decisions

- Activity is available at `/app/activity?fund=<fundId>` and remains inside the existing authenticated Pixel App Shell.
- The page handles one fund at a time. The fund selector contains funds from the currently selected group.
- The first release supports contribution types `regular` and `one_time`.
- The first release supports expense split modes `equal` and `fixed`.
- Expense payer allocation remains independent from member expense allocation and supports one or multiple payers.
- The page uses a timeline-first layout. Forms open from explicit actions instead of occupying permanent timeline space.
- Settlement, correction, adjustment, ratio and hybrid splits, record mutation, and cross-fund aggregation are outside this increment.

## Entry Points and Navigation

The disabled Activity item in the primary navigation becomes a link to `/app/activity`. Activity is added to the app-section matcher so desktop and mobile navigation show the correct current state.

When `/app/activity` has no `fund` query parameter, the server resolves the currently selected group and redirects to its first active fund. If the query parameter identifies a fund outside the selected group, the page does not silently expose or substitute it; it renders the existing read-failure treatment. Changing the selector navigates to the same route with the selected fund ID in the query string.

The fund summary gains three routes into the same workflow:

- **Add contribution** opens `/app/activity?fund=<fundId>&action=contribution`.
- **Add expense** opens `/app/activity?fund=<fundId>&action=expense`.
- **View all activity** opens `/app/activity?fund=<fundId>`.

The `action` parameter controls only the initial dialog state. Closing the dialog removes it from the URL so reload and back navigation remain predictable.

## Page Composition

The Activity page reuses the current top bar, desktop sidebar, mobile bottom navigation, design tokens, PixelFrame, PixelButton, PixelField, PixelDialog, PixelNotice, and shared read-failure patterns.

Within the page, the visual hierarchy is:

1. `Records / Activity` page heading and fund selector.
2. Primary actions: **Add contribution** and **Add expense**.
3. Filter controls: **All**, **Contributions**, and **Expenses**.
4. Date-grouped ledger list, newest date first.

Desktop uses a roomy ledger table/list hybrid. Narrow layouts use stacked rows with the amount aligned to the trailing edge. Contribution amounts use a leading plus sign and the existing success color; expenses use a leading minus sign and the existing critical color. Text labels remain present so meaning does not depend on color.

Each contribution row shows its date group, contributor display name, contribution type, optional note, and amount. Each expense row shows its title, payer display summary, split mode, optional note, and amount. Rows have stable keys formed from the record kind and record ID.

## Contribution Flow

The contribution dialog contains:

- contributor member;
- amount entered in major currency units and converted to integer minor units before submission;
- type: `regular` or `one_time`;
- occurrence date;
- optional note.

The default contributor is the signed-in member when that identity is available in the group roster. The default date is the user's current local calendar date. Validation occurs before the request and errors appear next to their fields. A valid request is sent through a Web BFF route to `POST /funds/:fundId/contributions`.

## Expense Flow

The expense dialog contains:

- title;
- total amount entered in major currency units;
- occurrence date;
- optional note;
- one or more payers with positive minor-unit amounts;
- split mode: `equal` or `fixed`;
- participating members and their allocation inputs or preview.

For `equal`, the user selects participating members. The client constructs equal split entries in roster order and previews the backend-equivalent allocation, including deterministic remainder assignment to the final selected member.

For `fixed`, the user enters each selected member's allocation. The client rejects submission unless fixed allocations total the expense amount exactly.

For both modes, the client rejects submission unless payer amounts total the expense amount exactly. A valid request is sent through a Web BFF route to `POST /funds/:fundId/expenses`. The backend remains authoritative for payer totals, split totals, membership, permissions, and settled-period locking.

## Data Contracts and Server Data Flow

Zod contracts are added for contribution, expense, payer, and split response data. Financial values returned by the API remain strings in minor units; form conversion rejects unsafe or fractional minor-unit values.

The server-side page load performs these reads:

1. resolve the selected group and its active funds;
2. validate or choose the current fund;
3. load the group's active member roster;
4. load the fund summary;
5. load up to 50 contributions and 50 expenses, newest first;
6. parse both payloads and merge them by `occurred_on` descending, then kind and ID for deterministic ordering.

The initial MVP has no combined pagination claim. It explicitly displays the most recent records returned by each endpoint. A future unified backend activity read model will own cross-type cursor pagination, settlements, corrections, and cross-fund aggregation.

Client forms submit only through same-origin BFF routes. The BFF forwards authentication, CSRF, request ID, payload, and backend errors using the existing authenticated route helpers. After a successful creation, the client closes the dialog, clears its fields, replaces the `action` query parameter, shows an accessible success notice, and calls `router.refresh()` so the server reloads both the timeline and fund summary data.

## Filters and Empty States

Filtering is local to the loaded ledger records and does not change the URL in this increment.

- **All** shows contributions and expenses.
- **Contributions** shows contributions only.
- **Expenses** shows expenses only.

If the selected fund has no records, the empty state explains that its ledger is empty and offers both creation actions. If a filter has no matches, the page retains the filter controls and states that no records match. If the selected group has no funds, the page links to fund creation. If no group is selected or available, it links to the existing group onboarding flow.

## Error and Pending Behavior

- Server read failures use `AppReadFailure` and do not render partial financial data.
- Client-side validation errors are attached to their fields; payer and allocation total mismatches also receive a summary notice.
- Backend authorization, locked-period, validation, and network errors are translated into actionable Activity copy without discarding entered form values.
- Each form prevents duplicate submission and exposes a pending label on its submit button.
- Dialog focus is trapped by the existing dialog primitive, close controls remain keyboard accessible, success notices use `role="status"`, and submission errors use `role="alert"`.
- A failed mutation does not refresh or optimistically alter the ledger.

## Component Boundaries

- `activity-queries.ts`: authenticated server reads and deterministic ledger merge.
- `activity-schema.ts`: API response schemas, form schemas, money conversion, and Activity types.
- `activity-page.tsx`: page composition, selected fund context, actions, filters, timeline, and notices.
- `activity-timeline.tsx`: date grouping and accessible record presentation.
- `contribution-form.tsx`: contribution state, validation, payload construction, and submission.
- `expense-form.tsx`: payer and split state, equal preview, fixed-total validation, payload construction, and submission.
- `activity-dialogs.tsx`: URL-driven dialog orchestration and post-success refresh.
- `activity.module.css`: Activity-specific responsive layout derived only from existing design tokens.
- BFF route files: thin authenticated proxies for contribution and expense creation requests; server reads continue to use `authenticatedServerApi` directly.

The exact decomposition may combine a very small orchestration component with its page, but query logic, financial validation, and the two forms remain independently testable.

## Verification and Acceptance Criteria

Automated tests must prove:

- navigation exposes Activity and marks it current on desktop and mobile;
- a missing fund selects the first fund from the current group;
- fund switching preserves the Activity route and changes its `fund` parameter;
- API payloads parse safely and contributions/expenses merge deterministically;
- the timeline groups records by date and filters by kind;
- contribution validation accepts only `regular` and `one_time` and submits integer minor units;
- equal splits allocate the full amount deterministically, including rounding remainders;
- fixed splits reject totals that do not equal the expense amount;
- payer totals reject values that do not equal the expense amount;
- successful mutations close the dialog and refresh server data;
- failed mutations preserve form values and display actionable errors;
- empty-group, empty-fund, empty-ledger, filtered-empty, forbidden, and network-failure states remain usable;
- keyboard focus, labels, dialog close behavior, and live notices remain accessible;
- fund summary shortcuts generate the intended Activity URLs.

Baseline verification is:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

The implementation is complete only when the Activity workflow works at phone, tablet, and desktop widths without horizontal overflow and production build succeeds with `MIMIC_API_BASE_URL` configured.

## Deferred Work

- Contribution `adjustment` and `correction`, pending signed-amount and correction-policy decisions.
- Expense `ratio` and `hybrid` modes.
- Settlement records, suggestions, completion, cancellation, and lock badges.
- Record detail, update, delete, restore, and correction-from-record actions.
- Unified backend Activity/audit endpoint and cursor pagination.
- Cross-group and cross-fund Activity aggregation.
