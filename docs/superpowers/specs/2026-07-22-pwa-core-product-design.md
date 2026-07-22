# PairFund PWA Core Product Design

## Objective

Make a mobile-first Progressive Web App the long-term primary PairFund product. The PWA will replace the Flutter app as the main user experience while preserving the existing NestJS API, PostgreSQL data model, accounting rules, audit trail, and settlement locking invariant.

The Flutter app remains available during the migration and observation period. It is not deleted as part of this work.

## Product Shape

The product uses one Next.js application for public, search-indexable pages and the authenticated finance experience. This avoids maintaining separate marketing and application frontends while allowing each area to use the rendering mode that fits it.

### Public Area

- `/`: product introduction and primary value proposition
- `/features`: shared funds, expense splitting, contributions, and settlement locking
- `/invite/[code]`: group invitation preview followed by login or registration
- `/privacy`: privacy policy
- `/terms`: terms of service
- `/login`: login entry
- `/register`: registration entry

An article center, CMS, public financial reports, and other content publishing features are outside the first release.

### Authenticated Area

- `/app`: current group, fund balances, and recent activity overview
- `/app/groups`: create and join groups, manage members, and issue invitations
- `/app/funds/[id]`: fund overview
- `/app/funds/[id]/contributions`: contribution history and creation
- `/app/funds/[id]/expenses`: expenses, payers, and member allocations
- `/app/funds/[id]/settlements`: suggestions, confirmation, cancellation where supported, and history
- `/app/settings`: profile, session, and basic preferences

The first release matches the existing PairFund core workflow. It does not add new accounting behavior during the frontend migration.

## Experience Model

The application is mobile-first and responsive. Phones use bottom navigation and full-screen task flows. Wider screens use side navigation and denser data views. Both layouts share routes, application state, validation, and API contracts.

The PWA provides:

- HTTPS delivery and a web application manifest
- installation to supported device home screens
- a standalone display mode where supported
- static asset and public-page caching
- an offline application shell with clear connectivity state

The first release requires a network connection to read private financial state and perform financial writes. It does not queue contributions, expenses, corrections, or settlements offline.

## System Architecture

### Frontend

Next.js owns page rendering, responsive UI, navigation, form state, session-facing routes, metadata, and PWA resources. Public pages use static generation or server rendering as appropriate. Authenticated screens use client-side interaction while keeping initial access and session handling on the server boundary.

### Backend for Frontend

A thin Next.js backend-for-frontend (BFF) protects browser credentials and forwards authenticated requests to NestJS. It may combine presentation-oriented reads, but it must not implement accounting rules, authorization decisions, or settlement behavior.

### Domain Backend

NestJS remains the only source of truth for:

- authentication and authorization
- group and fund membership permissions
- minor-unit money validation and calculations
- contributions, expenses, payers, and splits
- settlement suggestions and completed-period locking
- correction records and audit logs

PostgreSQL remains the system of record.

## Authentication and Security

The BFF exchanges login credentials with NestJS and stores access and refresh credentials in cookies configured with `HttpOnly`, `Secure`, and an appropriate `SameSite` policy. JWTs are not stored in browser `localStorage`.

The implementation must include:

- CSRF protection for state-changing browser requests
- rate limits for login and sensitive operations
- server-side authorization in NestJS for every protected operation
- request IDs propagated through Next.js and NestJS
- safe session refresh and explicit reauthentication after refresh failure
- no persistent service-worker caching of account, group, fund, transaction, or settlement responses

Money continues to use minor units. API contracts must represent values without JavaScript floating-point conversion, using safe integers only where guaranteed or decimal digit strings otherwise.

## Data and Error Flow

The frontend uses one shared API client and a typed error model. It parses the existing API data envelope and maps backend errors into actionable presentation states.

- Validation errors are attached to the relevant fields.
- Authorization failures explain that the current member cannot perform the action.
- Locked-period failures prevent editing and direct the user toward a new correction record.
- Session expiration attempts one controlled refresh before requiring login.
- Connectivity failures retain unsent form input and offer manual retry.
- Unknown failures show a user-visible tracking ID and emit a monitoring event.

Read requests may use bounded automatic retries where safe. Financial writes are not blindly retried. Submit controls prevent duplicate actions, and successful writes trigger revalidation from the server.

## PWA Caching Policy

The service worker may cache versioned JavaScript, CSS, icons, fonts, the offline shell, and selected public pages. Authenticated API responses and private server-rendered content use network-first or no-store behavior and must not enter persistent service-worker caches.

Application updates must surface a controlled refresh path. A new service worker must not interrupt an in-progress financial form or silently reload the page.

Push notifications are deferred. The architecture may preserve a future notification boundary, but the first release does not request notification permission.

## Testing Strategy

### Unit Tests

- money formatting and minor-unit conversion boundaries
- API envelope parsing and error mapping
- form validation and session state transitions

### Component Tests

- payer and split editors
- settlement confirmation and locked-period states
- mobile and desktop navigation behavior
- connection and retry states

### End-to-End Tests

The critical acceptance flow is:

1. Register or log in.
2. Create or join a group.
3. Create a fund.
4. Add contributions.
5. Add a multi-payer or split expense.
6. Review balances and settlement suggestions.
7. Complete a settlement.
8. Verify that the settled period cannot be edited.
9. Add a correction as a new record where applicable.

### Browser and PWA Verification

The first release supports current Chrome, Safari, and Edge versions on phone and desktop form factors. Firefox must support the core web experience, but installation and advanced PWA capabilities may differ. Verification covers manifest validity, installation, standalone launch, update behavior, offline shell behavior, and responsive layouts.

## Migration Plan

### Phase 0: API Contract Audit

Document and stabilize request and response payloads, business error codes, authentication behavior, CORS requirements, cookie/BFF behavior, and request ID propagation.

### Phase 1: Foundation and Public Area

Create the Next.js application, responsive design system, public routes, login and registration, session boundary, manifest, and basic service worker.

### Phase 2: Groups and Funds

Implement group creation and joining, membership and invitations, fund lists, and fund summaries.

### Phase 3: Financial Activity

Implement contributions, expenses, multiple payers, allocation modes, validation, and activity history.

### Phase 4: Settlements

Implement balance views, settlement suggestions, completion and supported cancellation flows, history, and locked-period handling.

### Phase 5: Production Readiness and Cutover

Complete cross-browser testing, accessibility checks, monitoring, performance budgets, PWA installation and update verification, and the full end-to-end acceptance flow. After acceptance, make the PWA the primary product entry while retaining the Flutter app for an observation period.

## Deployment Model

A PairFund domain terminates HTTPS at a CDN or edge layer and routes users to Next.js. Browser requests requiring authentication pass through the Next.js BFF to the NestJS API. NestJS connects to PostgreSQL. Frontend monitoring and backend structured logs share request IDs for incident tracing.

Public and authenticated routes may share one deployment, but private responses must not be publicly cached. Secrets, refresh credentials, and database access remain server-side.

## Explicit Non-Goals

- offline creation or synchronization of financial records
- Google Play or App Store packaging
- LINE Mini App integration
- public financial reports
- article CMS
- push notifications in the first release
- reimplementation of accounting rules in Next.js
- deletion of the Flutter application during migration

## Success Criteria

The design is successful when a user can complete the critical acceptance flow on supported phone and desktop browsers, install the PWA on supported devices, safely resume sessions, receive actionable business errors, and observe settlement locking behavior identical to the existing NestJS rules. Public product and invitation pages must provide indexable metadata and useful social previews without exposing private financial data.
