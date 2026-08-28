## 2026-07-15 — Initialize PostgreSQL and Prisma migration

**Task:** Complete Phase 0 database setup for the PairFund remote-mode development environment.  
**Scope:** WSL2 Docker environment, `backend/prisma/migrations/20260715125137_init/migration.sql`, PostgreSQL seed data  
**What changed:**
- Updated WSL and restored systemd/Docker Engine operation without Docker Desktop.
- Created a persistent PostgreSQL 16 container and the `pairfund` database.
- Generated and applied the initial Prisma migration.
- Seeded and verified the demo account.
**Decisions:** Used a temporary Node 20 Linux container with OpenSSL to run Prisma because the Windows schema engine could validate the schema but failed before reaching PostgreSQL.  
**Known gaps / follow-ups:** Backend startup and API-level login/persistence checks remain in Phase 0D; npm reported 24 dependency audit findings for later security triage.

## 2026-07-15 — Run backend in WSL Docker

**Task:** Start the NestJS backend and verify health, authentication, and PostgreSQL persistence.  
**Scope:** `backend/Dockerfile.dev`, `backend/.dockerignore`, WSL Docker runtime, PairFund API and database  
**What changed:**
- Added a minimal Node 20 and OpenSSL development image for Prisma compatibility.
- Started the backend on `localhost:3001` because Grafana already owns port 3000.
- Verified health, demo login, JWT-authenticated profile reads, registration, and the persisted ACTIVE user row.
**Decisions:** Run NestJS and PostgreSQL on the same WSL Docker network because Windows Prisma processes cannot reach the WSL PostgreSQL endpoint in this managed environment. Keep WSL alive with a hidden Windows `wsl.exe ... sleep infinity` process during development.  
**Known gaps / follow-ups:** Convert the ad-hoc Docker commands into a reproducible Compose workflow; review the broad TypeScript build output and add `tsconfig.build.json` later.

## 2026-07-15 — Launch Flutter Web remote mode

**Task:** Run PairFund in Chrome against the real NestJS and PostgreSQL stack.  
**Scope:** backend CORS bootstrap and e2e test, Flutter Web scaffold, mobile runtime config, widget test harness, local run documentation  
**What changed:**
- Added environment-controlled CORS and verified the browser preflight with an e2e test.
- Added the standard Flutter Web platform files and documented the remote-mode command.
- Made compile-time app configuration compatible with Dart 3.11 web builds.
- Fixed a stale widget test harness by adding the required Riverpod `ProviderScope`.
- Built the Web bundle and launched Chrome on `http://localhost:8080` against the API on port 3001.
**Decisions:** Use fixed development origins and ports (`8080` web, `3001` API) because Grafana owns port 3000. Keep CORS disabled unless `CORS_ORIGIN` is explicitly configured.  
**Known gaps / follow-ups:** Dependency upgrades and WebAssembly compatibility are deferred; package versions remain pinned for MVP stabilization.
## 2026-07-15 — Group owner invite creation

**Task:** Implement owner-only group invite creation rules.  
**Scope:** `backend/src/modules/groups/dto/create-group-invite.dto.ts`, `backend/src/modules/groups/groups.service.ts`, `backend/src/modules/groups/groups.service.spec.ts`  
**What changed:**
- Added optional `invited_email` normalization and validation.
- Restricted invite creation to active owners of active groups with stable `GROUP_OWNER_REQUIRED` errors.
- Added secure 72-bit invite codes, seven-day expiry, and focused service/DTO tests.
**Decisions:** Keep inactive-group and non-owner failures indistinguishable through the same stable error code.
**Known gaps / follow-ups:** Invite acceptance, HTTP endpoints, code-collision retry, and mobile UI remain for later tasks.
## 2026-07-15 — Atomic group invite acceptance

**Task:** Implement atomic acceptance of group invites.  
**Scope:** `backend/src/modules/groups/dto/accept-group-invite.dto.ts`, `backend/src/modules/groups/groups.service.ts`, `backend/src/modules/groups/groups.service.spec.ts`  
**What changed:**
- Added invite-code validation and transactional invite acceptance.
- Added stable domain errors, conditional one-use consumption, and membership creation/reactivation.
- Added race handling for invite consumption, membership uniqueness, and inactive membership reactivation.
**Decisions:** Archived groups are rejected as `INVITE_NOT_FOUND`; future group-archive mutation must coordinate row locking or transaction isolation with invite acceptance.
**Known gaps / follow-ups:** HTTP endpoints, PostgreSQL concurrency integration tests, and mobile integration remain for later tasks.
## 2026-07-16 — Group invite HTTP endpoints

**Task:** Expose authenticated create-invite and accept-invite HTTP contracts.  
**Scope:** `backend/src/modules/groups/groups.controller.ts`, `backend/src/modules/groups/group-invites.controller.ts`, `backend/src/modules/groups/groups.module.ts`, `backend/test/group-invites.e2e-spec.ts`  
**What changed:**
- Added JWT-protected create and accept invite routes under `/api/v1`.
- Added stable snake_case response mappings and DTO validation coverage.
- Added AppModule-based e2e tests covering module wiring, authentication, validation, and service arguments.
**Decisions:** E2E tests inject and restore a dedicated JWT secret instead of relying on the production fallback.
**Known gaps / follow-ups:** Production JWT fallback-secret validation remains an existing security backlog; mobile invite integration is next.
## 2026-07-16 — Preserve mobile API error semantics

**Task:** Map NestJS invite and validation failures into reliable Flutter API exceptions.  
**Scope:** `mobile/lib/shared/api/api_exception_mapper.dart`, `mobile/test/shared/api/api_exception_mapper_test.dart`  
**What changed:**
- Added top-level NestJS domain-code parsing and validation-message list handling.
- Distinguished HTTP `API_ERROR` responses from true no-response `NETWORK_ERROR` failures.
- Hardened nested error precedence and added edge-case mapper tests.
**Decisions:** Nested errors take precedence only when they contain a non-empty string code.
**Known gaps / follow-ups:** Focused mapper tests pass 12/12; the full Flutter suite produced no output for five minutes on Windows and was terminated.
## 2026-07-16 — Mobile invite data repository

