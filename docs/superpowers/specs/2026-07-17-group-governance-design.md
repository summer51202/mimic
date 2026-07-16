# PairFund Group Governance Design

**Date:** 2026-07-17  
**Status:** Approved
**Scope:** The first delivery slice of the seven-gap product backlog: member role management, member removal, and self-service group exit.

## Goal

Let a group govern its active membership without breaking accounting history, losing its last Owner, or exposing management actions to unauthorized members.

## Product Decisions

- Every active group must retain at least one active Owner.
- Owners may promote Members, demote other Owners, and remove other active members.
- The final active Owner cannot be demoted, removed, or leave.
- A member may be removed or leave only when their position is zero in every fund, including archived funds, and they participate in no pending settlement.
- Positions from different funds cannot offset one another for this eligibility check.
- Removed and departed members retain all historical accounting links.
- A removed or departed user may rejoin only through a new invite and always returns as an active Member.
- Owners manage another member through a contextual bottom sheet. Self-exit is a separate Danger zone action.

## Scope Boundaries

### Included

- Change an active member's role between Owner and Member.
- Remove another active member.
- Leave a group as the current user.
- Enforce last-Owner, open-balance, and pending-settlement invariants.
- Apply a shared group mutation lock to membership changes and accounting writes that can change exit eligibility.
- Record each mutation in the existing audit log.
- Refresh Mobile group state and reconcile the selected group after exit.

### Excluded

- Ownership invitations or approval voting.
- Permanent bans or a removed-member blocklist.
- Automatic settlement creation during removal.
- Group archival or deletion.
- The other six product gaps: group dashboard, transaction mutation, fund management, settlement polish, production deployment, and device validation. Each receives its own later spec and plan.

## API Design

All routes are JWT protected and use the existing `/api/v1` prefix.

The existing `GET /groups/:groupId` detail response adds
`current_user_id`. Mobile uses this server-authenticated identity to distinguish
the current user's member row when multiple users share the same role.

### Change role

`PATCH /groups/:groupId/members/:userId`

Request:

```json
{
  "role": "owner"
}
```

`role` accepts only `owner` or `member`. Success returns the updated active membership:

```json
{
  "data": {
    "user_id": "uuid",
    "display_name": "Alex",
    "role": "owner",
    "status": "active"
  }
}
```

Only an active Owner may call this endpoint. A request that would demote the last active Owner is rejected atomically.

### Remove member

`DELETE /groups/:groupId/members/:userId`

Success returns:

```json
{
  "data": {
    "user_id": "uuid",
    "status": "removed"
  }
}
```

Only an active Owner may remove another active member. Calling this endpoint with the actor's own user ID returns `CANNOT_REMOVE_SELF`; self-exit must use the leave endpoint.

### Leave group

`POST /groups/:groupId/leave`

No request body is required. Success returns:

```json
{
  "data": {
    "group_id": "uuid",
    "status": "left"
  }
}
```

Any active member may leave when the accounting and last-Owner invariants pass.

## Backend Architecture

The existing Groups module remains the owner of membership lifecycle operations. No schema migration is required.

- Add a DTO for the role body and controller routes for the three operations.
- Include the authenticated user ID as `current_user_id` in group detail responses.
- Add focused service methods for role change, removal, and exit.
- Keep authorization, invariant checks, membership mutation, and audit creation in one Prisma transaction per request.
- Re-read active memberships inside the transaction; UI visibility and preflight reads are never treated as authorization.
- Serialize mutations through a shared PostgreSQL transaction-scoped advisory lock derived from the group ID. Membership changes, contribution creation, expense creation, and pending-settlement creation acquire the same lock before their authorization and mutation checks.
- Count active Owners only after acquiring the group mutation lock. The role/status update occurs in that same transaction.
- Use the same derived position currently shown by settlement suggestions: contributions plus payer amounts minus allocated expense splits, then apply completed settlement transfers. Refund expenses reverse the payer/split sign.
- Check every fund regardless of fund status. Each computed position must equal zero.
- Reject removal or exit when a pending settlement has the target as `fromUserId` or `toUserId`.
- Preserve contributions, expenses, payers, splits, settlements, and prior audit entries.

Membership state transitions are:

```text
ACTIVE MEMBER <-> ACTIVE OWNER
ACTIVE MEMBER/OWNER -> LEFT       (self-service exit)
ACTIVE MEMBER/OWNER -> REMOVED    (Owner action)
LEFT/REMOVED -> ACTIVE MEMBER     (new invite acceptance)
```

Invite acceptance already reactivates inactive memberships and must continue to force `role = MEMBER`.

## Domain Errors

Backend responses expose stable codes. Mobile maps them to safe, actionable copy.

