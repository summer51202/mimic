# Settlement Lock and Invite Session Design

## Goal

Prevent every new contribution or expense, including correction records, from using an `occurred_on` date covered by a completed settlement, and make the public invite page render the authenticated acceptance action when a valid Web session is present.

## Scope

This change covers two defects found during the Railway Staging two-account acceptance:

1. Contribution and expense creation currently acquires the group mutation lock but does not reject dates covered by completed settlements.
2. The public invite page always passes `authenticated={false}` to the acceptance panel.

The change does not add PWA accounting screens, update/delete transaction endpoints, database triggers, or automatic cleanup of existing Staging acceptance data.

## Accounting Invariant

A completed settlement with non-null `period_start` and `period_end` locks that inclusive date range for its fund. A create request is rejected when:

- the settlement belongs to the same fund;
- the settlement status is `COMPLETED`; and
- `period_start <= occurred_on <= period_end`.

The rule applies to every contribution type and expense type, including `CORRECTION`. A correction for a historical mistake must be a new transaction dated in an unlocked period; the locked historical period remains unchanged.

Pending and canceled settlements do not lock dates. Completed settlements without both period boundaries do not lock dates because they do not define a bounded accounting period.

## Backend Design

Add a focused accounting helper that accepts a Prisma transaction client, fund ID, and normalized UTC occurrence date. It queries for one matching completed settlement and throws `ConflictException('LOCKED_PERIOD')` when found.

Both `ContributionsService.createContribution()` and `ExpensesService.createExpense()` call the helper inside their existing Prisma transaction, after `lockGroupMutation()` and participant validation but before any record write. This ordering preserves the current authorization error contract, serializes settlement completion and transaction creation for the group, then fails before mutations when the date is locked.

The helper remains independent of contribution and expense DTOs so future PATCH/DELETE handlers can reuse the same accounting rule with an explicit effective date.

## Invite Session Design

Extract the strict three-segment JWT shape predicate from `requireSession()` into a focused server auth utility. Add a server-only, non-redirecting session-presence helper that reads the access-token cookie and applies that shared predicate. `requireSession()` also uses the extracted predicate, preventing the protected and public route checks from drifting.

The public invite page awaits this helper and passes the result to `InviteAcceptPanel`:

- session present: render the existing authenticated accept action;
- session absent: render the existing login/register guidance;
- invalid invite code: preserve the existing invalid-code state regardless of session.

The helper does not authenticate against the backend and does not authorize invite acceptance. The existing protected BFF route remains the authority and continues to handle expired or invalid credentials.

## Error Contract

Locked-period transaction creation returns NestJS HTTP 409 with the stable error message `LOCKED_PERIOD`. No contribution, expense, payer, or split row is created.

Existing errors such as `FUND_NOT_FOUND`, `GROUP_ACCESS_DENIED`, and `MEMBER_NOT_FOUND` keep their current meanings. Because the lock check runs after the fund lookup and group advisory lock, a missing fund still returns `FUND_NOT_FOUND` before settlement lookup.

## Testing Strategy

Implementation follows red-green-refactor TDD.

Backend unit coverage will prove:

- contribution creation rejects the inclusive start, middle, and end of a completed settlement period;
- expense creation rejects a completed settlement period before creating expense, payer, or split rows;
- contribution and expense correction types follow the same rule;
- pending and canceled settlements do not block creation;
- the period check happens after the group mutation lock and participant validation but before writes.

Web coverage will prove:

- the optional session helper returns authenticated only for a strictly shaped access-token cookie;
- the invite page passes `authenticated=true` when the cookie is present and valid;
- the invite page passes `authenticated=false` without a valid access-token cookie;
- invalid invite-code behavior remains unchanged.

After focused tests pass, run the repository baseline verification commands for backend and Web. The final Staging acceptance repeats a completed settlement followed by a same-period contribution attempt and expects HTTP 409 `LOCKED_PERIOD`, then verifies the authenticated invite page exposes the accept action.

## Operational Notes

No Prisma migration or Railway topology change is required. Existing Staging data written by the defect remains historical test evidence and is not modified by this implementation.