**Task:** Add demo and remote Flutter repositories for creating and accepting group invites.  
**Scope:** `mobile/lib/features/invites/data/invite_repository.dart`, `mobile/test/features/invites/invite_repository_test.dart`  
**What changed:**
- Added invite result models, repository interface, and demo/remote implementations.
- Added exact API paths and snake_case contract parsing for create and accept operations.
- Added provider mode selection, email/code normalization, UTC clock injection, and malformed-response tests.
**Decisions:** Demo time remains relative to the current time but uses an injectable UTC clock for deterministic tests.
**Known gaps / follow-ups:** Controllers and screens are not connected yet; repository focused tests pass 13/13 and the full Flutter suite passes 77/77.
## 2026-07-16 — Mobile invite form controllers

**Task:** Manage create-invite and accept-invite form state with Riverpod.  
**Scope:** `mobile/lib/features/invites/providers/create_invite_controller.dart`, `mobile/lib/features/invites/providers/accept_invite_controller.dart`, `mobile/test/features/invites/invite_controller_test.dart`  
**What changed:**
- Added immutable create/accept form states, validation, submission, success results, and stable error messages.
- Added home-summary invalidation after joining and duplicate-submit protection.
- Added request-scoped keep-alive handling so navigation during an in-flight request cannot update a disposed notifier.
**Decisions:** Invite submissions remain alive only until their current request settles, then auto-dispose normally.
**Known gaps / follow-ups:** Screens and routes remain for Task 7; focused controller tests pass 26/26 and the full Flutter suite passes 103/103.

## 2026-07-16 — Mobile invite screens and navigation

**Task:** Connect the invite workflow to production Flutter screens, routes, and home entry points.  
**Scope:** `mobile/lib/features/invites/presentation/`, `mobile/lib/features/home/`, `mobile/lib/shared/app/`, and their widget/router tests  
**What changed:**
- Added create-invite and accept-invite screens with pending, validation, error, and success states.
- Added authenticated invite routes and production-router integration coverage.
- Added home actions for inviting a member and joining with a code, plus the active group ID in the home summary.
- Added clipboard copying and a localized invite expiry date and time.
**Decisions:** The current group is the first group returned by the API; invite ownership remains server-authoritative. External deep-link preservation is outside the approved Task 7 scope.  
**Known gaps / follow-ups:** Runtime deployment and two-account acceptance remain for Task 8. Full Flutter tests pass 122/122, and the remote-mode Web build succeeds.

## 2026-07-16 — Expose Settings and sign out from home

**Task:** Make the existing sign-out action reachable during two-account invite acceptance.
**Scope:** `mobile/lib/features/home/presentation/home_dashboard_screen.dart`, `mobile/test/features/home/home_dashboard_screen_test.dart`
**What changed:**
- Added an accessible Settings icon to the home heading.
- Reused the existing Settings route and Sign out action.
- Added a widget navigation test using the real home screen.
**Decisions:** Kept logout behavior centralized in `SettingsScreen`; no duplicate home logout action or new navigation shell was added.
**Known gaps / follow-ups:** User visual acceptance of the invite flow remains in Task 8. Full Flutter tests pass 123/123 and the running Web endpoint returns HTTP 200.

## 2026-07-16 — Add account creation to mobile auth

**Task:** Let users register a second account in the app for invite-flow acceptance.
**Scope:** `mobile/lib/features/auth/`, `mobile/test/features/auth/`
**What changed:**
- Added demo and remote registration repository methods using `/auth/register`.
- Added registration session persistence and a registration-specific controller error state.
- Added Sign in/Create account modes with a Display name field on the authentication screen.
- Added repository, controller, and widget coverage for registration behavior.
**Decisions:** Reused the login route, session payload mapper, and centralized persistence path instead of adding a separate registration route.
**Known gaps / follow-ups:** Email verification and password recovery remain out of scope. Full Flutter tests pass 127/127 and the remote-mode Web build succeeds.

## 2026-07-16 — Improve authentication guidance and errors

**Task:** Make login and registration inputs self-explanatory and replace technical failures with actionable user copy.
**Scope:** `mobile/lib/features/auth/providers/auth_controller.dart`, `mobile/lib/features/auth/presentation/`, `mobile/test/features/auth/`
**What changed:**
- Added safe mappings for duplicate-email, invalid-credential, and connectivity failures.
- Changed Email and Password to empty initial fields with disappearing placeholders.
- Added explicit Demo credential fill and field-local registration validation.
- Cleared stale local and remote errors when users edit fields or switch modes.
**Decisions:** Only known domain codes receive specialized copy; all other API failures use a safe retry message and never expose raw technical details.
**Known gaps / follow-ups:** Group-aware Home remains in Batch 2. Auth focused tests pass 14/14, full Flutter tests pass 133/133, and the remote-mode Web build succeeds.

## 2026-07-16 — Scope Home data to the selected group

**Task:** Make Home load and retain an explicit current group instead of silently using the first API result.
**Scope:** `mobile/lib/features/groups/`, `mobile/lib/features/home/`, `mobile/lib/features/invites/providers/accept_invite_controller.dart`, and focused tests
**What changed:**
- Added a persisted selected-group ID with reconciliation when available groups change.
- Split group-list loading from Home summary loading and scoped fund requests to the selected group.
- Derived the current user's role and member count for each group from remote API data.
- Refreshed both group choices and Home data after accepting an invitation.
**Decisions:** A stale or missing selection falls back to the first available group; an empty group list clears the persisted selection.
**Known gaps / follow-ups:** The visible current-group card and group selector are the next Batch 2 task. Focused repository, selection, and invite tests pass 36/36.

## 2026-07-16 — Add current-group context to Home

**Task:** Make Home clearly show group membership and support switching between available groups.
**Scope:** `mobile/lib/features/home/presentation/`, Home widget tests, and production router smoke tests
**What changed:**
- Added a Current group card with group name, role, member count, and group type.
- Added a bottom-sheet selector when the user belongs to multiple groups.
- Added an explicit no-group onboarding card that directs users to join with an invite code.
- Updated router tests to isolate the new group providers.
**Decisions:** Full group management actions remain in Batch 3 so they ship together with server-enforced Owner/Member authorization.
**Known gaps / follow-ups:** A dedicated create-group entry and group management screen remain. Full Flutter tests pass 139/139 and the remote Web build succeeds.

