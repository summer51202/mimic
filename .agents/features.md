# Mimic Feature Map
_Last updated: 2026-09-12. Refresh with `/feature-map`._

> The PWA in `web/` is the only active client. Current implementation work targets `web/` and `backend/`; previous clients remain available only through Git history.

## Financial spaces redesign — Phases 1–7 complete

The approved `docs/superpowers/specs/2026-09-11-financial-spaces-product-model-design.md` supersedes the universal Fund model and its accounting assumptions. P7 removed that legacy product, API, and persistence surface without a compatibility layer.

| status | capability | entry / acceptance |
|--------|------------|--------------------|
| done | Neutral personal/shared/pooled metadata, explicit participation and manager roles | `backend/prisma/schema.prisma`, `backend/src/modules/financial-spaces/` |
| done | Authenticated create/read/rename, pre-history shared-mode switch, private and governance-only projections | `/api/v1/me/spaces`, `/api/v1/groups/:groupId/spaces`, `/api/v1/spaces/:spaceId` |
| done | Participant add, delegation, settled shared exit/rejoin/archive, atomic audit and version concurrency | Participant/role/end/archive routes; real PostgreSQL HTTP, rollback and concurrency suites |
| done | Group departure/archive guards | `backend/src/modules/groups/groups.service.ts` |
| done | Strict Web contract and local repeatable fixtures | `web/src/shared/api/financial-space-contracts.ts`, `backend/prisma/seed-financial-spaces.ts` |
| done | Private daily expense create/edit/soft-delete with idempotent receipts and atomic actor/time audit | `backend/src/modules/personal-expenses/`, `backend/src/modules/expense-records/` |
| done | Common stable categories/tags, personal/group vocabulary, rename/merge/archive and participant-scoped picker | `backend/src/modules/taxonomy/`, `backend/prisma/seed-taxonomy.ts` |
| done | Exact selected-box monthly consumption and canonical category totals, independent of pagination | `personal-expense-queries.service.ts`, `personal-consumption.ts` |
| done | No-group personal box onboarding, monthly bookkeeping, taxonomy management and offline submission prevention | `/app/personal`, `web/src/features/personal-expenses/`, `web/src/features/taxonomy/` |
| done | Exact shared positions, signed effects, integer allocation and bounded exact minimum transfers | `shared-accounting.ts`, `shared-allocation.ts`, `shared-settlements/minimum-transfers.ts` |
| done | Shared payer/allocation persistence, participant-private HTTP CRUD, audited receipts and exact full-space summary | `backend/src/modules/shared-expenses/`; real HTTP and two-connection tests |
| done | Shared batch snapshots, temporary/permanent locks, two-party confirmation and immutable corrections | `backend/src/modules/shared-settlements/`; real HTTP and concurrency tests |
| done | Safe settled shared lifecycle with obligation, manager-survival and privacy guards | `shared-lifecycle.ts`; real HTTP and independent-connection concurrency suites |
| done | Participant-private shared Web journey, exact payer/allocation editor, positions, batch confirmations, immutable corrections and settled lifecycle | `/app/spaces/:spaceId`, `web/src/features/shared-expenses/`, `web/src/features/shared-settlements/`; four-viewport real-backend acceptance |
| done | Private personal references to authoritative shared allocations, including private metadata, source-lock cues, access rechecks, and responsive real-backend acceptance | `backend/src/modules/personal-expenses/personal-references.service.ts`, `/app/personal`, `/app/spaces/:spaceId` |
| done | Pooled commitments and persisted occurrences, exact book/available balances, fund-paid and advanced expenses, two-party reimbursements, signed corrections, explicit returns, settled exit/archive and participant-private responsive Web acceptance | `backend/src/modules/pooled-funds/`, `web/src/features/pooled-funds/`, `/app/spaces/:spaceId`; four-viewport real-backend acceptance |
| done | 寶箱 navigation, personal/group homepage, mode-safe quick expense and actor-scoped task center | `backend/src/modules/home/`, `/api/v1/home`, `/api/v1/tasks`, `/app`, `/app/tasks`; four-viewport real-backend acceptance |
| done | Context-isolated durable expense drafts with reload recovery, review/retry/discard, stale/blocked states and durable request UUIDs | `web/src/shared/drafts/`, all three expense forms; unit and real-backend acceptance |
| done | Legacy Fund Web/API/schema removal with generic old-route 404s and retained bigint accounting primitive | removal migration, source-boundary tests, legacy HTTP/old-bookmark acceptance |
| done | Combined three-mode acceptance over real PostgreSQL/API/Web at 320/390/768/1440 | five real-backend Playwright specs across four viewport projects |

