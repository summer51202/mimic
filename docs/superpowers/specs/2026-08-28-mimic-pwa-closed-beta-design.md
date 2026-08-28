# Mimic PWA Closed Beta Design

Date: 2026-08-28
Status: Approved for implementation planning

## 1. Objective

Deliver Mimic as a production-like, mobile-first Web PWA for a four-week closed beta with 10–30 approved users entering real shared-finance data.

The beta must support the complete accounting loop:

1. Register from an approved email and verify ownership.
2. Create or join a group.
3. Create a fund and group categories.
4. Create, view, edit, soft-delete, and restore unlocked contributions and expenses.
5. Support multi-payer expenses and EQUAL, RATIO, FIXED, and HYBRID splits.
6. Review unified activity and owner-visible audit history.
7. Generate and complete a settlement.
8. Prevent all retroactive mutation inside completed settlement periods.
9. Correct mistakes with a new correction transaction.

The delivery strategy is risk-first vertical slicing: establish the safety and deployment foundation, then deliver each user journey from database through PWA and staging acceptance.

## 2. Scope and Non-Goals

### In scope

- Mimic naming across active product code, packages, configuration, seed data, deployment resources, and current documentation.
- Removal of the Flutter `mobile/` tree from the active repository. Git history remains the recovery mechanism.
- Next.js PWA, NestJS API, PostgreSQL, and a thin browser-facing BFF.
- Contribution and expense detail plus complete unlocked-period CRUD with soft deletion and restoration.
- Group-managed categories with defaults and archival.
- Settlement suggestions, completion, cancellation where already supported, history, and period locking.
- Canonical correction transactions as `ContributionType.CORRECTION`.
- Complete mutation auditing and an owner-visible group audit view.
- Database-backed beta email allowlisting.
- Resend email verification and password reset.
- Session rotation, CSRF protection, rate limiting, and security hardening.
- Railway staging and production environments.
- Minimal, privacy-filtered Sentry monitoring.
- Three-layer PostgreSQL backups and recovery exercises.
- Manual operator-assisted data export and account de-identification for the beta.

### Explicit non-goals

- Native Android or iOS packaging.
- New Flutter features or preservation of Flutter as an active build target.
- Public registration.
- Offline financial writes or background synchronization.
- Bank connections, real money custody, currency exchange, or payment execution.
- Push notifications, MFA, passkeys, recurring contributions, or a general administration UI.
- Public financial reports, CMS, or unrelated visual redesign.

### Rename exceptions

The active product must use Mimic naming by beta launch. Applied Prisma migration files, historical `.agents/devlog.md` entries, and Git history remain unchanged because they are immutable historical records. Transitional aliases for old environment variables may exist for one staging deployment, but production launch accepts only `MIMIC_*` names.

## 3. System Architecture

```text
Browser / installed PWA
  -> Next.js application
       -> BFF routes: session cookies, CSRF, API forwarding
            -> NestJS API: authorization and domain rules
                 -> PostgreSQL: system of record
```

### Next.js PWA

Owns page rendering, responsive navigation, form state, field-level validation, session-facing routes, metadata, PWA resources, and presentation error states.

It does not implement accounting calculations, authorization decisions, settlement rules, or authoritative validation.

### BFF

Owns `HttpOnly` cookie handling, CSRF enforcement, controlled refresh, request ID propagation, and forwarding to NestJS. It must not persist business state or silently retry financial writes.

### NestJS API

Is the only source of truth for:

- authorization and active membership;
- minor-unit money validation;
- payer and split allocation;
- categories;
- transaction state transitions;
- settlement calculation and period locking;
- corrections;
- idempotency;
- AuditLog creation;
- account and beta-access state.

### PostgreSQL

Stores all authoritative state. Monetary values remain integer minor units. Business records are soft-deleted; no user-facing workflow hard-deletes financial history.

## 4. Railway Topology

Use one Railway project with isolated Staging and Production environments.

```text
Staging
  mimic-web-staging
  mimic-api-staging
  mimic-postgres-staging

Production
  mimic-web
  mimic-api
  mimic-postgres
  mimic-backup-job
```

Each environment has independent databases, JWT secrets, cookie names, Resend configuration, Sentry environment tags, domains, and backup settings. Services run in the supported Asian region nearest the beta population.

External dependencies are limited to:

- Resend for verification and password-reset email;
- Sentry for filtered errors and low-volume tracing;
- object storage outside Railway for portable logical backups.

## 5. Accounting Integrity

### Common domain services

Controllers only translate HTTP requests and responses. Shared domain services own lock checks, contribution validation, expense validation, split allocation, positions, settlement suggestions, corrections, idempotency, and auditing.

### Transaction lifecycle

Contributions and expenses support:

- list and detail;
- create;
- update while unlocked;
- soft-delete while unlocked;
- restore while unlocked.

Every update, delete, or restore reloads current server state and checks authorization, record status, and settled-period coverage inside the same database transaction as the mutation.

### Settlement locking

A completed settlement permanently locks its inclusive fund date range. Any contribution, expense, or correction whose effective date falls in that range is immutable. HTTP and PWA surfaces return and handle the stable `SETTLED_PERIOD_LOCKED` code.

### Corrections

New corrections use `ContributionType.CORRECTION`; locked source records are never edited. A correction records the referenced transaction, a plain-language reason, actor, and a date in the current unlocked period.

Existing `ExpenseType.CORRECTION` rows, if any, remain readable historical records and participate according to the schema version that created them. New PWA and API creation flows use the canonical contribution correction path. Migration verification must prove that existing records retain their accounting effect.

### Categories

- New groups receive a controlled set of default categories.
- Owners can create, rename, and archive categories.
- Archived categories cannot be assigned to new expenses.
- Historical expenses retain and display their referenced category.
- Referenced categories are never hard-deleted.

### Determinism and concurrency

- Settlement suggestions use deterministic ordering and ignore non-ACTIVE records.
- Every financial write accepts an idempotency key.
- Repeating the same actor, endpoint, and key returns the original result.
- Reusing a key with different input returns `IDEMPOTENCY_CONFLICT`.
- Concurrent edits use a version or updated-at precondition and return a stable conflict instead of silently overwriting.

## 6. Audit Trail

Every auth, group, member, fund, category, contribution, expense, settlement, beta-access, export, and account-state mutation creates an AuditLog in the same transaction as the business mutation.

Each entry stores:

- actor or platform actor;
- action;
- target type and identifier;
- group scope where applicable;
- timestamp;
- request ID;
- filtered before/after changes.

Audit payloads never contain passwords, JWTs, cookies, verification/reset tokens, complete emails, request bodies, or unfiltered financial notes.

Group owners can list their group's audit events and filter by date, actor, action, and target type. They cannot read platform-level events or another group's events. The UI shows a safe human-readable summary, not raw audit JSON.

## 7. Closed-Beta Identity and Security

### Email allowlist

`BetaAllowlistEntry` stores canonical email, status, creator, and timestamps. Railway one-off operator commands add, disable, and list entries. No public administration UI is included.

Registration requires an ACTIVE allowlist entry. External responses do not reveal whether an address is allowlisted or registered. Group invites do not bypass beta access.

Email normalization lowercases the domain and applies one documented comparison policy. Provider-specific transformations such as Gmail dot removal are prohibited.

### Email verification

- Registration creates a `PENDING_VERIFICATION` account.
- Resend sends a cryptographically random, single-use link valid for 24 hours.
- Only the token hash is stored.
- Successful verification consumes the token atomically.
- Resend attempts and verification attempts are rate-limited and audited without storing the token or complete email.

### Password reset

- Request responses and approximate timing do not disclose account existence.
- Reset tokens are single-use, independently typed, and valid for 30 minutes.
- Resetting a password revokes every session for the account.

### Sessions

- Access and refresh credentials are stored only in `HttpOnly`, `Secure` cookies with an explicit SameSite policy.
- Refresh tokens rotate and are stored as hashes.
- Reuse of an invalidated refresh token revokes the session family.
- State-changing BFF routes require CSRF validation.
- Login, registration, verification, resend, forgot-password, and reset-password have independent per-IP and per-identity limits.

Production enforces HTTPS, security headers, strict CORS, trusted-proxy configuration, secure secret storage, and separate staging/production credentials.

## 8. PWA Product Surface

Required authenticated routes:

```text
/app
/app/groups
/app/groups/:groupId
/app/groups/:groupId/categories
/app/groups/:groupId/audit
/app/funds/:fundId
/app/funds/:fundId/activity
/app/funds/:fundId/contributions
/app/funds/:fundId/contributions/new
/app/funds/:fundId/contributions/:id
/app/funds/:fundId/expenses
/app/funds/:fundId/expenses/new
/app/funds/:fundId/expenses/:id
/app/funds/:fundId/settlements
/app/settings
/app/settings/security
```