## 2026-07-16 — Show current group members

**Task:** Make multi-group switching directly testable and show who belongs to the current group.
**Scope:** `mobile/lib/features/groups/data/group_summary.dart`, Home remote mapping and repository, Current group card, and focused tests
**What changed:**
- Added member identity and role data to each group summary.
- Filtered inactive memberships out of the displayed member count and list.
- Added a Members section with names, initials, and Owner/Member roles to the Home group card.
- Added a local `Switch Test Group` for `test@gmail.com` with two members for acceptance testing.
**Decisions:** The local acceptance group uses fixed IDs and a clearly marked name so setup is repeatable and distinguishable from user-created data.
**Known gaps / follow-ups:** Member management actions remain part of Batch 3. Full Flutter tests pass 139/139 and the remote Web build succeeds.

## 2026-07-16 — Clarify group metadata and member disclosure

**Task:** Reduce Home card clutter and make informational metadata visually distinct from actions.
**Scope:** `mobile/lib/features/home/presentation/widgets/current_group_card.dart` and Home widget tests
**What changed:**
- Replaced button-like Chips with non-interactive metadata tags.
- Changed the member list to a collapsed Members section that expands on demand.
- Kept Switch as the visually distinct group action.
**Decisions:** Members are collapsed by default to keep the Home summary compact while preserving full access to names and roles.
**Known gaps / follow-ups:** None for this interaction refinement. Full Flutter tests pass 139/139 and the remote Web build succeeds.

## 2026-07-17 — Add standalone group creation

**Task:** Continue Batch 2 by making group creation available from Home and the no-group onboarding state.
**Scope:** `mobile/lib/features/groups/`, Home entry points, app routing, and focused tests
**What changed:**
- Added demo and remote group creation repositories for `POST /groups`.
- Added validated group creation state with name, type, and default currency.
- Added a dedicated Create group screen and production route.
- Added Create group actions for both existing-group and no-group Home states.
- Automatically selects the newly created group and refreshes Home data.
**Decisions:** Group creation is independent from fund creation; creating a group does not silently create a fund.
**Known gaps / follow-ups:** View group and full group management remain next. Full Flutter tests pass 143/143 and the remote Web build succeeds.

## 2026-07-17 — Secure group detail and rename API

**Task:** Add the authorized Backend contracts required by the upcoming View group screen.
**Scope:** `backend/src/modules/groups/`, `backend/test/groups.e2e-spec.ts`, and group service tests
**What changed:**
- Added authenticated group detail with the requester's Owner/Member role.
- Required active group membership before listing members.
- Added validated group rename and restricted it to active Owners.
- Added stable `GROUP_NOT_FOUND`, `GROUP_ACCESS_DENIED`, and `OWNER_REQUIRED` failures.
- Made the rename write re-check active Owner access atomically to close a permission race.
**Decisions:** Archived groups return not found; active-group outsiders receive access denied. Member lists include active memberships only.
**Known gaps / follow-ups:** Mobile repository/controller and Group detail UI are next. Backend unit tests pass 40/40, e2e tests pass 16/16, production build succeeds, and runtime detail/member smoke passes.

## 2026-07-17 — Add mobile group detail data flow

**Task:** Connect Mobile to the authorized group detail, members, funds, and rename APIs.
**Scope:** `mobile/lib/features/groups/data/group_repository.dart`, group detail providers, shared API PATCH support, and focused tests
**What changed:**
- Added Group detail models and remote aggregation across detail, members, and funds endpoints.
- Added a dedicated PATCH capability to the Dio API client without breaking existing GET/POST test clients.
- Added Owner rename state, validation, friendly errors, and Home/detail invalidation.
- Kept Demo rename state consistent across subsequent detail reads.
**Decisions:** The repository owns the three-request aggregation so the upcoming screen consumes one coherent Group detail model.
**Known gaps / follow-ups:** Group detail screen and routing are next. Full Flutter tests pass 149/149, changed-file analysis is clean, and the remote Web build succeeds.

## 2026-07-17 — Add Group detail screen and Home entry

**Task:** Make the selected group viewable and manageable from Home with role-based controls.
**Scope:** Group detail presentation, app routes, Home current-group actions, and widget/router tests
**What changed:**
- Added a Group detail screen with identity tags, active members, and group funds.
- Added Owner-only Rename and Invite controls; Member views omit management actions.
- Added View group to the Home current-group card and production routing with exact group IDs.
- Added friendly loading failure and retry UI plus fund navigation.
- Fixed rename dialog controller disposal during its closing animation.
**Decisions:** Authorization remains server-authoritative; role-based hiding improves UX but does not replace Backend enforcement.
**Known gaps / follow-ups:** Browser acceptance for Owner and Member accounts remains. Full Flutter tests pass 153/153, changed-file analysis is clean, and the remote Web build succeeds.

## 2026-07-17 — Finalize Phase 1 local handoff

**Task:** Record the accepted Phase 1 state and make the WSL-based local stack reproducible.
**Scope:** `.agents/features.md`, `backend/README.md`, final Backend, Flutter, Web, and runtime verification
**What changed:**
- Updated the feature map to mark group creation, invitations, group detail, rename, and member listing as implemented.
- Replaced the obsolete Docker Desktop and blocked-database notes with the working WSL2 Docker Engine workflow.
- Documented Backend rebuild/restart, health readiness, remote Web build/serve commands, ports, and cache-busting.
- Reverified the complete test suites and exercised login, group list, group detail, members, and Web delivery against the running local stack.
**Decisions:** Keep WSL containers and the D-drive checkout as the local development baseline; require health readiness after container restarts before acceptance requests.
**Known gaps / follow-ups:** Member role management and the aggregated group dashboard remain planned; dependency upgrades remain deferred.
## 2026-07-17 — Mobile group membership mutation state

