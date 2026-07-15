# PairFund Accounting Rules Implementation Note v0.2

Date: 2026-04-07
Scope: backend-first accounting logic reference for PairFund MVP
Audience: backend engineers, frontend engineers, QA

## Goal

Turn the v0.2 accounting rules into implementation-ready logic that can be translated into service code, utility functions, and automated tests.

## Principles

* All money values use `amount_minor`
* All write-time financial validation happens on the backend
* Frontend may preview calculations, but backend is the source of truth
* Settled periods are immutable for all roles
* Historical mistakes are fixed by new `correction` records, never by rewriting settled records

## Core Domain Terms

| Term | Meaning |
|---|---|
| `amount_minor` | integer money value in minor unit |
| `contribution` | money added into a fund |
| `expense` | fund spending record |
| `payer` | who actually paid money in real life |
| `split` | who should bear the cost |
| `position` | current net financial position per member |
| `settlement suggestion` | recommended transfer list to reduce open positions |
| `settled period` | date range covered by a completed settlement |
| `correction` | new transaction used to fix an already settled historical mistake |

## 1. Money And Rounding Rules

### Requirements

* use integer arithmetic only
* never use floating point for persisted allocation
* all split outputs must sum exactly to `expense.amount_minor`

### Rounding Strategy

For ratio-based allocation:

1. compute raw share for each ratio participant
2. floor all participants except the final adjustment step
3. assign the remaining minor units to participants in deterministic order
4. use `sort_order` ascending as the deterministic order

### Pseudo-code

```text
function allocateRatioShares(remainingAmountMinor, ratioParticipants):
  totalRatio = sum(participant.ratio_value)
  assert totalRatio > 0

  provisional = []
  allocated = 0

  for participant in ratioParticipants sorted by sort_order:
    raw = remainingAmountMinor * participant.ratio_value / totalRatio
    floored = floor(raw)
    provisional.append({ user_id, amount_minor: floored })
    allocated += floored

  remainder = remainingAmountMinor - allocated

  for item in provisional sorted by sort_order:
    if remainder == 0:
      break
    item.amount_minor += 1
    remainder -= 1

  return provisional
```

## 2. Contribution Posting Rules

### Validation

* `amount_minor > 0` for `REGULAR` and `ONE_TIME`
* `ADJUSTMENT` and `CORRECTION` may be positive or negative only if product rules later allow it
* contributor must be an active member of the fund's group
* contribution cannot be created if the relevant date is in a locked settled period

### Posting Effect

When a contribution is active:

* fund balance increases by `amount_minor`
* contributor position increases by `amount_minor`

### Pseudo-code

```text
function postContribution(contribution):
  assert contribution.status == ACTIVE
  assert isMemberActive(contribution.contributor_user_id, contribution.fund_id)
  assert !isDateLocked(contribution.fund_id, contribution.occurred_on)

  fundBalance += contribution.amount_minor
  memberPosition[contribution.contributor_user_id] += contribution.amount_minor
```

## 3. Expense Validation And Split Allocation

### Shared Validation

* `amount_minor > 0` for normal expense
* payer list cannot be empty
* split list cannot be empty
* sum of payer amounts must equal expense amount
* final allocated split amounts must equal expense amount
* all payer users must belong to the group
* all split users must belong to the group
* expense cannot be created or updated in a locked settled period

### Equal Split Algorithm

```text
function allocateEqualShares(expenseAmountMinor, participants):
  count = number of participants
  assert count > 0

  base = floor(expenseAmountMinor / count)
  remainder = expenseAmountMinor - (base * count)

  result = []
  for participant in participants sorted by sort_order:
    result.append({ user_id, amount_minor: base })

  for item in result sorted by sort_order:
    if remainder == 0:
      break
    item.amount_minor += 1
    remainder -= 1

  return result
```

### Fixed Split Algorithm

```text
function allocateFixedShares(expenseAmountMinor, fixedParticipants):
  totalFixed = sum(fixed_amount_minor)
  assert totalFixed == expenseAmountMinor

  return fixedParticipants mapped to allocated_amount_minor = fixed_amount_minor
```