| Code | Meaning | User-facing guidance |
|---|---|---|
| `OWNER_REQUIRED` | Actor is not an active Owner | Only an Owner can manage members. |
| `MEMBER_NOT_FOUND` | Target is not an active member | This member is no longer available. Refresh and try again. |
| `LAST_OWNER_REQUIRED` | Mutation would leave no active Owner | Make another member an Owner first. |
| `MEMBER_HAS_OPEN_BALANCE` | At least one fund position is non-zero | Complete this member's balances in every fund first. |
| `MEMBER_HAS_PENDING_SETTLEMENT` | Target participates in a pending settlement | Complete or cancel the pending settlement first. |
| `CANNOT_REMOVE_SELF` | Actor used remove on their own membership | Use Leave group instead. |
| `GROUP_ACCESS_DENIED` | Actor is not an active group member | You no longer have access to this group. |
| `ROLE_UNCHANGED` | Target already has the requested role | The member already has this role. |

Unknown API failures use the existing safe retry copy and never display raw server messages.

## Audit Design

Audit rows use `entityType = GROUP`, `entityId = groupId`, and the existing enum values:

- Promotion and demotion: `action = ROLE_CHANGE`.
- Removal and exit: `action = DELETE` because the membership becomes inactive without hard deletion.

`beforeSnapshot` and `afterSnapshot` contain only membership role and status. Metadata contains an operation discriminator (`promote_member`, `demote_owner`, `remove_member`, or `leave_group`) plus the target user ID. Email addresses, tokens, and secrets are excluded.

## Mobile Architecture

Extend the existing group repository and group-detail controller rather than introducing a second membership data source.

- Repository methods call the three explicit API routes.
- The controller exposes one pending mutation at a time and prevents duplicate submissions.
- Successful role changes and removals invalidate Group detail and Home group choices.
- Successful self-exit refreshes group choices and selected-group persistence. The next available group becomes selected; an empty list clears the selection and shows existing no-group onboarding.
- Request-scoped keep-alive behavior matches the invite controllers so an in-flight mutation cannot update a disposed notifier.

## Mobile Interaction Design

- Member rows show avatar, display name, and a non-interactive Owner/Member tag.
- The current member row is identified by `current_user_id`, never by role or display name.
- An Owner sees a three-dot menu only for other active members.
- The menu opens a bottom sheet:
  - Member target: `Make Owner`, `Remove from group`.
  - Owner target: `Make Member`, `Remove from group`.
- The current user's row has no management menu.
- `Leave group` appears in a visually separate Danger zone at the bottom of Group detail for every role.
- Promote, demote, remove, and leave each require a confirmation dialog naming the affected member and explaining the consequence.
- Remove and leave use destructive styling; metadata tags never resemble buttons.
- Success is acknowledged with a snackbar and refreshed data.
- Open-balance and pending-settlement failures explain the blocking work. Pending settlement copy includes a navigation action to the relevant fund or settlement when an identifier is available.

## Concurrency and Security

- Backend authorization is authoritative; hidden Mobile controls are only presentation.
- Group and active membership are checked again within the transaction.
- Owner-reducing operations serialize on the group mutation lock so two concurrent requests cannot both remove the final Owner.
- Eligibility checks and the status mutation share one transaction to prevent a new pending settlement or accounting write from racing the exit decision. Accounting write services must coordinate using the same group-level lock order to avoid a check/write gap.
- Error responses do not reveal membership details to outsiders.

## Testing Strategy

### Backend unit and integration coverage

- Owner promotes an active Member.
- Owner demotes another Owner while another active Owner remains.
- Final Owner cannot be demoted, removed, or leave.
- Member cannot manage another member.
- Owner cannot remove themselves through the remove route.
- Non-zero position in any active or archived fund blocks removal and exit.
- Positions in separate funds cannot offset one another.
- Pending settlement involving the target blocks removal and exit.
- Settled member can be removed or leave and retains historical records.
- Concurrent Owner-reducing operations leave at least one active Owner.
- A new invite reactivates LEFT and REMOVED memberships as Member.
- Controller tests cover JWT protection, DTO validation, route arguments, snake_case responses, and stable errors.

### Mobile coverage

- Owner and Member see the correct controls.
- Three-dot menu opens the expected bottom sheet actions.
- Current user never receives the other-member management menu.
- Each mutation requires confirmation and duplicate taps submit once.
- Stable domain codes map to the approved copy.
- Success refreshes Group detail and Home.
- Leaving the selected group selects the next available group.
- Leaving the final group shows no-group onboarding.
- Narrow-screen widget tests show no overflow.

### Baseline

Before implementation, the isolated worktree passes Backend 40/40 unit tests, Backend 16/16 E2E tests, and Flutter 153/153 tests.

## Delivery Sequence

1. Backend role mutation and audit.
2. Backend shared group mutation lock, removal/exit eligibility, accounting-write coordination, and audit.
3. Mobile repository/controller data flow.
4. Group detail bottom sheet, confirmations, Danger zone, and navigation reconciliation.

Each slice uses test-driven implementation and an independently reviewable commit.

## Acceptance Criteria

- A user can manage roles, remove a settled member, or leave from Group detail according to their role.
- No operation can leave an active group without an active Owner.
- A member with any open balance or involved pending settlement cannot be removed or leave.
- Historical accounting data remains unchanged.
- Rejoining requires a new invite and restores Member role only.
- UI remains readable on narrow Web/mobile layouts and never exposes raw API failures.