P2 enables personal daily expense posting and consumption. P3 delivers shared expense HTTP and Web CRUD, exact positions, batch settlements, two-party confirmation, immutable corrections, settled exit/archive and a four-viewport real-backend browser journey. P4 links only the current participant's authoritative shared allocation into an owned personal ledger without copying a transaction. P5 delivers the independent pooled ledger. P6 delivers mode-discriminated treasure home cards, current-context quick expense routing and actor-private tasks. P7 makes expense drafts durable and context-bound, removes the legacy universal Fund surface, and combines all modes in real-backend acceptance. Shared spaces retain the 16-current-participant limit matching bounded exact settlement search. See the phase plans and execution records under `docs/superpowers/plans/`.

## Backend Capability Map

The statuses in this section describe backend availability. The **Web / PWA** section is the authoritative record of active client delivery.

### Auth & Identity

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | user-register | Register through the PWA form and cookie-backed BFF route | `web/src/app/(auth)/register/page.tsx`, `web/src/app/api/auth/register/route.ts` | `auth.controller.ts POST /auth/register` |
| done | user-login | Log in through the PWA form and receive session cookies from the BFF route | `web/src/app/(auth)/login/page.tsx`, `web/src/app/api/auth/login/route.ts` | `auth.controller.ts POST /auth/login` |
| done | user-logout | Clear PWA auth cookies and acknowledge backend logout; refresh tokens have no server-side revocation | `web/src/app/api/auth/logout/route.ts` | `auth.controller.ts POST /auth/logout` |
| done | token-refresh | Exchange a refresh token through the PWA refresh route and redirect expired sessions without a generic interceptor | `web/src/app/api/auth/refresh/route.ts`, `web/src/shared/auth/require-session.ts` | `auth.controller.ts POST /auth/refresh` |
| done | user-public-identity | Assign every account an immutable, unique `MIMIC-XXXX-XXXX` public identifier | `web/src/features/settings/settings-form.tsx` | `users.service.ts createUser()`, `users.controller.ts GET /me` |
| done | user-profile-view | View own email, display name, and public Mimic ID | `web/src/app/app/settings/page.tsx` | `users.controller.ts GET /me` |
| done | user-profile-update | Update own display name while keeping email and Mimic ID read-only | `web/src/features/settings/settings-form.tsx` | `users.controller.ts PATCH /me` |

### Groups & Membership

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | create-group | Create a new group (COUPLE or GROUP type) | `—` | `groups.service.ts createGroup()` |
| done | list-groups | List groups the current user belongs to | `—` | `groups.controller.ts GET /groups` |
| done | view-group-detail | View group name, type, members, and governed financial spaces | `—` | `groups.controller.ts GET /groups/:id` |
| done | update-group | Owner can rename a group | `—` | `groups.controller.ts PATCH /groups/:id` |
| done | list-members | View all active members with their display names, stable Mimic IDs, and roles | `web/src/features/groups/member-roster.tsx` | `groups.service.ts listMembers()` |
| done | update-member-role | Owner promotes/demotes another active member | `—` | `groups.controller.ts PATCH /groups/:id/members/:memberId` |
| done | remove-member | Owner removes a settled member while preserving history | `—` | `groups.controller.ts DELETE /groups/:id/members/:memberId` |
| done | leave-group | Active member leaves a group and reconciles the selected group | `—` | `groups.controller.ts POST /groups/:id/leave` |
| done | invite-member | Owner generates an invite code | `—` | `groups.controller.ts POST /groups/:id/invites` |
| done | accept-invite | User joins group via invite code | `—` | `group-invites.controller.ts POST /group-invites/accept` |
| done | archive-empty-group | The sole active owner can archive a group only when current financial-space lifecycle guards allow it | `web/src/features/groups/archive-empty-group-dialog.tsx` | `groups.controller.ts POST /groups/:id/archive`, `groups.service.ts archiveEmptyGroup()` |