### Hybrid Split Algorithm

Rules:

* fixed participants are applied first
* ratio participants split only the remaining amount
* total fixed amount must be less than or equal to expense amount

```text
function allocateHybridShares(expenseAmountMinor, fixedParticipants, ratioParticipants):
  totalFixed = sum(fixed_amount_minor)
  assert totalFixed <= expenseAmountMinor

  fixedAllocations = map fixed participants to fixed_amount_minor
  remaining = expenseAmountMinor - totalFixed

  if remaining == 0:
    assert ratioParticipants is empty or all ratio allocations would be zero
    return fixedAllocations

  ratioAllocations = allocateRatioShares(remaining, ratioParticipants)
  return fixedAllocations + ratioAllocations
```

### Expense Allocation Dispatcher

```text
function allocateExpenseSplits(expense):
  if expense.split_mode == EQUAL:
    return allocateEqualShares(expense.amount_minor, expense.equalParticipants)

  if expense.split_mode == RATIO:
    return allocateRatioShares(expense.amount_minor, expense.ratioParticipants)

  if expense.split_mode == FIXED:
    return allocateFixedShares(expense.amount_minor, expense.fixedParticipants)

  if expense.split_mode == HYBRID:
    return allocateHybridShares(
      expense.amount_minor,
      expense.fixedParticipants,
      expense.ratioParticipants
    )

  throw INVALID_SPLIT_MODE
```

## 4. Position Calculation

### Position Formula

For each member in a fund:

```text
position =
  active contributions by user
  + active payer amounts by user
  - active allocated split amounts by user
  - completed settlements sent by user
  + completed settlements received by user
```

### Notes

* normal expense reduces fund balance
* refund increases fund balance
* adjustment and correction follow their own signed amount rule when implemented

### Pseudo-code

```text
function rebuildMemberPositions(fundId):
  positions = zero for every active member in the fund group

  for contribution in active contributions for fundId:
    positions[contribution.contributor_user_id] += contribution.amount_minor

  for expensePayer in active expense payers for active expenses in fundId:
    positions[expensePayer.payer_user_id] += expensePayer.amount_minor

  for expenseSplit in active expense splits for active expenses in fundId:
    positions[expenseSplit.user_id] -= expenseSplit.allocated_amount_minor

  for settlement in completed settlements for fundId:
    positions[settlement.from_user_id] -= settlement.amount_minor
    positions[settlement.to_user_id] += settlement.amount_minor

  return positions
```

## 5. Fund Balance Calculation

### Formula

```text
fund_balance =
  sum(active contributions)
  - sum(active fund expenses)
  + sum(active refunds)
  +/- active adjustments
  +/- active corrections
```

### Pseudo-code

```text
function rebuildFundBalance(fundId):
  balance = 0

  for contribution in active contributions:
    balance += contribution.amount_minor

  for expense in active expenses:
    if expense.expense_type == FUND_EXPENSE:
      balance -= expense.amount_minor
    if expense.expense_type == REFUND:
      balance += expense.amount_minor
    if expense.expense_type == ADJUSTMENT:
      balance += signedAmount(expense)
    if expense.expense_type == CORRECTION:
      balance += signedAmount(expense)

  return balance
```

## 6. Settlement Suggestion

### Input

* current member positions
* only active members

### Output

* transfer list from negative positions to positive positions
* exclude zero-value transfers

### Greedy Matching Algorithm

```text
function buildSettlementSuggestion(positions):
  debtors = members with position < 0, sorted ascending by position
  creditors = members with position > 0, sorted descending by position
  suggestions = []

  debtorIndex = 0
  creditorIndex = 0

  while debtorIndex < debtors.length and creditorIndex < creditors.length:
    debtor = debtors[debtorIndex]
    creditor = creditors[creditorIndex]

    transfer = min(abs(debtor.position), creditor.position)

    suggestions.append({
      from_user_id: debtor.user_id,
      to_user_id: creditor.user_id,
      amount_minor: transfer
    })

    debtor.position += transfer
    creditor.position -= transfer

    if debtor.position == 0:
      debtorIndex += 1

    if creditor.position == 0:
      creditorIndex += 1

  return suggestions
```