**Task:** Add operation-aware Mobile state for role changes, member removal, and leaving a group.
**Scope:** Mobile group detail controller/tests and Home group-selection reconciliation timing.
**What changed:**
- Added promote, demote, remove, and leave mutation state with duplicate-submit prevention.
- Added stable domain error codes and user-facing copy without exposing backend messages.
- Invalidated group/Home data after mutations and awaited selection reconciliation after leave.
- Deferred selection mutation until Home provider initialization completes.
**Decisions:** Used request-scoped Riverpod keep-alive so an in-flight mutation survives temporary listener disposal.
**Known gaps / follow-ups:** The full Flutter suite showed one intermittent failure while focused Group/Home suites passed; Task 8 and final Task 9 verification must rerun the full suite.
## 2026-07-17 — Close Task 7 governance review gaps

**Task:** Address blocking review gaps in Mobile group membership mutation coverage.
**Scope:** Group detail mutation controller and controller tests.
**What changed:**
- Added safe `CANNOT_REMOVE_SELF` copy.
- Verified in-flight promote/demote state, duplicate protection, request keep-alive, and real provider refreshes.
- Verified leaving the final group clears both selected state and persisted selection.
**Decisions:** Provider refresh assertions require load counts to increase without coupling tests to Riverpod's exact scheduling count.
**Known gaps / follow-ups:** The full parallel Flutter suite still reports one intermittent unrelated failure while all focused Group/Home tests pass; rerun during final integration.
## 2026-07-17 — Verify in-flight leave state

**Task:** Close the final Task 7 specification test gap for an in-flight leave request.
**Scope:** Group detail mutation controller test.
**What changed:**
- Paused leave at the repository boundary and asserted submitting/leave operation state before completion.
- Released the request and verified successful Home refresh and selected-group reconciliation.
**Decisions:** Extended the existing reconciliation test to keep one end-to-end controlled scenario.
**Known gaps / follow-ups:** None for Task 7 controller behavior.
## 2026-07-17 — Make group synchronization ordering-safe

**Task:** Fix post-leave synchronization semantics and overlapping Home reconciliation races.
**Scope:** Group mutation controller, Home groups provider, and focused provider/controller tests.
**What changed:**
- Preserved successful leave semantics when the subsequent Home refresh fails, while allowing later refresh recovery.
- Added a generation-based reconciliation coordinator so stale or disposed Home loads cannot update selected group state.
- Rejected unsupported member roles before repository calls and made stable refresh-count assertions exact.
**Decisions:** Server mutation success is authoritative; local synchronization is a recoverable post-success phase. Reconciliation is committed only by the latest active load generation.
**Known gaps / follow-ups:** The full parallel Flutter suite retains one pre-existing intermittent failure; all 33 focused tests and analyzer checks pass.

## 2026-07-17 — Deliver group governance

**Task:** Complete Owner role management, safe member removal, self-leave, Mobile controls, and final runtime verification.
**Scope:** Backend group/accounting services and HTTP contracts; Mobile group repository, controller, detail UI, router stabilization; `.agents/features.md`; `backend/README.md`; local WSL Docker acceptance stack.
**What changed:**
- Added serialized role changes, removal, and leave operations with last-Owner, open-balance, and pending-settlement protection.
- Coordinated contribution/expense creation and settlement create/complete/cancel transitions with the same group advisory lock.
- Added Mobile governance API data flow, operation-aware state, friendly domain errors, reconciliation-safe leave behavior, member action sheets, confirmations, and Danger zone UI.
- Fixed the stale navigation service router reference and cleared all Flutter analyzer findings encountered during final verification.
- Verified Backend 91/91 unit tests, 23/23 HTTP E2E tests, Flutter analyzer with no issues, Flutter 190/190 tests, and the remote Web build.
- Exercised the worktree build against real PostgreSQL: promote/demote, pending-settlement block, open-balance block, completed-settlement removal, rejoin as Member, Member denial, self-leave, final-Owner protection, audit metadata, and concurrent Owner reduction.
**Decisions:** Server mutation success remains authoritative when post-leave Mobile synchronization fails; navigation waits for successful reconciliation. Group-level advisory locking serializes membership-reducing operations and the relevant accounting and settlement transitions. Local WSL acceptance overrides container `PORT` and the database host without changing the Windows `.env`.
**Known gaps / follow-ups:** Browser visual acceptance remains a user checkpoint. Dependency upgrades are deferred; the local Task 9 smoke records remain in the development database.

## 2026-07-18 — Verify fund summary and group dashboard

**Task:** Complete the agent-owned Phase 3 automated and runtime verification before user visual acceptance.
**Scope:** Backend fund summary/dashboard services and HTTP contracts; Mobile dashboard and fund-detail data/UI; `.agents/features.md`; local WSL Docker acceptance stack.
**What changed:**
- Corrected the stale group repository test expectation so `6400` minor TWD units render as `TWD 64.00`.
- Verified Backend unit tests 123/123, HTTP E2E tests 37/37, and the production Backend build.
- Verified Flutter analyzer with no issues, Flutter tests 273/273, and the remote Web production build.
- Exercised the worktree against real PostgreSQL with a populated group, a second empty group for switching, two TWD funds, one USD fund, a completed settlement, refund, correction, removed-member history, and outsider authorization.
- Confirmed current-period boundaries, currency isolation, group/fund total equality, preserved historical records, and HTTP 403 for removed members and outsiders.
- Promoted `view-fund-summary`, `fund-summary`, and `group-dashboard` to done in the feature map.
**Decisions:** Dashboard aggregation remains currency-separated with no FX conversion. Runtime data uses unique local acceptance identities and remains in the development database for repeatable visual inspection.
**Known gaps / follow-ups:** User browser visual acceptance passed on 2026-07-18. Dependency upgrades and WebAssembly compatibility remain deferred.

## 2026-07-18 — Complete pending settlement cancellation on Mobile

**Task:** Complete the smallest post-Phase 3 batch by wiring the existing Backend cancel-settlement flow into Mobile.
**Scope:** Mobile settlement repository, pending-settlement mapping, settlement mutation UI and tests; `.agents/features.md`; design and implementation plan.
**What changed:**
- Added the Mobile cancel-settlement repository contract and remote `POST /settlements/:id/cancel` call.
- Restricted actionable settlement IDs to non-empty pending history records, preventing completed records from enabling mutation controls.
- Added confirmed cancellation, shared Complete/Cancel mutation locking, stable feedback, and successful provider refresh.
- Added repository and widget coverage for endpoint mapping, pending selection, dismissal, success, failure, refresh, and duplicate-submission protection.
- Verified Flutter analyzer with no issues, focused settlement tests 11/11, and the complete Flutter suite 280/280.
**Decisions:** Kept mutation state screen-local for this small batch; the Backend remains authoritative for settlement state and authorization.
**Known gaps / follow-ups:** Backend authorization behavior was not changed. Dependency upgrades remain deferred.