### Categories

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | create-category | Create private or group vocabulary for new financial spaces | `/app/personal` (private) | `taxonomy.controller.ts POST /me/taxonomy`, `POST /groups/:groupId/taxonomy` |
| done | list-categories | Localized stable defaults and scoped custom categories/tags | `taxonomy-picker.tsx` | `GET /spaces/:spaceId/taxonomy` requires participation |
| done | taxonomy-lifecycle | Rename, merge or archive custom terms while retaining historical IDs | `taxonomy-manager.tsx` (private) | `taxonomy.service.ts`; system terms are immutable |

### Dashboard & Read Models

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | financial-space-home | Personal/group-context mode-specific cards with governance-only metadata projection | `/app` | `home.controller.ts GET /home` |
| done | actor-task-center | Due pooled occurrences, reimbursements, shared transfers and shortfalls scoped to the current participant | `/app/tasks` | `home.controller.ts GET /tasks` |

### Web / PWA

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | pwa-auth-shell | Public mimic landing, login/register, protected app shell, and PWA cache boundary | `web/src/app` | `auth.controller.ts`, BFF auth routes |
| done | pwa-group-list | List available groups and no-group onboarding | `web/src/app/app/page.tsx`, `web/src/app/app/groups/page.tsx` | `GET /groups`, `GET /home` |
| done | pwa-group-create | Create a group from the PWA | `web/src/app/app/groups/new/page.tsx` | `POST /groups` |
| done | pwa-group-detail | View group governance plus shared-expense and pooled-fund treasure-box entries without a legacy Fund panel | `web/src/app/app/groups/[groupId]/page.tsx` | `GET /groups/:id`, `GET /groups/:id/members`, `GET /groups/:id/spaces` |
| done | pwa-treasure-home | Switch personal/group context and open privacy-safe mode-specific status cards without a universal balance | `web/src/app/app/page.tsx`, `web/src/features/home/` | `GET /home` |
| done | pwa-quick-expense | Always-visible, current-context expense entry that skips or offers eligible box selection and opens the mode-specific form | `web/src/features/quick-expense/`, `pixel-app-shell.tsx` | Existing personal/shared/pooled expense routes |
| done | pwa-task-center | Show only current-user actionable contribution, reimbursement, settlement-transfer and shortfall tasks | `web/src/app/app/tasks/page.tsx`, `web/src/features/tasks/` | `GET /tasks` |
| done | pwa-group-rename | Rename a group from the PWA | `web/src/features/groups/group-detail.tsx` | `PATCH /groups/:id` |
| done | pwa-group-leave | Leave a group and reconcile selected-group preference | `web/src/features/groups/leave-group-dialog.tsx` | `POST /groups/:id/leave` |
| done | pwa-empty-group-archive | The sole active owner can use exact-name confirmation when current financial-space lifecycle guards allow archival | `web/src/features/groups/archive-empty-group-dialog.tsx`, `web/src/features/groups/group-detail.tsx` | `POST /groups/:id/archive` through the Web BFF |
| done | pwa-member-roster | Display active members with stable Mimic IDs and role labels | `web/src/features/groups/member-roster.tsx` | `GET /groups/:id/members` |
| done | pwa-invitation-loop | Create, share, open, authenticate for, and explicitly accept invites | `web/src/features/invitations` | `POST /groups/:id/invites`, `POST /group-invites/accept` |
| done | pwa-join-group-entry | Open a dedicated Join group page, enter a raw invite code or complete invite link, and continue through explicit invitation confirmation | `web/src/app/app/groups/join/page.tsx`, `web/src/features/invitations` | `POST /group-invites/accept` through the existing confirmation flow |
| done | pwa-pixel-responsive-shell | Responsive pixel UI foundation for public and authenticated routes across phone, tablet, and desktop viewports | `web/src/shared/brand`, `web/src/shared/ui`, `web/src/app/app-shell.module.css` | n/a |
| done | pwa-account-settings | View account identity, edit display name, copy Mimic ID, and sign out | `web/src/app/app/settings/page.tsx`, `web/src/features/settings/settings-form.tsx` | `GET /me`, `PATCH /me`, `POST /auth/logout` |
| todo | pwa-public-pixel-world | Bring landing, authentication, and feature pages to the approved full-screen deep-navy pixel-world composition | `web/src/app/(public)`, `web/src/features/auth` | n/a |
| todo | pwa-role-changes | Promote or demote group members in the PWA | missing PWA governance UI | `PATCH /groups/:id/members/:memberId` |
| todo | pwa-member-removal | Remove another member from a group in the PWA | missing PWA governance UI | `DELETE /groups/:id/members/:memberId` |