## 7. Settlement Completion And Period Lock

### Lock Rule

If a settlement is `COMPLETED`, then all records in the same fund whose `occurred_on` falls within:

* `period_start <= occurred_on <= period_end`

are locked.

### Locked Actions

For locked records:

* update: forbidden
* delete: forbidden
* restore: forbidden

Allowed action:

* create a new `correction`

### Pseudo-code

```text
function isDateLocked(fundId, occurredOn):
  for settlement in completed settlements for fundId:
    if settlement.period_start <= occurredOn <= settlement.period_end:
      return true
  return false
```

```text
function assertRecordWritable(fundId, occurredOn):
  if isDateLocked(fundId, occurredOn):
    throw SETTLED_PERIOD_LOCKED
```

## 8. Correction Transaction Behavior

### Purpose

Correction exists to fix a historical mistake without changing settled history.

### Rules

* correction is a new independent record
* original settled record remains unchanged
* correction title must explain intent in plain words
* correction follows the same validation as a normal contribution or expense
* correction may occur after settlement and affect current position forward

### Important Product Interpretation

The correction date is the new posting date chosen by the user for the new record.

Recommended implementation rule for MVP:

* if user creates correction today, use today's date unless they explicitly choose another unlocked date
* do not allow correction to be posted into a locked date range

### Pseudo-code

```text
function createCorrection(record):
  assert record.type == CORRECTION
  assert record.title is not empty
  assertRecordWritable(record.fund_id, record.occurred_on)

  if record.entity_kind == EXPENSE:
    validateExpense(record)
    allocateExpenseSplits(record)

  if record.entity_kind == CONTRIBUTION:
    validateContribution(record)

  persist(record)
  writeAuditLog(action = CREATE)
```

## 9. Read Model / Summary Rebuild Rules

### Summary Should Always Be Derived

Do not persist fund balance or member position as source-of-truth ledger tables in MVP.

Allowed:

* response-time query aggregation
* cached read model derived from source records

Not allowed:

* manually mutating a balance column on funds and treating it as authoritative

### Recommended Read Functions

* `rebuildFundBalance(fundId)`
* `rebuildMemberPositions(fundId)`
* `buildSettlementSuggestion(positions)`
* `buildFundSummary(fundId)`

## 10. Required Unit Test Matrix

### Money And Split Tests

* equal split with exact division
* equal split with remainder
* ratio split with exact division
* ratio split with remainder distributed by `sort_order`
* fixed split exact total match
* hybrid split with fixed then ratio remainder
* payer not included in split
* subset of members in split

### Lock Tests

* create record before locked period fails
* update record in locked period fails
* delete record in locked period fails
* restore record in locked period fails
* correction in unlocked current date succeeds

### Position Tests

* contribution increases position
* payer increases position
* split decreases position
* completed settlement moves positions correctly
* refund changes fund balance correctly

### Suggestion Tests

* two-member simple transfer
* multi-member greedy settlement
* no suggestion when all positions are zero

## 11. Backend Function Inventory

Suggested implementation functions:

* `validateContribution()`
* `validateExpense()`
* `allocateExpenseSplits()`
* `allocateEqualShares()`
* `allocateRatioShares()`
* `allocateFixedShares()`
* `allocateHybridShares()`
* `rebuildFundBalance()`
* `rebuildMemberPositions()`
* `buildSettlementSuggestion()`
* `isDateLocked()`
* `assertRecordWritable()`
* `createCorrection()`

## 12. Frontend Expectations

Frontend may:

* preview split allocation locally
* preview settlement suggestion returned from backend
* show locked badges based on backend response

Frontend must not:

* decide final rounding
* decide final lock status independently
* submit edited settled-period records and assume backend will reconcile them