## 2026-07-18 - Cross-platform alpha readiness foundation

**Task:** Prepare shared auth/profile/session behavior and alpha guidance for the first iOS and Android tester cohort.
**Scope:** Backend current-user profile route, Mobile settings profile repository, Mobile Dio refresh tests, alpha readiness documentation, `.agents/features.md`
**What changed:**
- Added canonical `PATCH /me` profile update coverage and route while preserving temporary `POST /me` compatibility.
- Updated Mobile settings profile updates to call `PATCH /me`.
- Added token refresh regression coverage for successful retry, refresh failure cleanup, non-recursive refresh handling, and single retry behavior.
- Added Android/iOS alpha install guidance and a cross-platform acceptance checklist.
**Decisions:** Keep first alpha readiness work focused on shared foundation and checklist documentation; packaging and TestFlight execution remain a follow-up batch.
**Known gaps / follow-ups:** Flutter verification in this worktree is still blocked by dependency/runtime setup timeouts; transaction edit/delete, categories, audit log browsing, and actual Android/iOS build distribution remain outside this batch.

## 2026-07-28 - Establish mimic PWA foundation

**Task:** Apply the visible mimic rebrand, add end-to-end PWA/auth acceptance coverage, document verification, and finish the PWA foundation branch.
**Scope:** `mobile/lib/app/app.dart`, `mobile/lib/features/auth/presentation/login_screen.dart`, `mobile/lib/features/home/presentation/home_dashboard_screen.dart`, `mobile/lib/features/home/data/remote/home_remote_mapper.dart`, `mobile/web/index.html`, `mobile/web/manifest.json`, mobile app/auth/home tests, `web/e2e/public-and-auth.spec.ts`, `web/e2e/scaffold.spec.ts`, `web/playwright.config.ts`, `web/eslint.config.mjs`, `web/.gitignore`, `web/public/sw.js`, `web/README.md`, `docs/superpowers/specs/2026-07-22-pwa-core-product-design.md`, `.agents/devlog.md`
**What changed:**
- Changed the Flutter application title, login/dashboard visible brand copy, remote user fallback, and Flutter web install metadata from PairFund to `mimic` while preserving internal PairFund identifiers.
- Added Playwright acceptance coverage for public brand identity, registration entry, responsive overflow, first-viewport section visibility, anonymous `/app` redirect, and private Cache Storage exclusion.
- Updated Playwright dev-server config to use webpack, matching the production Serwist build path, and excluded generated `public/sw.js` from lint.
- Rebuilt the web PWA shell and recorded production screenshots plus PWA metadata/cache findings in `web/README.md`.
- Ran `npm run lint` (passed), `npm run typecheck` (passed), `npm test` (passed: 15 test files / 83 tests), `npm run build` (passed), `npm run test:e2e` (passed: 6 tests), and production visual/PWA checks at 320x720, 390x844, and 1440x900 (passed).
**Decisions:** Kept historical PairFund references in architecture and API contexts, with a top-note pointing current user-facing naming to the mimic brand spec and assets.
**Known gaps / follow-ups:** `flutter test`, focused mobile brand-copy Flutter tests, and `flutter --version` timed out locally before producing output; Lighthouse is not installed and was not run because network access is restricted; Safari/Edge device-specific install behavior remains a browser checkpoint.

## 2026-07-29 - Add mimic PWA group management journeys

**Task:** Deliver PWA group creation, group list/detail, rename, member roster, and leave-group flows for Task 6.
**Scope:** `web/src/app/app/groups`, `web/src/app/api/app/groups/[groupId]/leave/route.ts`, `web/src/features/groups/*group*`, `web/src/features/groups/member-roster.tsx`, `web/src/features/groups/leave-group-dialog.tsx`, `.agents/devlog.md`
**What changed:**
- Added group validation schemas for create and rename, including trimmed names and uppercase three-letter currency normalization.
- Added client group forms with CSRF-protected BFF calls, duplicate-submit locking, backend error preservation, and success routing.
- Added group list, group detail, deterministic member avatars, literal Owner/Member role labels, rename UI, and leave confirmation dialog.
- Updated the leave BFF route to clear the `mimic_group` preference cookie after successful departure.
- Added `/app/groups`, `/app/groups/new`, and `/app/groups/[groupId]` pages.
**Decisions:** Kept Task 6 focused on group management; invitation sharing and fund CRUD remain separate planned tasks. Used small client components with `fetch` instead of adding a form dependency.
**Known gaps / follow-ups:** Routes rely on the existing backend/BFF contracts; visual browser QA for the new pages remains a follow-up checkpoint before handoff.

## 2026-07-29 - Complete mimic PWA invitation loop

**Task:** Deliver Task 7 by wiring invite creation, sharing, public entry, auth return, and signed-in acceptance for the mimic PWA.
**Scope:** `web/src/features/invitations`, `web/src/app/(public)/invite/[code]/page.tsx`, `web/src/app/app/groups/[groupId]/invite/page.tsx`, `web/src/app/api/auth/refresh/route.ts`, `web/src/features/auth/auth-form.tsx`, `web/src/features/groups/group-detail.tsx`, `web/src/shared/api/domain-contracts.ts`, invitation/auth/public/contract tests, `.agents/devlog.md`
**What changed:**
- Added invitation schema/error modules enforcing twelve-character URL-safe invite codes and exact terminal invite error copy.
- Added group invite creation UI with optional normalized invited email, duplicate-submit locking, and CSRF-protected BFF posting.
- Added share UI that builds `/invite/{code}` from the current origin, supports clipboard copy, manual selected-text fallback, and Web Share only after explicit click.
- Replaced the public invite placeholder with a no-data invite entry and login/register return links, plus an authenticated accept panel that posts `{ invite_code }` only after explicit user action.
- Centralized auth return validation through `safeReturnTo` for auth form and refresh redirects, preserving `/invite/...` while rejecting external or unsafe paths.
- Added the group detail invite entry and the authenticated `/app/groups/[groupId]/invite` page.
**Decisions:** Kept invite creation and acceptance as small client panels reusing the existing group `appFetch` CSRF helper. Public invite pages intentionally show the invite code but no group, member, balance, fund, or transaction data.
**Known gaps / follow-ups:** Invite role/permission checks remain backend-authoritative. Visual browser QA for the invite pages and actual backend acceptance with seeded users remain follow-up checkpoints.

