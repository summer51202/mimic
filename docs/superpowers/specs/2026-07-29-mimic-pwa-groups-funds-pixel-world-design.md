# mimic PWA Groups, Funds, and Pixel World Design

## Objective

Replace the authenticated PWA preview shell with the first genuinely usable mimic product slice. A signed-in user can create and switch groups, view members, rename or leave a group, complete an invitation loop with another account, create funds, and inspect real fund summaries from the NestJS API.

The authenticated experience adopts the approved complete pixel-game visual direction. Phones use the compact single-column adventure interface shown in the approved reference. Wider screens expand the same world into an adventure HUD with a persistent navigation rail, a wide treasury scene, and denser multi-column data views.

This slice stops before contribution, expense, activity-history, and settlement creation. Those workflows remain a separate Financial Activity phase.

## Product Boundary

### Included

- A real `/app` dashboard backed by the selected group and its dashboard read model
- Group listing, switching, creation, detail, and rename
- Member roster with roles
- Group departure with a serious confirmation flow
- Invite creation, link sharing, login or registration return, explicit acceptance, and success routing
- Fund listing, creation, detail, and summary
- Complete pixel-game styling across these authenticated routes
- A production-ready first set of Mimiku, interface, avatar, frame, icon, and scene assets
- Responsive phone, tablet, and desktop behavior
- Loading, empty, authorization, invitation, connectivity, and session-expiration states
- Unit, component, BFF integration, end-to-end, visual, accessibility, and PWA privacy verification

### Deferred

- Contributions and contribution history
- Expenses, payers, allocations, and activity history
- Settlement suggestions, completion, cancellation, and history
- Member role promotion or demotion
- Removing another member
- Fund editing, archival, or restoration
- Offline financial reads or writes
- Push notifications

The UI may reserve compositional space for recent activity and future transaction actions, but it must not display fake transactions or enabled controls for deferred workflows.

## Experience Direction

### Complete Pixel World

The approved visual reference is the target, not a loose inspiration. The authenticated product uses a coherent pixel-game language for:

- navigation bars and rails
- panels and treasury frames
- buttons, dialogs, inputs, focus states, and notices
- group, member, fund, invite, settings, and status icons
- avatars and empty states
- Mimiku character states
- mobile and desktop treasury scenes

The operational surface remains precise. Amounts, group names, roles, dates, errors, permissions, and actions are real HTML text with accessible semantics. Important content is never baked into an image. Financial concepts keep literal language and are not renamed with game metaphors.

### Responsive Model

Phones use:

- a dark pixel top bar
- a single-column treasury and data stack
- stable bottom navigation
- full-screen forms and task flows
- large, thumb-reachable primary actions

Desktop and wide tablet layouts use the approved expanded adventure HUD:

- a dark pixel top bar
- a persistent left quest rail
- a wide treasury hero
- side-by-side member and fund regions where space permits
- dialogs or constrained task surfaces for short actions

Phone and desktop layouts share routes, data components, forms, validation, and mutation behavior. CSS layout containers change placement; the application does not maintain separate feature implementations.

## Information Architecture

### Core Routes

| Route | Responsibility |
|---|---|
| `/app` | Selected-group treasury dashboard, group switcher, members preview, funds preview, and next valid action |
| `/app/groups` | Group list, switching, no-group state, and create-group entry |
| `/app/groups/new` | Create a group |
| `/app/groups/[groupId]` | Group details, rename action, member roster, invitation entry, leave action, and fund list |
| `/app/groups/[groupId]/invite` | Create an invitation and copy or share its link |
| `/invite/[code]` | Safe invitation entry, authentication return, explicit acceptance, and invitation terminal states |
| `/app/groups/[groupId]/funds/new` | Create a fund in the selected group |
| `/app/funds/[fundId]` | Fund identity, current period, real totals, member positions, and future-work boundary |

The existing `/login` and `/register` routes accept a validated relative `returnTo` for invitation continuation.

### Group Selection

The selected group is represented in the dashboard URL and remembered as a non-authoritative preference. NestJS membership authorization remains authoritative. On entry:

1. Use a valid group from the URL when the user is an active member.
2. Otherwise use the remembered group when still valid.
3. Otherwise use the first active group returned by the API.
4. If no group exists, render the no-group onboarding state.

If access disappears, clear the invalid preference and repeat the fallback sequence. A client-provided group ID never bypasses backend authorization.

### Navigation

The active navigation destinations in this phase are Overview and Groups. Activity remains unavailable until the Financial Activity phase supplies real data, and Settings remains unavailable until the profile/settings PWA phase. Unavailable destinations are not styled as actionable links.

## Primary Journeys

### First Group and Fund

1. Sign in and arrive at the no-group dashboard.
2. Choose Create group.
3. Enter the name, group type, and default currency.
4. Arrive at the new group detail.
5. Choose Create fund.
6. Enter the fund name and currency.
7. Arrive at the real fund summary.
8. Return to a dashboard that shows the created group and fund.

### Complete Invitation Loop