### Core interaction model

- Fund detail exposes Add contribution, Add expense, Activity, and Settle.
- Contribution and expense features use consistent list, detail, create, and edit patterns.
- Expense editing supports multiple payers and EQUAL, RATIO, FIXED, and HYBRID modes.
- Client-side totals explain allocation differences, but NestJS always recalculates.
- Activity combines contributions, expenses, corrections, deletion/restoration events, and settlements with stable ordering.
- Locked records remove edit/delete/restore controls and offer Create correction.
- Category management and AuditLog are owner-only group surfaces.
- Settings covers account state, session management, export/deletion instructions, and logout.

The existing mobile-first pixel visual language remains. Phones use bottom navigation and wide screens use side navigation. This phase does not redesign the brand system.

### Failure behavior

- Network failures preserve unsent form input and offer manual retry.
- Financial submits disable duplicate interaction and attach an idempotency key.
- Financial writes are never blindly retried.
- Successful writes re-read authoritative server state.
- Validation errors attach to fields.
- `SETTLED_PERIOD_LOCKED` leads to correction.
- Authorization, archival, and concurrency conflicts show explicit recovery actions.
- Unknown failures show a tracking ID that maps to Sentry and Railway logs.
- Service workers never persist authenticated pages or financial API responses.

## 9. Personal Data Lifecycle

Before beta enrollment, Mimic publishes a concise Privacy Notice and Beta Terms covering collected data, processors, service limitations, retention, export, and deletion.

For 10–30 users, export and deletion are operator-assisted:

1. The user contacts the designated support address.
2. An operator creates a request through a Railway one-off command.
3. Mimic exports only that user's personal data, membership relationships, and transaction roles.
4. The user confirms deletion.
5. Mimic performs de-identification and records the platform audit event.

De-identification:

- revokes all sessions and disables login;
- replaces email with a non-deliverable tombstone identifier;
- replaces display name with `Former member`;
- removes locale, timezone, and nonessential profile fields;
- inactivates memberships;
- preserves internal user references required by shared ledgers, settlements, and AuditLog;
- never exposes the former email or name to group members.

A later beta enrollment with the same real-world email creates a new user ID and never revives the old account.

Backups are not rewritten. A durable deletion-tombstone ledger is reapplied after any restore so restored personal data is de-identified before normal service resumes.

## 10. Observability and Privacy

Railway owns infrastructure metrics, deployments, raw service logs, and health status. Sentry owns grouped application errors, releases, alerts, and low-volume distributed traces.

Sentry receives only:

- pseudonymous user identifier;
- request ID;
- route template;
- status and stable error code;
- stack trace;
- release and environment.

Sentry must not receive IP addresses, email, display name, tokens, cookies, headers containing credentials, request/response bodies, transaction titles, notes, amounts, or complete query strings. Session Replay, profiling, attachments, and AI debugging remain disabled.

The beta begins on Sentry's one-user Developer plan. Alerting covers P0/P1 events, error spikes, and release regressions.

## 11. Deployment and Database Change Safety

### Delivery pipeline

1. Pull requests run Backend unit/e2e/build and Web lint/typecheck/test/build.
2. Merge deploys Staging.
3. Staging applies migrations and runs real-API Playwright plus smoke checks.
4. Production promotion requires explicit approval.
5. Production uses `prisma migrate deploy`; `migrate dev` is forbidden.

Schema evolution follows expand, data migration, then contract. A high-risk migration requires a manual snapshot, a portable logical dump, and a rehearsed recovery command before production execution.

### Health

- `/health/live` proves the process responds.
- `/health/ready` verifies database connectivity, required configuration, and expected migration version.
- Railway only routes to ready application instances.
- A failed deploy retains the last healthy version.

Resend or Sentry outages must not block established users from core accounting. New verification and password-reset email pause safely while Resend is unavailable.

## 12. Backup and Recovery

Production PostgreSQL uses three layers:

1. Daily Railway volume snapshots retained for six days.
2. Railway point-in-time recovery retained for approximately four weeks.
3. Encrypted weekly `pg_dump` files stored outside Railway and retained for 90 days.