## 2026-07-29 - Add mimic PWA fund creation and summaries

**Task:** Deliver Task 8 by adding PWA fund creation, group fund listing, dashboard fund cards, and fund summaries.
**Scope:** `web/src/features/funds`, `web/src/app/app/groups/[groupId]/funds/new/page.tsx`, `web/src/app/app/funds/[fundId]/page.tsx`, `web/src/app/app/groups/[groupId]/page.tsx`, `web/src/features/groups/group-detail.tsx`, `web/src/features/groups/treasury-dashboard.tsx`, focused fund/dashboard tests, `.agents/devlog.md`
**What changed:**
- Added fund form validation with trimmed names and uppercase three-letter currency normalization.
- Added CSRF-protected fund creation through the existing app BFF and routed successful creation to `/app/funds/{id}`.
- Added authenticated fund queries for group fund lists and fund summaries, parsing minor-unit money fields through existing domain contracts.
- Added fund list/cards to group detail and dashboard views, preserving per-currency fund amounts without cross-currency aggregation.
- Added fund summary UI with cash balance, current period state, current totals, signed member positions, all-time totals, and a non-actionable next-phase activity boundary.
- Added `/app/groups/[groupId]/funds/new` and `/app/funds/[fundId]` pages.
**Decisions:** Kept contributions, expenses, and activity actions visibly out of scope for this task instead of adding disabled transaction buttons. Reused the existing group `appFetch` helper for fund mutations.
**Known gaps / follow-ups:** Fund update/archive and transaction creation remain later PWA tasks. Visual browser QA and backend runtime acceptance with seeded funds remain follow-up checkpoints.

## 2026-07-30 - Cover mimic PWA group, fund, invite, and pixel acceptance

**Task:** Deliver Task 9 by adding responsive E2E acceptance coverage for the mimic PWA group/fund/invite journeys and cache privacy rules.
**Scope:** `web/e2e`, `web/playwright.config.ts`, `web/src/app/sw.ts`, `web/public/sw.js`, `web/src/app/pwa-cache-policy.test.ts`, `web/src/shared/api/domain-contracts.ts`, `web/src/shared/api/domain-contracts.test.ts`, `.agents/devlog.md`
**What changed:**
- Added isolated Playwright account/session fixtures that create backend data through API setup while validating the authenticated PWA pages in browser contexts.
- Added full-flow E2E coverage for two accounts joining a group through an invite, opening group pages, and viewing a fund summary.
- Added invitation E2E coverage for invalid invite privacy, authenticated invite gate rendering, and email-mismatch rejection.
- Added pixel responsive E2E checks for public shell overflow, pixel-art image rendering, focus visibility, screenshots, and invite auth return navigation.
- Expanded Playwright projects to phone-small, phone, tablet, and desktop viewports with single-worker execution for backend-backed tests.
- Treated `/invite/*` as private cache material in source service worker rules and rebuilt `public/sw.js`.
- Normalized integer minor-unit API serializer values to strings in web domain contracts, preserving strict rejection of decimals/exponential values.
**Decisions:** Used API setup for long E2E preconditions to avoid testing hydration-sensitive form submits repeatedly; component tests continue to cover duplicate-submit form behavior. Kept invitation pages private for cache policy even though the entry page is public, because invite codes are sensitive bearer-like material.
**Known gaps / follow-ups:** Playwright logs still include expected unauthenticated `SESSION_REQUIRED` noise from redirect tests and Next Image LCP/aspect-ratio warnings for invite artwork; no functional failures remain in the Task 9 verification matrix.

## 2026-07-30 - mimic PWA groups, funds, and pixel world

**Task:** Replace the authenticated PWA preview with real group, invitation, fund, and dashboard workflows in the approved complete pixel-game visual system.
**Scope:** NestJS fund authorization and money contracts; Flutter compatibility mappers; Next.js BFF, group, invitation, fund, pixel UI, responsive shell, tests, and operating docs.
**What changed:**
- Secured fund create/list/detail access and standardized minor-unit API fields as decimal strings.
- Added real group selection, creation, detail, rename, roster, leave, invitation, fund creation, and summary workflows.
- Added the complete pixel UI asset and component system for phone and expanded desktop HUD layouts.
- Added unit, component, integration, E2E, responsive, accessibility, and PWA privacy coverage.
- Updated operating documentation, PWA feature status, and the pixel-world design delivery record.
- Fixed Mobile JSON envelope and fund summary mappers to accept JSON-like `Map` payloads while preserving required field validation.
**Decisions:** NestJS remains authoritative; private data is never persisted by the service worker; transaction and settlement actions remain deferred.
**Known gaps / follow-ups:** Contributions, expenses, activity, settlements, role changes, member removal, and fund archival remain in later plans. Final verification passed for Backend build/unit/e2e, Web lint/typecheck/unit/build/e2e, and Mobile tests; Web E2E still logs expected unauthenticated `SESSION_REQUIRED` redirect noise and Next Image invite-art warnings.

## 2026-08-04 - Make local runtime acceptance deterministic

**Task:** Implement Task 8 deterministic local runtime acceptance for the same-worktree backend and PWA.
**Scope:** `web/scripts/verify-local-runtime.mjs`, focused verifier tests, `web/package.json`, `web/playwright.config.ts`, `web/README.md`, `.agents/devlog.md`
**What changed:**
- Added health-only and full acceptance modes with configurable API/Web roots and exact health URL failures.
- Added three ordered health checkpoints around preflight, authentication setup, and real Groups/Funds browser navigation.
- Added a declared-versus-expected backend revision guard without logging authentication material.
- Made Playwright's runtime root configurable while preserving all existing viewport projects and helper-test exclusion.
- Documented the PowerShell workflow that starts only PostgreSQL in WSL and runs backend/web processes from this worktree.
**Decisions:** Split Playwright into navigation and remaining-suite batches so the third checkpoint follows the existing click-driven Groups/Funds test. Used an ephemeral API registration for the authentication setup milestone and discarded its token response.
**Known gaps / follow-ups:** Full runtime acceptance is blocked while the user-owned `pairfund-backend` container occupies port 3001; it mounts the active checkout's `backend/` directory and was not stopped or used for acceptance.

