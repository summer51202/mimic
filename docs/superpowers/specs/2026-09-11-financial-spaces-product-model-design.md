# Mimic Financial Spaces Product Model Design

**Date:** 2026-09-11  
**Status:** Approved for planning  
**Scope:** Product model, accounting boundaries, permissions, and core PWA journeys for personal expenses, shared expense splitting, and pooled funds

## Goal

Reframe Mimic around the financial situations users actually have while preserving its treasure-chest monster identity and pixel-adventure visual language.

Mimic stores and explains three distinct kinds of financial activity:

- personal day-to-day expenses;
- shared expenses that people pay first and settle later;
- real pooled funds that participants contribute to before spending.

The design must keep those accounting models separate, make their numbers immediately understandable, and preserve the invariant that completed settlement periods are immutable.

## Product Promise and Brand

Mimic is a treasure-chest monster that swallows the participants' expenses, contributions, and confirmations, keeps their current financial state visible, and produces a clear answer when it is time to settle.

The existing adventure, pixel-art, treasure, coin, and vault motifs remain part of the product. The imagery represents a shared financial journey; it does not claim that Mimic is a bank, holds money, verifies transfers, or initiates bank payments.

User-facing copy must explicitly distinguish user-confirmed facts from bank-verified facts. Mimic trusts confirmations made by authorized users and preserves who confirmed each action and when.

## Terminology

The user-facing umbrella term is **寶箱**. A treasure box is one bounded financial space with a name, currency, mode, activity history, and lifecycle.

| User-facing mode | Internal type | Meaning |
|---|---|---|
| 個人記帳 | PERSONAL_EXPENSES | One person's day-to-day expense tracking |
| 共同分帳 | SHARED_EXPENSES | Participants record payers and shares, then settle who owes whom |
| 共同基金 | POOLED_FUND | Participants move real money into a shared account or custodian-held pool before spending |

The product does not expose “ledger” as the primary user-facing term. The internal model should use behavior-oriented type names rather than overloading the existing Fund name.

## Information Architecture

The product hierarchy is:

    我的寶箱
    └─ 個人記帳

    共同群組
    └─ 共同寶箱
       ├─ 共同分帳
       └─ 共同基金

A group represents an ongoing relationship such as a couple, family, household, or travel group. A shared treasure box is a bounded financial activity within that relationship.

The accounting mode and lifecycle are independent:

- a shared expense box can be ongoing household bookkeeping or a one-time trip;
- a pooled fund can be an ongoing household fund or a one-time project fund.

Each treasure box has one currency. Different currencies are never summed without an explicit future currency-conversion feature.

Once a treasure box contains its first formal financial record, its mode cannot change. Users must settle or close the old box and create another box to use a different accounting model.

## Participants, Roles, and Privacy

Group membership and treasure-box participation are separate.

Each shared treasure box has its own participants, participant roles, and effective participation dates. Adding a member does not retroactively assign responsibility for earlier periods. A participant with unresolved contributions, reimbursements, or settlement obligations cannot be removed until those obligations are handled.

Each treasure box has two roles:

- **Treasure-box manager:** manages metadata, lifecycle, participants, pooled-fund commitments, reimbursements, settlement batches, and archival.
- **Participant:** views the financial space, records expenses, and confirms actions that belong to them.

The creator is initially both a manager and a participant. A box must always have at least one manager, and a manager may appoint another manager.

Group ownership does not automatically grant treasure-box management or access to financial details. A non-participant cannot see a treasure box's amounts or transactions. A group owner who is not a participant may see only the minimum metadata needed for group governance, such as the box name, mode, and lifecycle state.

Personal expense spaces are private to their owner.

## Home Experience

The home screen is scoped to the selected group when the user is viewing shared finances. Personal and shared finances have separate entry points so their amounts and meanings are not mixed.

The home screen prioritizes:

1. group or personal-context switching;
2. an always-available quick-expense action;
3. concise treasure-box status cards;
4. recent relevant activity.

There is no cross-box total balance. Pooled-fund balances, shared-expense obligations, personal spending, and different currencies are not arithmetically comparable.

Pending actions live in a separate task center. When actionable work exists, the home screen may show a compact count and one-line prompt. It does not reserve a permanent task panel, and it shows no empty task section.

### Status cards

A pooled-fund card prioritizes:

- available balance;
- book balance;
- reserved pending reimbursements;
- next scheduled contribution;
- a shortfall warning when applicable.

A shared-expense card prioritizes:

- how much the current user should receive or pay;
- current-period shared spending;
- any settlement batch in progress;
- recent activity.

A personal-expense card prioritizes current-period spending and recent categories without presenting an account balance.

## Global Quick Expense

The global primary action records an expense. Scheduled contribution confirmation is a task, not a quick-expense action.

When multiple treasure boxes are available, the form preselects the most recently used eligible box and allows the user to switch. When only one eligible box exists, the selection step is skipped.

The form adapts to the selected mode:

- personal expenses collect the basic expense fields, category, and tags;
- shared expenses collect payers and participant shares;
- pooled-fund expenses collect a payment source: the pooled fund or a named participant advancing personal money.

Every successful write reports the financial consequence in plain language instead of only showing a generic success message.

## Personal Expense Mode

The first release tracks day-to-day expenses only. It excludes income, bank accounts, balances, transfers, budgets, investments, and full personal cash-flow reconciliation.

A personal expense includes:

- amount and currency inherited from its treasure box;
- occurrence date;
- title or description;
- one primary category;
- zero or more tags;
- optional private note.

An omitted category is stored as “Uncategorized” so categorization never blocks quick entry.

## Shared Expense Mode

Each shared expense records:

- one or more payers whose amounts sum to the expense total;
- participant allocations whose amounts sum to the expense total;
- one primary category and optional shared tags;
- date, description, and optional note.

The current net position for a participant is:

    amounts paid for shared expenses
    - expense amounts allocated to the participant
    + completed settlement payments sent
    - completed settlement payments received

A positive position means the participant should receive money. A negative position means the participant should pay money. Positions across all participants and a currency must sum to zero.

Contributions and pooled-fund balances never participate in this calculation. No equal-fund-share normalization is applied.

### Adding a shared expense to personal records

A participant may choose **加入我的帳本** for a shared expense.

This creates a private reference, not a duplicate financial transaction. The item appears alongside manually entered personal expenses with:

- the participant's allocated share as its amount;
- a visible “from shared expenses” source label;
- the shared expense's primary category;
- optional private tags and a private note.

The referenced amount follows the authoritative shared allocation while it remains editable. The reference cannot independently change the amount or common transaction content. When the source becomes permanently locked, its financial content remains locked.

The personal view therefore measures the user's consumption burden, not the cash they happened to advance. Settlement transfers are not personal income or negative expenses.

Pooled-fund expenses cannot be added to personal records in the first release because pooled-fund contributions do not reliably identify individual consumption.

## Shared Settlement Batches

Settlement occurs as a batch, not as independent transfers that lock periods separately.

Starting a settlement:

1. chooses a settlement end date;
2. derives the start date from the previous completed batch;
3. snapshots included expenses and corrections;
4. records participant closing positions;
5. creates the minimum required transfer suggestions;
6. temporarily locks the covered period.

Each suggested transfer follows:

    awaiting payment
    → payer confirmed sent
    → recipient confirmed received
    → completed

All transfers must complete before the settlement batch completes and permanently locks its period. A single completed transfer cannot lock the period while other transfers remain outstanding.

Before any transfer is marked sent, a manager may cancel the batch and remove the temporary lock. After any transfer is marked sent, the batch cannot be canceled; participants must finish the batch. An incorrectly recorded or transferred amount is handled as a correction in the next open period after completion rather than by deleting the payment fact.

