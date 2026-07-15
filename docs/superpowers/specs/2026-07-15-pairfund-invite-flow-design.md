# PairFund Invite Flow Design

## Goal

Allow an owner to create a one-time group invitation and allow a second logged-in user to join that group from the Flutter app. The first release displays a copyable invite code and does not send email.

## Scope

Included:

- Owner creates an invitation with an optional email restriction.
- Invitation expires seven days after creation and can be accepted once.
- Logged-in user accepts an invitation code and joins as `MEMBER`.
- Flutter remote mode exposes create-invite and accept-invite screens.
- Both flows return user-facing errors for invalid state and permissions.

Excluded:

- Email delivery, deep links, QR codes, invite listing, revocation, and expiry jobs.
- Member role changes and group settings.
- Changes to settlement or accounting behavior.

## API Contract

### Create invitation

`POST /api/v1/groups/:groupId/invites`

Request:

```json
{
  "invited_email": "partner@example.com"
}
```

`invited_email` is optional. When provided, it is trimmed and normalized to lowercase before storage.

Success response:

```json
{
  "data": {
    "invite_id": "uuid",
    "invite_code": "human-readable-random-code",
    "invited_email": "partner@example.com",
    "expires_at": "2026-07-22T00:00:00.000Z",
    "status": "pending"
  }
}
```

Only an active `OWNER` of an active group may create an invitation. The code is generated from cryptographically secure random bytes, encoded without ambiguous punctuation, and is protected by the existing unique database constraint.

### Accept invitation

`POST /api/v1/group-invites/accept`

Request:

```json
{
  "invite_code": "invite-code"
}
```

Success response:

```json
{
  "data": {
    "group_id": "uuid",
    "group_name": "Our Home",
    "role": "member",
    "joined_at": "2026-07-15T00:00:00.000Z"
  }
}
```

Acceptance runs in one database transaction:

1. Read the invite by exact code.
2. Require status `PENDING` and `expires_at` later than the current time.
3. If `invited_email` is present, require it to equal the logged-in user's normalized email.
4. Require that the user is not already an active member.
5. Create a `GroupMember` with role `MEMBER` and status `ACTIVE`.
6. Mark the invite `ACCEPTED`, recording `accepted_by` and `accepted_at`.

The transaction and the existing `(group_id, user_id)` unique constraint prevent duplicate membership during concurrent acceptance.

## Error Contract

The API uses NestJS HTTP exceptions with stable message codes:

| HTTP | Code | Meaning |
|---|---|---|
| 403 | `GROUP_OWNER_REQUIRED` | Caller is not an active owner of the group. |
| 404 | `INVITE_NOT_FOUND` | Code does not identify an invitation. |
| 409 | `INVITE_ALREADY_USED` | Invitation is no longer pending. |
| 410 | `INVITE_EXPIRED` | Invitation passed its expiry time. |
| 403 | `INVITE_EMAIL_MISMATCH` | Invitation is restricted to another email. |
| 409 | `ALREADY_GROUP_MEMBER` | Caller already belongs to the group. |

Validation errors continue to use the global `ValidationPipe`. The Flutter repository maps these codes to concise user-facing messages while retaining a generic fallback.

## Backend Structure

The feature remains in `GroupsModule`, which already owns membership and invite lifecycle:

- DTOs validate create and accept requests.
- `GroupsService` owns permission checks, secure code generation, expiry, and transactional acceptance.
- `GroupsController` exposes the group-scoped create route.
- A small `GroupInvitesController` exposes the collection-level accept route without distorting the existing `/groups` controller prefix.
- Unit tests cover service rules; e2e tests cover authentication, validation, and response shape.

No Prisma schema change is required.

## Flutter Structure

Add a focused `invites` feature using the existing feature-first and repository patterns:

- `InviteRepository` defines create and accept operations.
- `RemoteInviteRepository` calls the two API endpoints.
- `DemoInviteRepository` provides deterministic UI development behavior.
- Riverpod controllers own form state, submission state, and mapped errors.
- `CreateInviteScreen` accepts a group ID, offers an optional email field, and displays a copyable code with expiry after success.
- `AcceptInviteScreen` accepts a code, submits it, then refreshes group state and routes to the joined group/home view.

Entry points:

- Owner action from the home/group member area: `Invite member`.
- Signed-in user action from the home empty state or account menu: `Join with invite code`.

The screens use existing PairFund design tokens and remain usable on narrow mobile and Web layouts.

## User and Operator Actions

The implementation can be completed without external services. User verification requires two accounts:

1. Log in as `demo@pairfund.local` and create or select a group.
2. Create an invitation, optionally restricted to the second account email.
3. Copy the displayed invite code.
4. Log out, register or log in as the second account, and accept the code.
5. Confirm the joined group appears and both users are shown as members.

The developer/agent handles migrations checks, API tests, container restart, Flutter tests, and remote-mode launch. The user only decides product behavior and performs the final two-account visual acceptance.

## Testing and Acceptance

Backend tests must prove:

- Active owner can create an invite with a seven-day expiry.
- Member/non-member cannot create an invite.
- Open invite can be accepted by any non-member.
- Email-restricted invite accepts the matching normalized email.
- Wrong email, expired invite, reused invite, and existing membership are rejected with the stable codes above.
- Concurrent acceptance cannot create duplicate membership or consume the invite inconsistently.

Flutter tests must prove:

- Create form submits optional email and renders code/expiry.
- Accept form submits code and renders mapped API errors.
- Successful acceptance invalidates group providers and navigates away.

End-to-end acceptance is complete when two separate accounts can join the same persisted group through the Flutter Web UI and the member list shows owner and member after a refresh.

## Follow-up Boundary

Invite revocation, delivery, deep links, and role management remain separate Phase 1 or post-MVP slices. This design intentionally leaves those out so the first two-user result remains small and reviewable.
