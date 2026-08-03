# mimic PWA Stabilization and Delivery Polish Design

## Objective

Turn the completed groups-and-funds PWA slice into a defensible staged deliverable. Every navigation destination must resolve to a real product surface, authenticated pages must fail safely when the backend is unavailable, and user-provided text and financial values must remain inside their visual containers from 320 px phones through 1440 px desktops.

This stabilization phase precedes Financial Activity. It does not add contributions, expenses, settlements, offline financial data, or background mutation retries.

## Confirmed Defects

- The available Funds navigation item links to `/app/funds`, but no page exists at that route.
- The application shell always marks Overview as current because it receives a hard-coded `/app` pathname.
- An upstream connection failure escapes as `TypeError: fetch failed` and can replace the authenticated product with a Next.js runtime error page.
- The authenticated route tree has no product-level loading, error, or not-found recovery surfaces.
- The 320 px bottom navigation gives five equal columns to horizontal icon-and-label layouts, making labels vulnerable to excessive wrapping and frame overflow.
- Long group, fund, and member names and large signed amounts do not have a consistent wrapping and shrinking policy.
- Global `overflow-x: hidden` can conceal clipping while the current E2E overflow assertion still passes.
- Backend-backed E2E coverage skips when health checks fail and navigates directly to detail URLs instead of exercising the primary navigation.

## Product Scope

### Included

- A real `/app/funds` overview grouped by the user's active groups
- Correct active navigation state on Overview, Groups, and Funds routes, including nested routes
- Stable mobile bottom navigation and desktop side navigation
- Standard upstream timeout and connectivity error mapping
- Mimiku-branded loading, recoverable error, not-found, authorization, and unavailable-service states
- Responsive hardening for long names, long unbroken text, negative values, and large monetary values
- Backend runtime preflight and deterministic local verification guidance
- Regression tests for every confirmed defect
- Authenticated visual and geometry checks at 320 x 720, 390 x 844, 768 x 1024, and 1440 x 900

### Deferred

- Contributions, expenses, corrections, settlements, and unified activity
- Fund editing, archival, or restoration
- Member role changes and removal
- Client-side financial query caches
- Offline private financial reads
- Automatic retry of mutations
- A broad redesign of the approved mimic pixel visual system

## Funds Overview

`/app/funds` is a first-class destination. It lists accessible funds under their owning groups and never combines balances across currencies.

The page loads the user's groups, then loads each group's funds through the existing authorized contracts. Each group section shows its name, a link to group detail, its funds, and a create-fund entry. Each fund row shows the fund name, currency, formatted balance, and a link to `/app/funds/[fundId]`.

States are explicit:

- no groups: show the established create-group onboarding action
- groups with no funds: show a group-scoped empty state and create-fund action
- mixed groups: show empty and populated sections together
- inaccessible group discovered during loading: do not omit it silently; render a scoped authorization state without private details and allow returning to Groups
- upstream unavailable: keep the application shell and show the recoverable service state

No cross-currency total is introduced in this phase.

## Navigation Model

The application shell derives the current section from the real pathname:

- `/app` selects Overview
- `/app/groups` and `/app/groups/**` select Groups
- `/app/funds` and `/app/funds/**` select Funds

Activity and Settings remain disabled until their product phases deliver real destinations.

On phones, each bottom-navigation item uses a vertically stacked icon and label. Items have stable dimensions, labels use at most two controlled lines, and the navigation accounts for the safe-area inset. Disabled items retain understandable accessible names without appearing actionable.

On desktop, the existing side rail remains. It uses the same route-matching function as mobile so active-state behavior cannot diverge.

## Error and Recovery Architecture

The existing Next.js Server Component and same-origin BFF architecture remains in place. No client query framework is added.

### API Boundary

`server-api.ts` owns upstream transport behavior:

- apply an eight-second default timeout to backend requests, with a test-only override for deterministic timeout coverage
- convert connection refusal, DNS failure, reset connections, and timeout aborts into typed service-unavailable errors
- preserve known HTTP status and API error-code mapping
- preserve invalid-envelope and invalid-JSON contract errors as distinct diagnostics
- avoid exposing raw transport exceptions to page components
- never retry writes automatically

Read retries are initiated only by explicit user action through the rendered error surface.

### Route Boundaries

The authenticated route tree supplies:

- `loading.tsx` for navigation and server-read transitions
- `error.tsx` as a client error boundary with Retry and Return to overview actions
- `not-found.tsx` for missing or inaccessible identifiers when existence must not be disclosed

Known states use shared presentation components so Group, Funds overview, and Fund detail do not invent different recovery language. Authorization, not found, session expiry, and service unavailable remain semantically distinct.

Mimiku supports the message but never obscures the recovery action. The shell and navigation stay visible whenever the session remains valid.

