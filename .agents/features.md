# Mimic Feature Map
_Last updated: 2026-08-28. Refresh with `/feature-map`._

> The PWA in `web/` is the only active client. Current implementation work targets `web/` and `backend/`; previous clients remain available only through Git history.

## Backend Capability Map

The statuses in this section describe backend availability. The **Web / PWA** section is the authoritative record of active client delivery.

### Auth & Identity

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | user-register | Register with email + password | `—` | `auth.controller.ts POST /auth/register` |
| done | user-login | Log in and receive access + refresh tokens | `—` | `auth.service.ts login()` |
| done | user-logout | Sign out and invalidate session | `—` | `auth.controller.ts POST /auth/logout` |
| done | token-refresh | Auto-refresh access token on expiry | `—` | `auth.controller.ts POST /auth/refresh` |
| done | user-profile-view | View own display name, locale, timezone | `—` | `users.controller.ts GET /me` |
| done | user-profile-update | Update own profile | `—` | `users.controller.ts PATCH /me` |

### Groups & Membership

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | create-group | Create a new group (COUPLE or GROUP type) | `—` | `groups.service.ts createGroup()` |
| done | list-groups | List groups the current user belongs to | `—` | `groups.controller.ts GET /groups` |
| done | view-group-detail | View group name, type, members, and funds | `—` | `groups.controller.ts GET /groups/:id` |
| done | update-group | Owner can rename a group | `—` | `groups.controller.ts PATCH /groups/:id` |
| done | list-members | View all active members and their roles | `—` | `groups.service.ts listMembers()` |
| done | update-member-role | Owner promotes/demotes another active member | `—` | `groups.controller.ts PATCH /groups/:id/members/:memberId` |
| done | remove-member | Owner removes a settled member while preserving history | `—` | `groups.controller.ts DELETE /groups/:id/members/:memberId` |
| done | leave-group | Active member leaves a group and reconciles the selected group | `—` | `groups.controller.ts POST /groups/:id/leave` |
| done | invite-member | Owner generates an invite code | `—` | `groups.controller.ts POST /groups/:id/invites` |
| done | accept-invite | User joins group via invite code | `—` | `group-invites.controller.ts POST /group-invites/accept` |

### Funds

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | create-fund | Create a fund within a group | `—` | `funds.service.ts createFund()` |
| done | list-funds | List all funds in a group | `—` | `funds.controller.ts GET /groups/:groupId/funds` |
| done | view-fund-detail | View fund balance, contributions, expenses | `—` | `funds.service.ts getFundDetail()` |
| todo | update-fund | Edit fund name or description | — | missing `PATCH /funds/:id` |
| todo | archive-fund | Archive an inactive fund | — | missing `POST /funds/:id/archive` |

### Categories

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| todo | create-category | Create an expense category for a group | — | missing module entirely |
| todo | list-categories | List available expense categories | — | missing module entirely |
| todo | archive-category | Archive an unused category | — | missing module entirely |

### Contributions

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | create-contribution | Add a regular or one-time contribution to a fund | `—` | `contributions.service.ts createContribution()` |
| done | list-contributions | List contributions for a fund | `—` | `contributions.controller.ts GET /funds/:id/contributions` |
| todo | update-contribution | Edit an unlocked contribution | — | missing `PATCH /contributions/:id` |
| todo | delete-contribution | Soft-delete an unlocked contribution | — | missing `DELETE /contributions/:id` |

### Expenses

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | create-expense | Record an expense with payers and EQUAL/RATIO/FIXED/HYBRID splits | `—` | `expenses.service.ts createExpense()` |
| done | list-expenses | List expenses for a fund | `—` | `expenses.controller.ts GET /funds/:id/expenses` |
| done | create-correction | Add correction transaction for a past error (new record, no edit) | `—` | `expenses.service.ts` (expense_type=CORRECTION) |
| todo | update-expense | Edit an unlocked expense | — | missing `PATCH /expenses/:id` |
| todo | delete-expense | Soft-delete an unlocked expense | — | missing `DELETE /expenses/:id` |
| todo | restore-expense | Restore a soft-deleted expense | — | missing `POST /expenses/:id/restore` |

### Settlements

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | get-settlement-suggestion | Get minimum-transfer suggestion based on member positions | `—` | `settlements.service.ts getSettlementSuggestion()` |
| done | create-settlement | Create a settlement record (PENDING state) | `—` | `settlements.service.ts createSettlement()` |
| done | list-settlements | List settlements for a fund | `—` | `settlements.controller.ts GET /funds/:id/settlements` |
| done | view-settlement | View a single settlement's details | `—` | `settlements.controller.ts GET /settlements/:id` |
| done | complete-settlement | Mark settlement as completed, locking the period | `—` | `settlements.service.ts completeSettlement()` |
| done | cancel-settlement | Cancel a pending settlement | `—` | `settlements.service.ts cancelSettlement()` |

### Dashboard & Read Models

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | fund-summary | View current/all-time fund totals, settlement period, and member positions | `—` | `funds.controller.ts GET /funds/:id/summary` |
| done | group-dashboard | View cross-fund totals grouped by currency without FX conversion | `—` | `funds.controller.ts GET /groups/:id/dashboard` |