## 2026-08-04 - Enforce runtime process identity and phase alignment

**Task:** Correct Task 8 acceptance so it identifies the backend process, aligns health checks with the authenticated browser journey, and runs deterministically on Windows.
**Scope:** Backend health contract/tests, runtime verifier/tests, dedicated Playwright runtime journey/helpers, Playwright config, web package scripts and README, `.agents/devlog.md`
**What changed:**
- Exposed a validated SHA-like backend process revision from health only when configured, omitting unset or secret-like values.
- Compared the expected current/explicit revision with the health response and rejected missing, invalid, or stale process identity.
- Added strict API/Web URL validation and redacted failure behavior.
- Added a dedicated browser journey that authenticates, checks health, navigates Groups/Funds, and checks health again in tested order.
- Launched Playwright through the Node executable and resolved CLI with single-settlement child cleanup.
- Disabled existing web-server reuse during runtime acceptance and added an explicit verifier unit-test package script.
**Decisions:** Kept developer server reuse for ordinary Playwright runs while forcing a current-worktree server for acceptance. Used the same browser session for authentication and navigation instead of a separate throwaway API account.
**Known gaps / follow-ups:** The user-owned stale backend remains on port 3001 and is now rejected because its health response omits the expected process revision; same-worktree runtime verification requires a free port or alternate acceptance port.

## 2026-08-04 - Redact invalid runtime health responses

**Task:** Ensure browser-phase health checks safely handle malformed, empty, and non-object response bodies.
**Scope:** `web/e2e/helpers/runtime-health.ts`, focused helper tests, `.agents/devlog.md`
**What changed:**
- Wrapped health JSON parsing and validated the response/data envelope before reading revision data.
- Added malformed, empty, null, array, and primitive body coverage with phase and exact safe URL assertions.
**Decisions:** Parser errors are not retained as causes because their messages can contain response-body fragments.
**Known gaps / follow-ups:** Long runtime acceptance was intentionally not rerun for this focused error-handling fix.

## 2026-08-26 - Stabilize PWA routes and pixel presentation

**Task:** Repair authenticated route failures, overflowing responsive content, frame artifacts, and low-quality Mimiku presentation, with regression coverage.
**Scope:** `web/src/features`, `web/src/shared`, `web/e2e`, `web/public/brand`, `web/public/pixel-ui`, `web/scripts/clean-mimiku-alpha.mjs`, `web/package.json`
**What changed:**
- Hardened group and fund navigation/rendering states and expanded responsive layout coverage for narrow mobile panels.
- Removed the frame source center fill that tiled a checker-like texture through panel content.
- Removed edge-connected neutral mattes from twelve Mimiku assets and added an idempotent cleanup command plus PNG transparency tests.
- Preserved transparent pixel art in Next Image consumers with direct, unoptimized rendering and corrected invite artwork sizing.
- Kept mobile navigation labels on one line and expanded geometry coverage to create and invitation routes at every Playwright viewport.
- Added regression tests for frame fill, transparent assets, image consumers, invite aspect ratio, fund stacking, and mobile navigation labels.
**Decisions:** Cleared only edge-connected near-neutral backgrounds to retain intentional interior highlights and shadows. Kept this batch focused on rendering and route stability instead of redesigning every public page.
**Known gaps / follow-ups:** Public and authentication pages still use the restrained cream Web treatment rather than the approved full-screen deep-navy pixel-world composition. Real backend Playwright acceptance was not rerun in this batch; visual route acceptance used a deterministic local mock API.

## 2026-08-27 - Close stabilized PWA delivery stage

**Task:** Finalize the current PWA stabilization stage as a reviewable branch delivery.
**Scope:** `.agents/features.md`, `.agents/devlog.md`, final Web verification and Git change organization
**What changed:**
- Reconciled the feature map with the delivered responsive pixel foundation and recorded full public/auth pixel-world parity as a separate follow-up.
- Re-ran asset-cleaner idempotence, lint, type checking, all Web unit/component tests, and the production build.
- Reviewed the complete uncommitted diff for correctness, edge cases, architecture, security, style, and regression coverage.
**Decisions:** Kept the feature branch and worktree intact for owner review; no merge, push, or worktree cleanup was performed.
**Known gaps / follow-ups:** Real-backend Playwright acceptance remains pending. Public and authentication page visual parity remains the next visual-design stage.

## 2026-08-28 — Prepare repository for GitHub publication

**Task:** Add public repository documentation and CI while excluding the retiring Flutter client from the current tree.
**Scope:** Root README and cover asset, GitHub Actions, ignore rules, portable Markdown paths, current-tree Mobile removal, and current agent guidance.
**What changed:**
- Added a bilingual PWA-first project README with an approved pixel-art cover.
- Added parallel Backend and Web CI jobs.
- Removed `mobile/` from the current tracked tree and ignored local/private working artifacts.
- Replaced machine-specific repository paths in tracked Markdown.
- Updated agent guidance and feature-map context for the PWA-first repository direction.
**Decisions:** Preserved Git history, internal agent documentation, author email metadata, and the original treasury source image; deferred licensing and production legal policy decisions.
**Known gaps / follow-ups:** Mobile remains available in historical commits; E2E CI, deployment automation, license selection, and production privacy/terms content remain deferred.

## 2026-08-28 — Enforce Mimic product boundary

**Task:** Establish a testable active-brand boundary and stop tracking generated service-worker output.
**Scope:** Naming verification scripts, root and web ignore rules, generated web service worker.
**What changed:**
- Added a Node test and scanner for retired-brand references in explicit active product surfaces.
- Made scanner traversal fail closed for non-missing filesystem errors and skip symbolic links and Windows directory junctions.
- Ignored the worktree-local retired mobile residue and generated `web/public/sw.js` output.
- Removed the tracked generated service worker while retaining its TypeScript source.
**Decisions:** The scanner intentionally reports current active legacy references until the subsequent technical rename task removes them; mobile source remains recoverable in Git history.
**Known gaps / follow-ups:** Broad active-surface naming migration is deferred to the next task.