### Audit Logs

| status | slug | description | PWA entry | backend entry |
|--------|------|-------------|----------------|---------------|
| todo | list-audit-logs | View history of all mutations in a group | — | missing module entirely |

---

## TODO Backlog

### Deployment & Operations

- [x] Railway IaC contract defines isolated `staging`/`production` Web, API, and PostgreSQL foundations without secret literals
- [x] Railway deployment runbook documents per-environment plan/apply, readiness, migration, domain, rollback, and Production approval gates
- [x] Error-only Sentry integration and encrypted/signed PostgreSQL backup/restore tooling are repository-ready for the PG18 contract
- [x] Apply and verify the reviewed IaC plan in Staging, including private API routing, JWT secrets, exact Web-origin CORS, and Web-only public HTTPS
- [x] Retire the temporary bootstrap source and verify Staging Web/API deploy persistently from the reviewed `main` SHA
- [x] Run real Railway Linux image builds, migrations, health checks, and real-API acceptance
- [ ] Complete API/Web Sentry synthetic-error delivery and privacy-allowlist inspection
- [ ] Enable and verify daily PostgreSQL volume backups in Staging and Production, plus Production PITR
- [x] Upgrade and pin the backup/restore image to PostgreSQL client 18 before creating the Railway backup service
- [ ] Provision the dedicated `mimic_backup` role and immutable external storage, then add an unscheduled private backup service for a manual backup and scratch restore drill
- [ ] Add the Production backup cron only after the unscheduled service and every recovery gate pass
- [ ] Keep Production closed until all five Closed Beta plans and release gates pass

### Auth & Identity
- [x] Backend keeps temporary POST compatibility while canonical clients use PATCH /me
- [x] Verify PWA token refresh retries an expired access token after a 401
- [x] Expose an immutable public Mimic ID and account Settings with display-name editing and logout

### Groups & Membership
- [x] Role promotion/demotion, settled-member removal, and self-leave governance flows
- [x] Sole-active-owner safe archive using current financial-space participation and lifecycle guards

### Categories
- [x] Neutral taxonomy module with private/group scope, stable system defaults and historical merge/archive semantics
- [x] Personal PWA category/tag picker and private term management
- [x] Connect group vocabulary to the P3 shared expense form
- [x] Connect the same vocabulary to P5 pooled expense forms

### Dashboard & Read Models
- [x] Actor-scoped personal/group home and task projections without a universal balance

### Audit Logs
- [ ] Entire audit module (NestJS module + controller)
- [ ] Add an actor-scoped audit history projection without exposing another participant's private metadata

### Database
- [x] Financial-space migrations, legacy table removal, and explicit task-owned PostgreSQL suites

### Stabilization
- [x] PWA: four-viewport real-backend Playwright acceptance for all three modes, durable drafts, privacy and retired bookmarks
- [x] Backend: shared writes reject temporary/permanent locked periods and preserve corrections as later signed records
- [x] Backend/Web: retired Fund endpoints and pages are absent and return privacy-safe not-found responses
- [x] PWA: the public invite page derives its session-present acceptance UI state from the optional access-token cookie boundary; acceptance authorization remains backend-enforced
- [x] Backend: authenticated group and invite integration tests cover route wiring, validation, and authorization
- [x] Shared settlement minimum-transfer algorithm verified against bounded exact accounting invariants