### Web / PWA

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | pwa-auth-shell | Public mimic landing, login/register, protected app shell, and PWA cache boundary | `web/src/app` | `auth.controller.ts`, BFF auth routes |
| done | pwa-group-list | List available groups and no-group onboarding | `web/src/app/app/page.tsx`, `web/src/app/app/groups/page.tsx` | `GET /groups`, `GET /groups/:id/dashboard` |
| done | pwa-group-create | Create a group from the PWA | `web/src/app/app/groups/new/page.tsx` | `POST /groups` |
| done | pwa-group-detail | View group detail and fund list | `web/src/app/app/groups/[groupId]/page.tsx` | `GET /groups/:id`, `GET /groups/:id/members`, `GET /groups/:id/funds` |
| done | pwa-group-rename | Rename a group from the PWA | `web/src/features/groups/group-detail.tsx` | `PATCH /groups/:id` |
| done | pwa-group-leave | Leave a group and reconcile selected-group preference | `web/src/features/groups/leave-group-dialog.tsx` | `POST /groups/:id/leave` |
| done | pwa-member-roster | Display active members and role labels | `web/src/features/groups/member-roster.tsx` | `GET /groups/:id/members` |
| done | pwa-invitation-loop | Create, share, open, authenticate for, and explicitly accept invites | `web/src/features/invitations` | `POST /groups/:id/invites`, `POST /group-invites/accept` |
| done | pwa-fund-list | Display group funds and dashboard fund cards | `web/src/features/funds/fund-list.tsx`, `web/src/features/groups/treasury-dashboard.tsx` | `GET /groups/:id/funds`, `GET /groups/:id/dashboard` |
| done | pwa-fund-create | Create a fund from the PWA | `web/src/app/app/groups/[groupId]/funds/new/page.tsx` | `POST /groups/:id/funds` |
| done | pwa-fund-summary | View fund balance, current period, all-time totals, and member positions | `web/src/app/app/funds/[fundId]/page.tsx` | `GET /funds/:id/summary` |
| done | pwa-pixel-responsive-shell | Responsive pixel UI foundation for public and authenticated routes across phone, tablet, and desktop viewports | `web/src/shared/brand`, `web/src/shared/ui`, `web/src/app/app-shell.module.css` | n/a |
| todo | pwa-public-pixel-world | Bring landing, authentication, and feature pages to the approved full-screen deep-navy pixel-world composition | `web/src/app/(public)`, `web/src/features/auth` | n/a |
| todo | pwa-contributions | Create and list real contribution activity in the PWA | missing PWA activity UI | `contributions.controller.ts` |
| todo | pwa-expenses | Create and list real expense activity in the PWA | missing PWA activity UI | `expenses.controller.ts` |
| todo | pwa-activity | Unified activity timeline for contributions, expenses, corrections, and settlements | missing PWA activity UI | `GET /funds/:id/contributions`, `GET /funds/:id/expenses`, settlement routes |
| todo | pwa-settlements | Suggest, create, complete, cancel, and view settlements in the PWA | missing PWA settlement UI | `settlements.controller.ts` |
| todo | pwa-role-changes | Promote or demote group members in the PWA | missing PWA governance UI | `PATCH /groups/:id/members/:memberId` |
| todo | pwa-member-removal | Remove another member from a group in the PWA | missing PWA governance UI | `DELETE /groups/:id/members/:memberId` |
| todo | pwa-fund-archive | Archive, restore, or edit funds in the PWA | missing PWA fund management UI | missing archive/update endpoints |

### Audit Logs

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| todo | list-audit-logs | View history of all mutations in a group | — | missing module entirely |

### Recurring Rules

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| todo | create-recurring-rule | Set up automatic recurring contribution | — | missing module entirely |
| todo | manage-recurring-rule | Pause, resume, or end a recurring rule | — | missing module entirely |

---

## TODO Backlog

### Auth & Identity
- [x] Backend keeps temporary POST compatibility while canonical clients use PATCH /me
- [x] Verify PWA token refresh retries an expired access token after a 401

### Groups & Membership
- [x] Role promotion/demotion, settled-member removal, and self-leave governance flows

### Funds
- [ ] `PATCH /funds/:id` — update fund name/description
- [ ] `POST /funds/:id/archive` and `/unarchive`

### Categories
- [ ] Entire categories module (NestJS module + controller + service + DTOs)
- [ ] PWA UI for category selection on expense creation

### Contributions
- [ ] `GET /contributions/:id` — individual contribution detail
- [ ] `PATCH /contributions/:id` — edit unlocked contribution
- [ ] `DELETE /contributions/:id` — soft-delete unlocked contribution

### Expenses
- [ ] `GET /expenses/:id` — individual expense detail
- [ ] `PATCH /expenses/:id` — edit unlocked expense
- [ ] `DELETE /expenses/:id` — soft-delete
- [ ] `POST /expenses/:id/restore`
- [ ] Lock check validation in PATCH/DELETE handlers

### Settlements
- [ ] PWA settlement UI, including the cancel action

### Dashboard & Read Models
- [x] `GET /funds/:id/summary` — dedicated current/all-time summary with balance, period, and positions
- [x] `GET /groups/:id/dashboard` — cross-fund totals grouped by currency

### Audit Logs
- [ ] Entire audit module (NestJS module + controller)
- [ ] PWA activity UI and audit-log endpoint wiring

### Recurring Rules
- [ ] [out-of-scope] Recurring contribution rules — post-MVP per PRD

### Database
- [x] Initial Prisma migration exists and has been applied to the local PostgreSQL development database

### Stabilization
- [x] PWA: authenticated group/fund routes, narrow-layout text containment, pixel-frame fill, and Mimiku transparency regression coverage
- [ ] PWA: real-backend Playwright acceptance for the stabilized route and visual suite
- [ ] Backend: lock check not yet applied in PATCH/DELETE handlers (currently only in create)
- [x] Backend: authenticated group and invite integration tests cover route wiring, validation, and authorization
- [ ] Settlement suggestion algorithm: verify normalization logic against PRD position formula