## 2026-08-28 — Complete Mimic technical rename

**Task:** Complete the active product rename from PairFund to Mimic and remove the duplicate Prisma schema.
**Scope:** Active repository guidance, READMEs, backend runtime/test/seed configuration, Web documentation, feature map, four current specifications, package metadata, and Prisma schema location.
**What changed:**
- Renamed the current PRD, backend map, Web UI specification, and OpenAPI contract to `mimic-*` filenames and updated active brand references.
- Renamed backend package metadata, test secrets, demo seed data, and documented local service examples to Mimic; replaced runtime JWT fallbacks with required environment validation.
- Made the PWA feature map authoritative, removed retired-client delivery claims, and recorded missing PWA flows as TODO work.
- Removed the root Prisma schema copy; `backend/prisma/schema.prisma` is now documented as the only schema source of truth.
- Corrected current product documentation to describe the PWA-only scope and portable design-asset links.
**Decisions:** Preserved migrations, historical plans, and prior devlog entries as immutable history; restricted the rename to the active surfaces covered by the naming verifier.
**Known gaps / follow-ups:** Historical documentation and Git history intentionally retain retired PairFund and client references.

## 2026-08-28 — Split deployment liveness and readiness

**Task:** Add safe liveness and database-backed readiness checks for deployment verification.
**Scope:** Backend health module and e2e coverage; Web health BFF routes and runtime verifier; `.agents/devlog.md`.
**What changed:**
- Added legacy, liveness, and readiness backend health routes with safe revision exposure and optional Prisma migration verification.
- Switched Prisma to lazy connection so the process can serve liveness while the database is unavailable.
- Added local Web liveness, backend-proxied readiness, and dual-endpoint runtime preflight checks.
- Added focused backend, Web, and verifier coverage for safe failures, strict `ok: true` envelopes, and readiness gating.
**Decisions:** Readiness reports only `SERVICE_NOT_READY` for database or migration failures so operational details never leave the service; Web consumers reject malformed success envelopes instead of trusting compile-time contracts.
**Known gaps / follow-ups:** Production deployment must set `MIMIC_EXPECTED_MIGRATION` when migration-level readiness is required.

## 2026-08-28 — Add Mimic production images

**Task:** Add reproducible production container definitions for the Backend and Web PWA.
**Scope:** Backend package metadata and Docker context; Backend and Web Dockerfiles; Next configuration; static image-contract test; `.agents/devlog.md`.
**What changed:**
- Added Node 22 Bookworm Slim multi-stage images with locked dependency installs, production non-root runtimes, and explicit compiled-artifact copies.
- Moved the Prisma CLI to runtime dependencies, added `prisma:migrate:deploy`, and regenerated the Backend lockfile metadata.
- Preserved the generated Prisma client/engine directory in the Backend runtime image and configured Next standalone output for the Web image.
- Added Docker context exclusions and a Node static contract test covering image stages, commands, artifacts, ignores, secrets, Prisma, and standalone output.
- Hardened both Docker contexts against VCS metadata, `.npmrc`, environment/key files, TypeScript build state, and generated local build caches; the Web context also excludes generated `public/sw.js`.
**Decisions:** The Backend runtime copies `.prisma` from the build stage after `npm ci --omit=dev` so generated client engines are explicit rather than depending only on install-hook behavior.
**Known gaps / follow-ups:** This Windows host has no Docker-compatible engine, so `docker build`/container-runtime verification remains deferred to a Docker-capable environment or Railway remote builds.

## 2026-08-28 — Add privacy-filtered Sentry monitoring

**Task:** Add optional developer-only Sentry diagnostics without exporting Closed Beta financial or personal data.
**Scope:** Backend and Web Sentry initialization, strict privacy scrubbers and tests, Next build wrapper, environment examples, monitoring documentation, and `.agents/devlog.md`.
**What changed:**
- Added current Sentry SDKs and early Nest/Next initialization surfaces, disabled by default without a nonblank DSN.
- Rebuild every captured event from a small allowlist, retaining only safe deployment metadata, bounded diagnostic IDs, pseudonymous user IDs, sanitized request origin/path, safe route templates, and exception type/frames.
- Disabled breadcrumbs, logs, replay, local variable capture, and invalid trace sampling; transaction events use the same scrubber and never retain raw names.
- Wrapped the existing Serwist standalone config with Sentry using source-map upload disabled without an auth token.
- Hardened the allowlist after review: request URLs now retain only verified DNS origins, route tags require explicit operational routes or parameterized templates, and event IDs, releases, environments, pseudonyms, diagnostic IDs, and frame metadata each use independent validators.
- Replaced the deprecated Sentry build logger option with debug-log tree shaking and exported the client router-transition hook required by Sentry v10.
- Switched Closed Beta monitoring to error-only telemetry: requests retain only methods, transactions are dropped, attachments are cleared, and recognized runtime stack paths are canonicalized without host directories. The Web image accepts an optional BuildKit `SENTRY_AUTH_TOKEN` secret mount for source maps and falls back safely without one.
- Centralized each package's Sentry hooks in a tested factory so every init surface shares attachment clearing and transaction suppression; added behavior coverage for both App Router error boundaries.
- Restricted frame canonicalization to exact Docker and normalized current-worktree roots, rejecting marker-only absolute paths and third-party URLs; added qualified-function and sensitive-filename regression coverage.
- Added non-secret `SENTRY_ORG`/`SENTRY_PROJECT` build configuration for source-map upload while keeping the optional auth token confined to the BuildKit secret mount.
- Corrected monitoring documentation to describe error-only telemetry and the supported DSN, environment, revision, and build inputs.
**Decisions:** Preserved only the Sentry-required event type discriminator alongside the constructed allowlist; it is constant metadata rather than user data.
**Known gaps / follow-ups:** Linux production-image execution remains deferred because Docker is unavailable on this host; static image coverage includes the Sentry configuration.