1. An authorized member opens the group invitation surface.
2. The member optionally targets an email and creates a seven-day invitation.
3. The PWA produces a copyable and shareable `/invite/[code]` URL.
4. A recipient opens the URL.
5. If unauthenticated, the recipient signs in or registers and returns to the same validated invitation URL.
6. The recipient explicitly confirms joining.
7. The BFF calls the existing NestJS acceptance endpoint.
8. The PWA routes to the joined group detail and displays the updated roster.

Opening a URL never automatically accepts an invitation. Before authentication, the public page exposes no private group, membership, or financial data.

### Rename and Leave

Renaming is available to members authorized by NestJS. The UI submits the new name once and revalidates group and dashboard reads after success.

Leaving a group uses a serious confirmation dialog that states the consequence directly. The UI does not predict whether departure is permissible. NestJS decides based on membership and reconciliation rules. After success, the invalid selected-group preference is removed and the dashboard fallback sequence runs.

## System Architecture

### Next.js PWA

Next.js owns:

- routes and responsive composition
- pixel-world presentation
- accessible forms and dialogs
- selected-group preference and safe return routing
- loading, error, empty, and retry states
- server-side reads and post-mutation revalidation
- same-origin BFF endpoints

Server Components perform initial private reads where practical. Focused Client Components own interactive selectors, forms, dialogs, sharing, and optimistic button state. Financial totals are never optimistically invented.

### BFF Boundary

The BFF:

- reads the existing HttpOnly access and refresh cookies
- requires double-submit CSRF on state-changing requests
- forwards request IDs
- calls NestJS with `cache: "no-store"`
- parses the `{ data: ... }` envelope
- maps known API error codes into typed presentation errors
- attempts at most one controlled session refresh
- never returns JWTs to browser JavaScript

The BFF may combine presentation reads but does not implement membership, invitation, currency, balance, or settlement rules.

### NestJS and PostgreSQL

NestJS remains authoritative for:

- active membership and roles
- group creation, rename, and departure
- invitation generation, expiry, target email, status, and atomic acceptance
- fund creation and membership authorization
- fund and group dashboard read models
- money in minor units
- audit behavior and domain error codes

PostgreSQL remains the system of record. This phase should require no accounting-schema migration. Backend changes are limited to contract gaps proven necessary by the PWA, such as a safe authenticated invitation preview; no public endpoint may expose private group data before authentication.

The contract audit must correct three existing fund-route gaps before the PWA consumes them:

- fund creation must verify that the actor is an active member of the target group
- fund listing must verify that the actor is an active member of the target group
- the legacy fund-detail route must verify active membership or be retired from new PWA use in favor of the already-authorized summary route

All minor-unit response fields become base-10 integer strings at the API boundary. This prevents Prisma `bigint` values from passing through JavaScript `number`. Existing Flutter remote mappers are updated in the same compatibility slice to accept canonical integer strings before the backend switches the affected fields.

## Frontend Module Boundaries

### Shared Application Shell

- `PixelTopBar`
- `DesktopQuestRail`
- `MobileBottomNav`
- `GroupSwitcher`
- `ConnectionBanner`

These components know navigation and layout state, not group or fund business rules.

### Group Feature

- typed group and member contracts
- group queries
- create and rename schemas
- `GroupList`
- `GroupForm`
- `GroupDetail`
- `MemberRoster`
- `LeaveGroupDialog`

### Invitation Feature

- typed invitation contracts and error mapping
- return URL validation
- `InviteCreatePanel`
- `InviteSharePanel`
- `InviteAcceptPanel`
- explicit terminal states for not found, expired, already used, email mismatch, already a member, and successful acceptance

### Fund Feature

- typed fund, dashboard, and summary contracts
- fund queries
- create-fund schema
- `FundList`
- `FundForm`
- `FundLedgerCard`
- `FundSummary`
- `PeriodSummary`
- `MemberPositionList`

### Shared Finance Presentation

- `MoneyAmount` formats backend minor-unit values without floating-point arithmetic
- currency metadata supplies fraction digits and display symbols
- minor-unit values remain signed base-10 integer strings from NestJS through the BFF and are converted to `bigint` only inside formatting and comparison helpers

## Pixel Asset System

### Character Assets

The first set includes consistent Mimiku art for:

- dashboard guardian
- no-group state
- no-fund state
- invitation reminder
- successful creation or acceptance
- serious permission, departure, or error state

Every derivative preserves the approved Mimiku anatomy, palette, outline weight, heart coin, and fixed source grid.

### Interface Assets

The initial production set includes:

- group, member, fund, invite, overview, settings, notification, currency, copy, share, edit, leave, and status icons
- 16, 24, and 32 pixel source grids where needed
- reusable nine-slice panel frames
- primary, secondary, destructive, disabled, pressed, and focus button states
- four deterministic avatar archetypes with stable variants derived from user identity
- mobile and desktop treasury scenes

Raster assets are lossless, use nearest-neighbor display, and render at integer scale factors wherever practical. Source grids, palette, prompts or provenance, intended sizes, and export rules are documented beside the assets.

### Tokens and Accessibility