After permanent locking, an error is corrected through a new record in the next open period.

## Pooled Fund Mode

A pooled fund represents real money moved to a shared account or entrusted to a custodian. Mimic does not connect to a bank and does not claim to verify the movement.

### Contribution commitments and occurrences

Managers define a per-participant expected amount for each recurrence. Equal commitments are the default, but each participant's amount can be customized.

The commitment and the actual contribution are separate:

- a recurrence creates an expected contribution occurrence;
- an occurrence may be upcoming, due, overdue, skipped, or confirmed;
- only the assigned participant may confirm their occurrence;
- self-confirmation immediately creates the formal contribution and affects the fund balance;
- an unconfirmed or overdue occurrence never affects the balance or automatically becomes debt;
- skipped occurrences remain in history.

Mimic never automatically marks an occurrence as paid.

### Expenses and advances

Pooled-fund expenses belong to the fund as a whole and do not support equal, fixed, ratio, or hybrid participant allocation.

An expense has one of two payment sources:

- **fund paid:** immediately reduces the book balance;
- **participant advanced:** creates a reimbursement obligation without immediately reducing the book balance.

The pooled-fund summary is:

    book balance
    = confirmed contributions
    - fund-paid expenses
    - reimbursements confirmed sent
    - fund returns confirmed sent
    ± corrections

    pending reimbursement
    = participant advances not yet confirmed sent

    available balance
    = book balance - pending reimbursement

A pending reimbursement reserves money immediately. When a manager confirms that reimbursement was sent, both book balance and pending reimbursement fall by the same amount, leaving available balance unchanged. Until the advancing participant confirms receipt, the reimbursement remains visible separately as “sent, awaiting receipt” rather than as money still reserved in the fund.

An available balance may be negative. Mimic records the real expense, displays the value as a funding shortfall, and provides an action to make an additional contribution or adjust a future commitment. It does not block recording a real expense.

### Reimbursement confirmation

A reimbursement follows:

    awaiting fund payment
    → treasure-box manager confirmed sent
    → advancing participant confirmed received
    → completed

The sent confirmation changes the book balance. The received confirmation finalizes the workflow and audit history.

### Closing a pooled fund

A pooled fund cannot be archived until:

- outstanding expected contribution occurrences are confirmed, skipped, or canceled;
- all participant reimbursements are completed;
- remaining pooled money is assigned as explicit fund returns;
- recipients confirm those returns;
- book balance and pending reimbursement are both zero.

Mimic does not automatically divide remaining money equally or by contribution ratio. A manager specifies the recipients and amounts, and the system verifies that the return total matches the remaining balance.

## Categories and Tags

All three modes share the category and tagging capability.

Each expense has one primary category and may have multiple tags. The first release supplies approximately 12–16 broad categories, including food, household supplies, housing, utilities and communications, transportation, shopping, entertainment, travel, health, education, pets, family and childcare, subscriptions, gifts, insurance and taxes, and uncategorized.

It also supplies richer contextual tag suggestions such as breakfast, lunch, dinner, coffee, delivery, supermarket, public transit, taxi, parking, fuel, date, family, friends, travel, and work reimbursement.

The picker prioritizes:

1. recent choices;
2. frequently used choices;
3. suggestions relevant to the selected category;
4. searchable defaults;
5. custom creation only when no suitable option exists.

System categories use stable identifiers and localized display names. Personal custom categories and tags remain private. Shared custom categories and tags are scoped to their group.

Custom categories and tags can be renamed, merged, or archived without breaking historical analytics.

## Task Center

The task center includes only actionable or exceptional states relevant to the signed-in user:

- the user's due or overdue contribution occurrence;
- pooled-fund reimbursements a manager must send;
- reimbursements the advancing participant must confirm received;
- shared-settlement transfers the payer must send;
- transfers the recipient must confirm received;
- pooled-fund shortfalls;
- materially overdue items.

