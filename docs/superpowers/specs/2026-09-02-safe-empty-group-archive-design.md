# Safe Empty-Group Archive Design

**Date:** 2026-09-02  
**Status:** Approved design, pending implementation plan  
**Scope:** Backend group lifecycle, group-scoped write serialization, and the Web PWA group-detail flow

## Objective

Let an owner remove an accidentally created, unused group from the active Mimic experience without hard-deleting relational, authorization, or audit data.

The user-facing action is **Delete empty group**. The domain operation is a soft archive: the group and its active empty funds become archived, pending invitations are revoked, and the group disappears from normal navigation. This increment does not expose an archive browser or self-service restore action.

## Product Model

A Group is the membership and authorization boundary for a shared accounting workspace. Funds are purpose-specific ledgers inside that workspace. Archiving a Group must therefore account for its Funds and must prevent all descendant financial writes.

The operation is intentionally restricted to a group that has never accumulated financial history. A group that has started bookkeeping remains available through the normal lifecycle; it cannot be hidden using this cleanup action.

## In Scope

- Archive one unused group from its Group detail page.
- Permit zero Funds or any number of structurally empty Funds.
- Archive every active empty Fund as part of the same transaction.
- Revoke pending invitations.
- Preserve the group, memberships, Funds, invitation history, and audit history.
- Reconcile the selected-group preference and redirect to Groups after success.
- Harden concurrent group-scoped writes so no descendant record can be created after the archive eligibility check.

## Out of Scope

- Hard deletion of a Group or any descendant row.
- Archiving a Group that contains financial history.
- An Archived groups page, restore endpoint, or self-service recovery.
- Bulk archival.
- Fund archive or restore as an independent user-facing feature.
- Changing the meaning of `COUPLE` or `GROUP`.
- Account deletion or membership-history cleanup.

## Archive Eligibility

The Backend is authoritative. The PWA may decide whether to show the action from the current user's role, but it must not infer archive eligibility from visible Fund cards or balances.

All of the following must hold after acquiring the group mutation lock:

1. The Group exists and has status `ACTIVE`.
2. The actor has an `ACTIVE` membership with role `OWNER`.
3. The actor is the only `ACTIVE` Group member.
4. No Fund in the Group has any Contribution, Expense, Settlement, or Recurring Contribution Rule.

Financial-history checks consider every record status. Deleted Contributions or Expenses, canceled Settlements, and ended Recurring Rules still count as history and block archival. Zero balances and completed settlement positions are not sufficient: the existence of a financial record is enough to reject the operation.

Former `LEFT` or `REMOVED` memberships do not block archival when no financial history exists. Their records remain preserved. Accepted, expired, and already revoked invitations remain unchanged.

Fund creation by itself is not financial history. A Group containing only empty Funds remains eligible.

## Backend API Contract

Add an authenticated endpoint:

```http
POST /api/v1/groups/:groupId/archive
```

Successful response:

```json
{
  "data": {
    "group_id": "uuid",
    "status": "archived"
  }
}
```

Expected domain failures:

| status | code | meaning |
|---|---|---|
| 404 | `GROUP_NOT_FOUND` | The Group is missing or already archived. |
| 403 | `GROUP_ACCESS_DENIED` | The actor has no active membership. |
| 403 | `OWNER_REQUIRED` | The actor is an active member but not an owner. |
| 409 | `GROUP_HAS_OTHER_ACTIVE_MEMBERS` | Another active member still belongs to the Group. |
| 409 | `GROUP_HAS_FINANCIAL_HISTORY` | At least one descendant financial record exists. |

Repeated requests do not silently succeed. Once archived, the Group is outside the active resource space and returns `GROUP_NOT_FOUND`.

## Transaction and Data Changes

`GroupsService.archiveEmptyGroup()` runs in one Prisma transaction:

1. Acquire the existing group mutation advisory lock.
2. Re-read the active Group.
3. Validate actor membership and owner role.
4. Count active memberships and require exactly one.
5. Check for financial history across all Funds without filtering record status.
6. Update every `ACTIVE` Fund to `ARCHIVED` and set `archived_at` to one shared timestamp.
7. Update every `PENDING` Group invite to `REVOKED`.
8. Update the Group status from `ACTIVE` to `ARCHIVED`.
9. Write a Group `ARCHIVE` audit entry.

The audit entry records the before and after Group status and includes:

- `operation: archive_empty_group`
- archived Fund count and IDs
- revoked invitation count

Already archived Funds remain archived and are not included in the list of Funds changed by this operation. Membership status and role are not changed.

No new `archived_at` column is required for Group in this increment. The Group audit timestamp records the operation time; Funds continue using their existing `archived_at` column.

## Concurrency Invariant

The invariant is:

> Once the archive transaction has validated that a Group has no financial history, no concurrent request may add a member, Fund, invite, or financial record before the Group and its active Funds become archived.

The archive transaction uses the existing group mutation lock. Every conflicting writer must participate in the same lock and revalidate active state after acquiring it.

Required writer hardening:

- Fund creation runs inside a transaction, acquires the group mutation lock, then rechecks active Group membership.
- Invite creation acquires the group mutation lock, then rechecks the active Group and owner membership.
- Invite acceptance acquires the group mutation lock before consuming the invitation or creating/reactivating membership, then rechecks Group and invitation state.
- Contribution, Expense, and Settlement creation revalidate that both the Group and target Fund remain active after acquiring the group mutation lock.

Existing role changes, member removal, and self-leave already participate in the group mutation lock. Conditional status updates remain in place as defense in depth.

## Read and Authorization Behavior

Active Group lists already exclude archived Groups. Group-detail and Fund-level reads must continue treating descendants of an archived Group as unavailable.

Archiving all active Funds closes existing direct Fund and financial-record entry paths that authorize through an active Fund and membership. The writer revalidation above protects the transition itself. Future Group-scoped endpoints must check active Group state or use an active descendant whose status is changed atomically with the Group.

## Web PWA Flow

### Entry point

Show **Delete empty group** only to an owner on the Group detail page. Place it in a visually separate Danger zone below routine Group actions. Do not disable or enable it based on visible Fund count, balance, or member data beyond role-based visibility.

### Confirmation dialog

Opening the action shows a dedicated dialog that states:

- it only works before bookkeeping has begun;
- empty Funds will be removed from the active experience;
- financial and audit rows are retained rather than hard-deleted;
- Mimic does not yet provide a self-service restore action.

The destructive confirmation button remains disabled until the user enters the exact current Group name. Closing the dialog makes no request.

### Request and result

Add a CSRF-protected Web BFF route that forwards to the Backend archive endpoint through the existing authenticated mutation and refresh flow.

While submitting, disable duplicate confirmation and close controls that would create ambiguous state. On success:

1. Reconcile the selected-group preference using the existing Group preference helper.
2. Select the first remaining active Group or clear the preference when none remain.
3. Navigate to `/app/groups` and refresh server-rendered data.

When the archived Group was the user's last active Group, Overview naturally returns to its existing Create group / Join group empty state.

### Error presentation

Keep the dialog open and retain the typed Group name on failure.

Map domain failures to actionable messages:

- other active members: remove or wait for those members to leave;
- financial history: this Group can no longer use empty-group deletion;
- owner required: only an owner can delete an empty Group;
- expired session: sign in again and retry;
- operational failure: retry without losing the confirmation input.

## Security and Safety

- The server never trusts client-side eligibility checks.
- Group IDs remain internal UUIDs; Mimic IDs do not participate in authorization.
- The operation never deletes financial, membership, invitation, or audit rows.
- The transaction uses one archive timestamp and one lock boundary.
- A failed validation or write rolls back Fund, invite, Group, and audit changes together.
- Archived Groups cannot accept invitations or receive new financial writes.

## Testing Strategy

### Backend unit coverage

- sole active owner with no Funds archives successfully;
- sole active owner with one or more empty Funds archives the active Funds and sets one timestamp;
- already archived empty Funds remain unchanged;
- pending invitations are revoked while historical invitation states remain unchanged;
- Group and Fund changes plus the audit row occur in one transaction;
- non-member, member, and non-owner authorization errors have stable precedence;
- another active member blocks archival;
- Contribution, Expense, Settlement, or Recurring Rule in any status blocks archival;
- repeated archival returns `GROUP_NOT_FOUND`;
- each conflicting writer rechecks active Group/Fund state after acquiring the lock.

### Backend integration coverage

- route wiring and response envelope;
- JWT protection and UUID parameter handling;
- stable status/code mappings;
- archived Groups disappear from active lists and reject detail/invite access;
- empty Funds become unavailable after archival.

### Web coverage

- only owners see the Danger zone action;
- exact-name confirmation controls submission;
- request is sent once and is protected by the existing CSRF/refresh behavior;
- success reconciles Group preference and navigates to Groups;
- each domain error renders the intended message while preserving input;
- the last-Group flow reaches the existing empty Overview state;
- dialog labeling, focus, keyboard dismissal, narrow-width containment, and pending-state controls remain accessible.

## Delivery Notes

This design requires no schema migration. Staging and Production deployment remain separate, explicitly authorized steps. The feature can be merged locally without pushing or deploying.

## Follow-ups

- Archived groups list and self-service restore.
- Independent Fund archive and unarchive UI.
- A broader lifecycle policy for Groups with financial history.
- Group-specific category lifecycle when the Categories module becomes active.