The existing mimic color, spacing, type, and motion tokens are extended rather than replaced. Pixel display type is limited to concise headings, labels, and selected amounts. Traditional Chinese body text and form content use the established readable sans-serif stack.

Focus indication, hover, pressed, disabled, error, and reduced-motion states are first-class. Icon-only controls have accessible names and tooltips where meaning is not universal.

## Data and Mutation Behavior

Private reads use `no-store` and render explicit loading or retry states. Mutations:

1. Validate on the client for immediate field feedback.
2. Validate again at the BFF and NestJS boundaries.
3. Disable duplicate submission while a request is in flight.
4. Do not automatically retry writes.
5. Preserve non-sensitive form input after recoverable connectivity errors.
6. Revalidate affected group, dashboard, member, and fund reads after success.

The UI may update non-authoritative navigation state immediately, but it waits for backend-confirmed data before displaying a new balance, member, group, or fund.

## Error and Edge-State Design

- **Read failure:** keep the application shell visible, show a scoped retry surface, and do not replace the whole product with a blank error page.
- **Validation:** attach errors to fields and preserve entered values.
- **Authorization:** explain that the current user cannot perform the action; do not imply that retrying will change permissions.
- **Invitation:** distinguish not found, expired, used, email mismatch, existing membership, and generic server failure.
- **Session:** attempt one refresh; on failure, route to login with a safe relative return destination.
- **Invalid selected group:** remove the preference and select the next valid group.
- **Connectivity:** retain safe input, provide manual retry, and never show stale private balances as authoritative.
- **Unknown failure:** show a request or tracking ID when available.
- **Departure:** use direct language and a serious Mimiku state; NestJS owns the final eligibility decision.

Mimiku copy is secondary to recovery instructions in all error states.

## PWA Privacy and Offline Behavior

The existing service-worker boundary remains:

- no `/app/**` document caching
- no `/api/**` response caching
- no persistent caching of group, member, invitation, fund, balance, or summary data
- no offline mutation queue

Offline navigation may render the safe application shell and connection guidance, but it does not display stored private financial content as current.

## Testing and Verification

### Unit Tests

- group, member, invite, fund, dashboard, and summary contract parsing
- safe relative `returnTo` validation
- selected-group fallback
- invitation error mapping
- minor-unit money formatting and currency fraction digits
- form schemas

### Component Tests

- no-group dashboard
- selected-group dashboard
- group switcher
- group create and rename forms
- member roster and role labels
- invitation create, share, accept, and terminal states
- leave confirmation and failure behavior
- fund create form and fund summary
- phone bottom navigation and desktop quest rail
- reduced-motion and keyboard interactions

### BFF Integration Tests

- HttpOnly cookie forwarding and controlled refresh
- CSRF rejection and acceptance
- request ID propagation
- envelope parsing and typed errors
- `no-store` behavior
- no token exposure to browser JSON

### End-to-End Acceptance

The primary Playwright flow is:

1. Sign in as the first account.
2. Create a group.
3. Create an invitation.
4. Open the invitation in an isolated second browser context.
5. Sign in or register as the second account.
6. Return to the invitation and explicitly accept it.
7. Verify both members in the group.
8. Create a fund.
9. View the backend-provided fund summary.
10. Switch away from and back to the group.

Additional E2E coverage verifies invalid and expired invitation states, unauthorized group access, duplicate-submit protection, group departure behavior, and session return routing.

### Visual and Browser Verification

Capture and inspect at:

- 320 x 720
- 390 x 844
- 768 x 1024
- 1440 x 900

Checks cover integer-scaled pixel art, navigation transitions, text overflow, dialogs, forms, empty states, focus visibility, keyboard use, 200% zoom, reduced motion, and desktop HUD expansion.

Chrome, Safari, Edge, and Firefox must support the core web flow. Installation and standalone behavior are verified where supported.

### PWA Privacy Verification

Production-build browser tests inspect Cache Storage and generated service-worker policy to confirm that authenticated documents, BFF responses, and NestJS data do not persist.

## Delivery Strategy

Implementation proceeds in vertical slices:

1. Stabilize group, member, invite, fund, dashboard, and summary contracts.
2. Extend tokens, reusable pixel UI primitives, and the first production asset set.
3. Replace the preview shell with the responsive app shell and no-group dashboard.
4. Deliver group list, selection, creation, detail, rename, member roster, and departure.
5. Deliver the complete invitation loop.
6. Deliver fund creation, list, detail, and summary.
7. Complete responsive, accessibility, PWA privacy, visual, and end-to-end verification.

Each slice includes API boundary work, real data, pixel presentation, tests, and a focused commit.

## Success Criteria

This phase is complete when:

- the authenticated preview placeholder is gone
- a new user can create a group and fund from the PWA
- two accounts can complete the full invitation loop
- group, member, fund, dashboard, and summary content comes from NestJS
- the approved complete pixel-game visual language is present on all in-scope phone and desktop routes
- desktop uses the expanded adventure HUD
- deferred transaction and settlement controls are not falsely enabled
- private financial responses remain outside persistent service-worker caches
- supported viewport, accessibility, unit, component, integration, and end-to-end checks pass