A restore drill runs before beta and monthly thereafter using Staging or a scratch database. Each drill records:

- backup age;
- restore duration;
- table row counts;
- migration state;
- accounting invariant checks;
- deletion-tombstone reapplication.

Recovery objectives are:

- RPO: 15 minutes.
- RTO: 4 hours.

Runbooks cover a bad migration, accidental data mutation, corrupted/unavailable PostgreSQL, loss of the Railway project, Resend outage, and Sentry outage.

## 13. Testing Strategy

### Unit tests

- minor-unit handling;
- payer and split allocation;
- positions and settlement suggestions;
- deterministic ordering;
- lock checks;
- token expiry and email normalization;
- AuditLog filtering;
- account de-identification.

### Service and database integration tests

- business mutation and AuditLog atomicity;
- unlocked CRUD and soft-delete/restore;
- lock enforcement for every mutation;
- idempotency and concurrency;
- refresh rotation and reuse detection;
- correction migration compatibility.

### HTTP e2e tests

- allowlist, registration, verification, login, refresh, logout, and password reset;
- group and member governance;
- categories;
- complete contribution and expense lifecycle;
- settlement and locking;
- correction;
- audit authorization;
- export and de-identification operator flows.

### PWA tests

- allocation editors and form errors;
- locked states and correction transitions;
- draft preservation after connectivity failure;
- responsive navigation and narrow layouts;
- keyboard and baseline accessibility behavior;
- service-worker privacy boundaries.

### Staging acceptance

Playwright uses the actual Staging NestJS API and PostgreSQL. Mock API tests remain useful regression tests but cannot satisfy the release gate.

The critical scenario registers and verifies two allowlisted users, joins them into one group, creates categories and a fund, exercises contribution and expense CRUD, completes a settlement, proves the period is immutable, posts a correction, verifies positions and activity, inspects AuditLog, and rehearses export/de-identification.

## 14. Release Gate and Beta Success

Production beta launch requires:

- every automated test, lint, typecheck, and build passing;
- real-backend Staging Playwright passing;
- no unresolved P0 or P1 issue;
- successful migration and backup-restore drills;
- proof that Sentry receives no prohibited data;
- published Privacy Notice and Beta Terms;
- a working support address and incident contact procedure.

Four-week success criteria:

- zero data loss;
- zero settled-period invariant violations;
- no P0/P1 issue during the final seven consecutive days;
- at least 95% success across defined core-flow attempts;
- at least half of active beta groups complete one settlement.

A P0 stops rollout immediately. A P1 freezes new allowlist additions until the fix and regression verification reach production.

## 15. Delivery Sequence

1. Establish clean Mimic naming, remove Flutter, and preserve immutable history exceptions.
2. Add Railway Staging/Production configuration, CI gates, health endpoints, Sentry filtering, and backup scaffolding.
3. Add allowlist, Resend verification, password reset, and rotating sessions.
4. Deliver contribution detail and unlocked lifecycle end to end.
5. Deliver category management end to end.
6. Deliver expense, payer, split, and correction lifecycle end to end.
7. Deliver settlement, locking, and unified activity end to end.
8. Complete all mutation auditing and owner audit UI.
9. Deliver export/de-identification operator flows and deletion-tombstone restore handling.
10. Run migration, recovery, security, privacy, and real-backend acceptance gates.
11. Launch the allowlisted four-week beta and evaluate the defined success criteria.

## 16. Implementation-Plan Decomposition

This design is a beta program, not a safe single coding batch. Implementation planning must preserve the delivery sequence while splitting execution into five independently verifiable plans:

1. **Mimic baseline and Railway safety:** active-code rename, Flutter removal, CI, environments, health checks, Sentry privacy, and backup scaffolding.
2. **Closed-beta identity:** allowlist, Resend verification, password reset, rotating sessions, rate limits, and browser security.
3. **Accounting mutation foundation:** centralized lock/idempotency/audit services, contribution lifecycle, categories, and migration compatibility.
4. **PWA accounting closure:** expenses and splits, corrections, settlements, activity, owner audit view, and real-backend browser acceptance.
5. **Data lifecycle and launch:** export, de-identification, tombstone replay, restore drills, privacy documents, production promotion, and beta operations.

Each plan must leave Staging deployable and its own tests green. Production promotion occurs only after all five plans and the complete release gate pass.