## Responsive Content Rules

All flex and grid content tracks that contain user or API data must be shrinkable with `min-width: 0`. Text containers own their wrapping behavior instead of relying on document-level clipping.

- Group, fund, and member names wrap naturally and support long unbroken input.
- Currency and amount pairs remain semantically associated; on narrow layouts the amount moves to its own row rather than leaving the frame.
- Large balances use bounded responsive typography and wrapping rules that preserve every digit.
- Action groups wrap without overlapping adjacent content.
- Pixel panels and frames grow vertically with their content.
- The application removes document-level horizontal clipping once route-level geometry tests demonstrate that the in-scope pages fit.

The approved complete pixel-game direction remains. Group and Fund pages use the established frames, hierarchy, Mimiku states, and interaction tokens instead of introducing a second visual language.

## Test Strategy

Every repair follows red-green-refactor discipline: add the smallest failing regression test, confirm the expected failure, implement the minimum correction, and run the focused test before broader verification.

### Unit and Component Tests

- route matching selects the correct parent section for exact and nested paths
- every navigation item marked available has an implemented route contract
- Funds overview groups funds by owning group without cross-currency aggregation
- no-group, empty-group, mixed, unavailable-service, and authorization states render the correct action
- transport failures and timeouts map to typed service-unavailable errors
- HTTP, JSON, and envelope errors retain distinct behavior
- Retry invokes the framework reset callback exactly once
- long names and large signed values render in dedicated shrinkable containers

### BFF and Server API Tests

- timeout aborts a stalled read and produces the typed unavailable error
- connection failure does not leak a raw `TypeError`
- successful reads retain `cache: "no-store"`, request IDs, and authorization headers
- mutations are not automatically retried

### End-to-End Tests

The navigation acceptance test signs in and performs real clicks:

1. Open Overview.
2. Click Groups in the visible navigation.
3. Verify `/app/groups` renders and Groups is current.
4. Open a real group from the list and verify the nested route keeps Groups current.
5. Click Funds in the visible navigation.
6. Verify `/app/funds` renders and Funds is current.
7. Open a real fund and verify the nested route keeps Funds current.
8. Assert no runtime error page or unexpected console error appeared.

Backend-backed acceptance is required. If preflight health or fixture creation fails, the suite fails with a diagnostic instead of skipping the test.

### Geometry and Visual Regression

Authenticated Overview, Groups list, Group detail, Funds overview, and Fund detail are checked at:

- 320 x 720
- 390 x 844
- 768 x 1024
- 1440 x 900

Fixtures include a 255-character name, a long unbroken token, Traditional Chinese text, a large positive amount, and a large negative amount. Assertions inspect relevant element and containing-frame rectangles, not only document `scrollWidth`. A passing check requires each text rectangle to remain within its intended frame with a small pixel tolerance.

Screenshots are captured for the authenticated route matrix and reviewed for hierarchy, clipping, overlap, focus visibility, and consistency with the approved pixel world.

## Runtime Verification

Local acceptance uses one documented runtime topology. The backend health endpoint must remain available before login, after login, and after Group/Fund navigation. The verification guide identifies container names, ports, environment values, startup order, and commands for inspecting backend logs.

The current local container mounts the main checkout backend while the PWA runs from a feature worktree. The stabilization implementation must remove this ambiguity from the documented acceptance path by using a backend build from the same intended revision or by explicitly documenting the controlled split and verifying compatible commits.

## Delivery Sequence

1. Lock transport-error behavior with failing API-boundary tests and add typed recovery.
2. Add authenticated loading, error, and not-found boundaries with component coverage.
3. Centralize route matching and fix mobile and desktop navigation states.
4. Add the real Funds overview and its data-state tests.
5. Harden shared responsive containers and feature layouts with stress fixtures.
6. Replace false-positive overflow assertions with frame geometry checks.
7. Add click-driven authenticated navigation E2E and make backend preflight mandatory.
8. Verify the full route and viewport matrix, update runtime documentation, and record results.

## Success Criteria

This stabilization phase is complete only when:

- every navigation item marked available resolves to a real page
- Funds overview lists real accessible funds grouped by Group
- exact and nested routes expose the correct `aria-current` navigation state
- backend timeout or disconnection produces a recoverable mimic error surface instead of a Next.js runtime page
- loading, not-found, authorization, and unavailable-service states are distinguishable
- user and financial text remains inside its owning frame at every required viewport
- the regression suite clicks Groups and Funds through the visible navigation
- backend unavailability fails required E2E instead of skipping it
- lint, typecheck, unit/component tests, production build, Playwright, console checks, and manual screenshot review pass
- the documented local runtime can reproduce the accepted result from a clean start

Financial Activity planning may resume only after these criteria pass.