The first release uses in-app tasks. Push notifications are deferred until the workflows are stable and require explicit opt-in.

## Editing, Locking, Audit, and Offline Behavior

Open-period records may be updated or soft-deleted according to mode permissions. All mutations retain an audit history.

Records in a pending shared settlement batch are temporarily immutable. Canceling the batch releases that temporary lock. Completing the batch makes the lock permanent.

Every contribution, reimbursement, transfer, return, and settlement confirmation stores the actor and timestamp. Repeated requests are idempotent and cannot double-post money.

Offline use is draft-only:

- users may save a local draft;
- drafts are visibly marked as not submitted;
- drafts never affect authoritative balances or positions;
- reconnecting requires the user to review and submit;
- high-impact confirmations require an online response;
- if a draft's period became locked, the app preserves it and offers a new-period correction flow.

Read failures do not render invented or partially combined financial totals. State conflicts refresh the latest authoritative state and explain what changed without discarding safe local input.

## Technical Architecture

The recommended architecture replaces the overloaded Fund aggregate with a neutral financial-space core. Because all current environment data is test data, the redesign does not need to preserve existing production financial semantics.

Shared core capabilities include:

- FinancialSpace and mode;
- participants, managers, and effective dates;
- common expense fields;
- categories and tags;
- personal expense references;
- audit metadata and lifecycle state.

Mode-specific modules own their rules:

- personal-expense service: personal records and shared-expense references;
- shared-expense service: payers, allocations, positions, and settlement batches;
- pooled-fund service: commitments, occurrences, contributions, payments, advances, reimbursements, returns, and fund balances.

The home read model composes already-defined mode summaries. It never implements another accounting formula.

The exact database decomposition may share an Expense base table with mode-specific relations, but mode validation must reject fields and transitions that do not belong to the selected financial-space type.

## Existing Design Conflicts

The redesign intentionally supersedes earlier assumptions that:

- every financial container is a pooled fund;
- contribution and expense creation are equal daily actions;
- a single fund balance is the main dashboard value;
- group members automatically participate in every fund;
- contributions, payers, allocations, and settlements belong in one normalized position formula;
- individual settlement transfers may independently lock a period;
- the product should be described primarily as a shared treasury.

Existing PRD, architecture documentation, feature map, schema, seed data, accounting calculators, API contracts, dashboard copy, navigation, fund summary, Activity filters, and tests must be audited against this design during planning.

## Verification Strategy

Automated verification must cover:

- mode immutability after the first formal record;
- mode-specific field rejection;
- participant privacy and role permissions;
- effective-date membership behavior;
- shared payer totals and allocation totals;
- zero-sum shared positions and correct settlement direction;
- batch-level temporary and permanent locking;
- two-party settlement confirmation;
- expected contributions not affecting balances before self-confirmation;
- pooled-fund book, pending reimbursement, and available-balance formulas;
- negative available balances remaining recordable and visibly exceptional;
- two-party reimbursement and fund-return confirmations;
- archive prerequisites for shared expenses and pooled funds;
- personal-reference synchronization without duplicate financial records;
- private category, tag, and note boundaries;
- idempotent confirmation and concurrency-conflict handling;
- offline drafts never affecting authoritative summaries;
- phone, tablet, and desktop usability for all three core journeys.

Baseline repository verification remains:

    backend: build, unit tests, and end-to-end tests
    web: lint, typecheck, unit tests, and production build

Real-backend browser acceptance must cover one complete journey for each mode before the redesign is considered ready for beta use.

## Deferred Work

- Personal income, accounts, transfers, budgets, investments, and net-worth tracking.
- Bank connections, transaction verification, and automatic debits.
- Adding pooled-fund expenses to personal expense analysis.
- Currency conversion and cross-currency totals.
- Push notifications.
- Automated categorization, receipt OCR, and AI bookkeeping.
- Changing a financial space's accounting mode after activity exists.
