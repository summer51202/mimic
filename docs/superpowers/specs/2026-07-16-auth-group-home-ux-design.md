# Auth, Group-Aware Home, and Group Management UX Design

## Goal

Make authentication errors actionable, make every Home value clearly belong to a selected group, and provide basic multi-group viewing and management without overloading the dashboard.

## Scope and Delivery Order

The work ships in three independently testable batches:

1. Authentication UX and user-facing validation.
2. Group-aware Home, group switching, and no-group onboarding.
3. Group detail, rename, member visibility, and backend authorization hardening.

Each batch must pass focused tests, full backend/mobile tests where applicable, remote-mode Web build, and browser acceptance before the next batch begins.

## Authentication UX

### Input behavior

- Email and Password start empty.
- Email uses `you@example.com` as a placeholder.
- Password uses `At least 6 characters` as a placeholder.
- Placeholder text appears only while a field is empty and disappears as the user types.
- Registration continues to include Display name.
- Sign-in mode includes a `Use demo account` action that fills the demo credentials only after explicit user action.

### Validation and errors

- Display name is required during registration.
- Email is required and must have a valid format.
- Password is required and must contain at least six characters.
- Local validation appears under the relevant field and prevents the request.
- An already-registered email displays: `This email already has an account. Sign in instead.`
- Connectivity or server failure displays: `We couldn't connect. Please try again.`
- Login credentials failure uses a clear sign-in-specific message.
- Raw exceptions, HTTP status codes, and API codes never appear in user-facing copy.
- Editing a field or switching modes clears stale errors associated with the previous attempt.

## Group-Aware Home

### Selected layout

Use the approved hybrid layout. Home keeps a compact Current group card above the financial dashboard and moves complete group management to a separate Group screen.

### Current group card

- Shows the selected group name, current user's role, and a short member summary.
- Includes a group selector, `View group`, and `Invite` actions.
- Settings remains accessible from the top-right app action.
- Balance, funds, activity, and all financial actions below the card are scoped to the selected group.

### Group selector

- Lists every active group the user belongs to.
- Each option shows group name, member count, and the current user's role.
- Includes `Create group` and `Join with code` actions at the bottom.
- Persists the last selected group locally.
- If the stored group is no longer available, falls back to the first active group.

### No-group onboarding

When the user has no active groups, Home hides the financial dashboard and shows:

- `Start your first shared group`
- Primary action: `Create group`
- Secondary action: `Join with code`
- Short explanatory copy distinguishing creating a group from joining one.

After creation or acceptance, Home refreshes and selects the new group.

## Group Detail and Basic Management

The Group screen shows:

- Group name and type.
- Current user's Owner or Member role.
- Member list with display names and roles.
- Funds belonging to the group.
- Invite action for Owners.
- Rename action for Owners.

Member users do not see Owner-only controls. The server remains authoritative; hiding a button is not an authorization boundary.

The following remain outside this delivery:

- Removing members.
- Leaving a group.
- Promoting or demoting roles.
- Archiving groups.

## Backend Contracts and Authorization

Add:

- `GET /api/v1/groups/:groupId` returning group details and the requesting user's role.
- `PATCH /api/v1/groups/:groupId` allowing Owners to rename a group.

Harden group-scoped endpoints so the requesting user must be an active member before reading members, reading funds, or using other member-scoped operations. Invite creation and rename require an active Owner. Authorization is checked in backend services/controllers and covered by tests.

## State and Data Flow

- Replace the current implicit `groups.first` behavior with explicit `selectedGroupId` state.
- Group list data determines valid selections.
- Selected group state drives Home summary, funds, member summary, and navigation paths.
- Group creation, invite acceptance, rename, or membership changes invalidate group list and selected-group-dependent providers.
- Loading one group shows a localized loading state. A group-specific failure shows Retry without blanking the whole application shell.

## Testing

### Authentication batch

- Repository/controller tests preserve stable API semantics.
- Widget tests cover empty initial values, placeholders, Demo fill, local field errors, friendly remote errors, mode switching, and successful submission.

### Group-aware Home batch

- State tests cover stored selection, fallback, selection changes, and no-group state.
- Repository tests verify every group-scoped request uses the selected ID.
- Widget tests cover the Current group card, selector, onboarding, narrow layouts, and navigation.

### Group management batch

- Backend unit/e2e tests cover detail, rename, member access, Owner authorization, and non-member denial.
- Mobile repository/controller/widget tests cover detail loading, rename, members, funds, role-based controls, error, and retry states.
- Full backend tests, full Flutter tests, remote Web build, API smoke, and browser acceptance are required before completion.

## User-Visible Outcome

Users understand registration requirements before submitting, never see technical errors, always know which group Home represents, can switch groups, can start from an intentional no-group state, and can view or perform the basic management actions allowed by their role.
