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
- Ignored SDK-provided frame `module` metadata because it is never emitted, preventing colon-qualified module names from dropping otherwise safe allowlisted frames.
- Treated trusted repository filenames and qualified function identifiers as code metadata, so SDK frames such as `jwt-secrets.js` and `Object.getRequiredJwtSecret` survive canonicalization without emitting module metadata.
**Decisions:** Preserved only the Sentry-required event type discriminator alongside the constructed allowlist; it is constant metadata rather than user data.
**Known gaps / follow-ups:** Linux production-image execution remains deferred because Docker is unavailable on this host; static image coverage includes the Sentry configuration.

## 2026-08-28 — Add encrypted PostgreSQL recovery tooling

**Task:** Add portable encrypted logical backups and guarded scratch restore drills for Railway PostgreSQL.
**Scope:** `ops/backup/` image, scripts, verification SQL and contracts; LF checkout policy; PostgreSQL recovery runbook
**What changed:**
- Added a pinned non-root Alpine image with configurable PostgreSQL major, AWS CLI, age, and minisign tooling.
- Added collision-resistant weekly custom-format dumps that are encrypted before upload, checksummed, bound to release/migration/PostgreSQL identity in a signed manifest, and published signature-last.
- Added hostile guard coverage plus checksum/signature-first restore orchestration requiring an independently provisioned database sentinel, scratch system identifier, and explicit Production system-identity denial.
- Added stdin-only age identity injection for UID/GID 10001, required-table/migration/release verification, exact row counts, and a current Railway sibling-PITR runbook with version, credential, immutability, RPO/RTO, and escalation controls.
- Routed every PostgreSQL client operation through a mode-`0600` temporary libpq service file, with explicit `service=mimic_restore` targeting for destructive restore and command-scoped connection state.
- Added executable direct-restore semantics coverage and tied required-table verification to Prisma's physical `audit_logs` mapping.
- Documented exact minisign public-key extraction/validation and explicit scratch nonce assignment, validation, display, export, and separate custody.
- Replaced nested connection URIs with role-specific host/port/user/password/database/SSL fields, rejecting control-character injection before writing discrete libpq service parameters.
- Scoped storage credentials to AWS children, persisted and unset the signing key before database children, and contract-checked the full restore table manifest against every Prisma physical model mapping.
- Added exact Railway reference-variable wiring and distinguished fixed image inputs from package revisions resolved at build time.
- Added a fail-closed operator procedure for creating, verifying, rotating, revoking, and eventually dropping the non-owning `mimic_backup` login, including current and default table/sequence read grants.
- Made the backup password an independent sealed service secret rather than a Production-owner credential reference, and rejected leading/trailing service-field whitespace in both backup and restore behavior tests.
**Decisions:** Kept the age private identity off the scheduled Railway service; only the public recipient is configured there. Kept the minisign signing key backup-only and restore credentials separately read-only. Logical restores require a new Staging scratch cluster/database and can never target Production.
**Known gaps / follow-ups:** Docker image build and real libpq service-file parsing require CI or Railway because this Windows host has no Docker-compatible engine or PostgreSQL client; the first real encrypted backup and scratch/PITR restore drill remain operational launch gates.

## 2026-08-28 — Gate Mimic production foundations in CI

**Task:** Strengthen GitHub Actions so every change verifies active naming, the release test baseline, production images, and Linux-only recovery behavior.
**Scope:** `.github/workflows/ci.yml`, `scripts/verify-ci-workflow.test.mjs`, `.agents/devlog.md`
**What changed:**
- Added a dedicated active Mimic naming job and Backend HTTP E2E coverage with explicit non-production JWT inputs.
- Added API, Web, and backup production image builds plus static image and backup contracts.
- Made Ubuntu execute the recovery guard/restore semantics contracts and validate both packaged backup scripts with the image's POSIX shell.
- Pinned checkout and Node setup actions to verified release commits while retaining repository read-only permissions.
- Kept Web image builds independent of Sentry upload credentials; no auth token is passed as an argument or environment variable.
**Decisions:** Kept package installs in their existing Backend/Web jobs and used the runner's Docker/Node tooling for container contracts, avoiding a duplicate application dependency install in the image job.
**Known gaps / follow-ups:** This Windows host has no Docker-compatible engine, so the three image builds and in-image shell checks are intentionally enforced by the Ubuntu CI job; Railway remote builds remain the later deployment gate.

## 2026-08-28 — Harden CI supply chain and container verification

**Task:** Resolve the Task 7 review findings around action pins, build contexts, time bounds, immutable bases, and runtime smoke coverage.
**Scope:** CI workflow/contracts, API/Web/backup Dockerfiles, backup build context, container pin runbook, and recovery contracts
**What changed:**
- Made the workflow contract inspect every external `uses:` reference, require a full 40-hex commit SHA, and require checkout credential persistence to be disabled.
- Added bounded timeouts to every job and non-network runtime smoke checks for image users, commands, Node, PostgreSQL 16, age, minisign, and AWS CLI.
- Added a deny-by-default backup `.dockerignore` that admits only the six files consumed by its Dockerfile.
- Pinned every Node and Alpine `FROM` stage to verified official Docker Hub multi-arch index digests and contract-checked the exact values.
- Documented the official metadata sources, multi-architecture choice, independent inspection, and controlled digest-update procedure.
**Decisions:** Used manifest-list digests rather than architecture-specific child digests so the immutable pins remain valid across supported local and Railway Linux architectures.
**Known gaps / follow-ups:** Docker is unavailable on this Windows host; image pulls, builds, and smoke commands remain enforced by the Ubuntu container job and must pass before merge.

## 2026-08-28 — Parse CI policy and pin the BuildKit frontend

**Task:** Close the remaining CI policy bypass and Dockerfile frontend reproducibility gaps found in Task 7 review.
**Scope:** parsed workflow validator/tests, Web development lockfile, CI bootstrap probes, Web Dockerfile, container pin runbook, and production-image contracts
**What changed:**
- Replaced line-oriented workflow matching with recursive `js-yaml` traversal of every mapping and sequence, including flow mappings, and rejected every non-local action reference without a full 40-character commit SHA.
- Validated permissions, per-job timeouts, checkout credential handling, environment contracts, and required release commands from the parsed workflow structure.
- Added hostile flow-mapping and constrained local-action regression probes, and moved the workflow test after the Web job's locked dependency install.
- Pinned the BuildKit `docker/dockerfile:1.7` syntax frontend to its verified official multi-arch digest and extended the update runbook and image contracts.
- Added isolated API/Web container bootstrap probes against their liveness endpoints without PostgreSQL or external network services.
**Decisions:** Declared `js-yaml` directly in the Web development lockfile instead of relying on its prior transitive installation. Described immutable base/frontend selection plus lockfiles as controlled inputs, not byte-for-byte image reproducibility while OS package indexes remain dynamic.
**Known gaps / follow-ups:** The Windows host still lacks Docker; CI must perform the pinned frontend pull, image builds, runtime probes, and API/Web bootstrap checks.

## 2026-08-28 — Define guarded Railway deployment infrastructure

**Task:** Add repository-side Railway IaC and a Staging-first deployment runbook without applying cloud changes.
**Scope:** `.railway/` IaC package and contracts, Railway operations documentation, component READMEs, feature map, and devlog
**What changed:**
- Declared lower-case `staging` and `production` environments with isolated `mimic-web`, `mimic-api`, and explicit PostgreSQL 16 resources, environment-specific Git branches, Docker roots, Singapore placement, readiness checks, and production-safe Prisma migration command.
- Used typed PostgreSQL references, non-secret environment metadata, and `preserve()` placeholders; no secret literal or Sentry trace-rate variable is stored in IaC.
- Added offline contracts for both environment graphs and the deliberate absence of `mimic-backup-job`/cron.
- Documented per-environment plan/apply, Web-only public domain generation, explicit variable gates, private-API Staging verification, daily volume backups, immutable offsite storage, explicit Production approval/rollback, and a two-step unscheduled-then-cron backup rollout.
**Decisions:** Matched Railway's existing lower-case `production` environment, temporarily configured the bootstrap Staging validation from `codex/mimic-baseline-railway-safety`, required a verified switch back to `main` before merge, kept Production only on `main`, and required separate environment plans; kept source-map auth and the backup service absent because current IaC cannot map the BuildKit secret mount and backup credentials/recovery evidence are not ready.
**Known gaps / follow-ups:** No Railway config was planned/applied and no service, secret, domain, or deployment was created. Verify a compatible CLI, push and review the Staging branch/plan, complete secrets/Web domain, and pass remote image/runtime/recovery gates before Production work.
## 2026-08-28 — Railway Web builder compatibility

**Task:** Fix the failed Mimic Staging Web build after Railway rejected Docker BuildKit secret mounts.
**Scope:** `web/Dockerfile.railway`, `.railway/railway.ts`, Railway IaC/image contract tests, deployment runbook
**What changed:**
- Added a Railway-specific Web Dockerfile that keeps the pinned standalone production image contract without an unsupported secret mount.
- Pointed Railway IaC at `Dockerfile.railway` and added regression coverage for the platform constraint.
**Decisions:** Source-map upload stays disabled on Railway; `SENTRY_AUTH_TOKEN` is not weakened into an image argument or environment variable.
**Known gaps / follow-ups:** Re-enable Railway source-map upload only after Railway supports a reviewed build-secret mechanism.

## 2026-08-28 — Align Railway PostgreSQL with platform major

**Task:** Resolve the unsafe PG18-to-PG16 drift exposed by the first Railway Staging apply.
**Scope:** Railway IaC/contract, deployment and recovery runbooks, feature map
**What changed:**
- Switched the declared Railway database to the SDK PostgreSQL 18 helper, matching the already initialized Staging volume.
- Added an explicit Production gate requiring the backup/restore image to move from PostgreSQL client 16 to 18 before deployment.
**Decisions:** Preserve the initialized PG18 volume and migrate it to Singapore; do not attempt an unsupported in-place downgrade to PG16.
**Known gaps / follow-ups:** Upgrade and restore-drill the backup image before any Railway backup service or Production schedule is created.

## 2026-08-28 — Stabilize Railway private API routing

**Task:** Fix the Staging Web readiness failure caused by an empty cross-service API port reference.
**Scope:** Railway IaC contract, Staging service variables, and deployment runbook
**What changed:**
- Replaced the unresolved `${{mimic-api.PORT}}` segment with Railway's explicit internal application port `8080`.
- Added a contract assertion for the complete private API URL and documented the rendered-variable verification gate.
**Decisions:** Keep the API private and pin only its Railway-internal application port; do not create an API public domain as a routing workaround.
**Known gaps / follow-ups:** Apply the focused Staging plan and verify Web readiness before generating the Web-only public domain.

## 2026-08-28 — Bootstrap Railway Staging

**Task:** Apply and verify the guarded Mimic Staging topology for closed-beta preparation.
**Scope:** Railway Staging Web, API, PostgreSQL 18 volume, runtime secrets, private networking, public Web domain, and feature map
**What changed:**
- Applied the reviewed IaC plan with zero resource deletions and deployed Web/API in Singapore against the existing PostgreSQL 18 volume.
- Generated independent JWT access/refresh secrets without logging their values and restricted API CORS to the exact Staging Web HTTPS origin.
- Published only `mimic-web-staging.up.railway.app` on port `8080`; the API retains no public domain.
- Verified the latest Web/API deployments, public homepage, liveness, readiness, migrations, and PostgreSQL volume state.
**Decisions:** Keep Production empty and keep the API private; use the Web BFF as the only public application edge.
**Known gaps / follow-ups:** Enable Railway volume backups manually, complete real two-account/auth privacy acceptance, upgrade the recovery image to PostgreSQL client 18, and switch Staging IaC back to `main` after merge.

## 2026-08-28 — Document Railway restart-policy drift

**Task:** Record the false-positive drift remaining after the successful Staging IaC apply.
**Scope:** Railway deployment runbook and post-apply plan inspection
**What changed:**
- Documented that Railway's planner can keep reporting default restart-policy changes after the live deployment manifest already shows `ON_FAILURE` with 10 retries.
- Added an operator guard against repeatedly applying a plan containing only those two known mismatch lines.
**Decisions:** Keep the desired restart policy explicit in source and verify it from the live manifest instead of weakening the IaC contract to silence a platform planner mismatch.
**Known gaps / follow-ups:** Recheck this behavior after future Railway CLI/SDK upgrades and remove the exception once planning becomes idempotent.

## 2026-08-30 — Enforce settlement locks and invite session state

**Task:** Fix the Staging acceptance defects that allowed writes into completed settlement periods and hid the session-present invite acceptance UI.
**Scope:** backend accounting guard, contribution/expense creation, Web session utilities, public invite page, tests, feature map
**What changed:**
- Added a shared inclusive completed-settlement period guard returning `LOCKED_PERIOD`.
- Applied the guard to all contribution and expense creation types, including corrections.
- Added optional Web session detection and connected it to the public invite page.
- Added focused regression coverage for accounting and invite-session behavior.
**Decisions:** Preserve authorization errors by checking membership before the period guard; corrections use unlocked dates rather than altering locked history; optional session detection controls UI presentation only, while the BFF/backend remains authoritative for authentication and authorization.
**Known gaps / follow-ups:** PATCH/DELETE transaction endpoints and their lock checks remain future work; local verification passed (backend tests/build and Web lint/typecheck/tests/build), but Staging deployment and acceptance re-verification remain pending explicit authorization; Staging acceptance data is retained.

## 2026-08-30 — Harden settlement period boundaries

**Task:** Close review findings that allowed inverted or malformed settlement periods to weaken completed-period locking.
**Scope:** settlement DTO validation, creation and completion services, Prisma migration, regression tests, feature map
**What changed:**
- Restricted settlement boundaries to real `YYYY-MM-DD` calendar dates and rejected inverted bounded periods before fund lookup or transaction creation.
- Revalidated legacy pending settlement boundaries after the group lock and membership check, preventing invalid rows from transitioning to `COMPLETED`.
- Added a PostgreSQL `NOT VALID` check constraint that protects future inserts and updates without rewriting or scanning legacy settlement rows.
- Added regression coverage for timestamps, impossible dates, inverted periods, equal dates, and open-ended periods.
**Decisions:** Preserve same-user, authorization, and non-pending error precedence; allow equal and open-ended periods; leave legacy financial data untouched and make constraint validation an explicit operational step.
**Known gaps / follow-ups:** Before validating `settlements_period_order_check`, audit each environment for bounded rows where `period_start > period_end`, resolve any findings deliberately, and then run `VALIDATE CONSTRAINT`; Staging deployment and audit remain pending explicit authorization.

## 2026-08-31 — Retire Railway Staging bootstrap source

**Task:** Move persistent Railway Staging deployments from the temporary validation branch to `main`.
**Scope:** Railway IaC and contract, deployment guidance, Staging source configuration, feature map
**What changed:**
- Made `main` the explicit Web/API source for both declared Railway environments and added the matching contract expectation.
- Applied a reviewed Staging-only plan with zero additions or deletions; no database, variable, domain, backup, or Production resource changed.
- Verified both Staging services deployed successfully from `main` at `09587adff0cb1be72cba3f8a72fc4a27a1eb1297`, and public live/readiness checks returned `ok: true`.
- Confirmed the post-apply plan contains only Railway's documented restart-policy false-positive drift.
**Decisions:** Keep Production empty and retain explicit restart-policy values in IaC; do not repeatedly apply the known non-idempotent planner output.
**Known gaps / follow-ups:** Complete synthetic Sentry delivery/privacy inspection, backup/PITR gates, and the PostgreSQL 18 recovery-tool upgrade before Production work.

## 2026-08-31 — Upgrade backup clients to PostgreSQL 18

**Task:** Align the encrypted backup and restore image with Railway PostgreSQL 18.
**Scope:** backup Docker image, image and shell contracts, container CI, recovery runbook, feature map
**What changed:**
- Pinned the backup image to Alpine 3.23.5 and made PostgreSQL client 18 the production default.
- Updated dump/restore fixtures and CI to verify both client binaries report major 18.
- Replaced the obsolete PG16 incompatibility gate with PG18 build and evidence instructions.
**Decisions:** Preserve the existing Alpine image, non-root runtime, artifact format, encryption/signing sequence, and fail-closed version checks; keep all Railway backup services and schedules absent.
**Known gaps / follow-ups:** Provision immutable external storage and the dedicated `mimic_backup` role, then run a real unscheduled backup and scratch restore drill before adding any cron or opening Production. The real backup image build and Linux-only contracts remain a required GitHub CI gate because Docker is unavailable locally.

## 2026-08-31 — Preserve backup script executable modes

**Task:** Repair the Linux CI failure that prevented PostgreSQL 18 backup image verification.
**Scope:** `ops/backup/backup.sh`, `ops/backup/restore-drill.sh`, `ops/backup/restore-entrypoint.sh`
**What changed:**
- Recorded Git mode `100755` for all three production backup and restore entry points.
- Preserved script contents and retained the existing direct-invocation Linux contract tests.
**Decisions:** Fixed the repository executable contract instead of wrapping invocations with `sh` or adding a CI-only `chmod`.
**Known gaps / follow-ups:** GitHub Actions must pass the `Production containers` job after this commit is pushed before the PostgreSQL 18 runtime gate is considered closed.

## 2026-09-01 — Hold treasury opening state briefly

**Task:** Keep the authenticated treasury loading boundary visible for at least 1,000 ms while overlapping dashboard reads.
**Scope:** `web/src/features/groups/treasury-opening-delay.ts`, its test, the treasury app page, and route-boundary tests
**What changed:**
- Added a 1,000 ms opening promise helper with fake-timer coverage.
- Started the opening timer before the app reads and awaited it for list, dashboard, and successful outcomes.
- Added route-boundary coverage confirming the successful dashboard path invokes the helper.
**Decisions:** Await the shared opening promise only at return boundaries so slow reads are not extended beyond their own duration and other routes remain unchanged.
**Known gaps / follow-ups:** None for this task.

## 2026-09-01 — Render symmetric pixel frames

**Task:** Replace the raster nine-slice frame border with a symmetric scalable CSS pixel frame.
**Scope:** `web/src/shared/ui/pixel-frame.module.css`, `web/src/shared/ui/pixel-frame.tsx`, `web/src/shared/ui/pixel-ui.test.tsx`, `web/e2e/authenticated-geometry.spec.ts`
**What changed:**
- Added a shared 4px frame border and identical 2px/4px outer highlight rings.
- Routed treasury, panel, and dialog drop shadows through the shared frame variable.
- Added a dedicated PixelFrame marker and replaced raster and border-image unit/E2E contracts with assertions against the actual shared frame instances and their symmetric border widths.
**Decisions:** Preserved existing backgrounds, padding, dialog max width, colors, and PixelFrame DOM/API while removing raster-only declarations.
**Known gaps / follow-ups:** Authenticated E2E could not run because the local PostgreSQL service uses port 5433 while the project environment targets 5432, and the available project credentials were rejected on 5433. Unit tests, lint, typecheck, and production build passed.

## 2026-09-01 — Recover expired Web mutation sessions

**Task:** Prevent group creation and other authenticated Web mutations from failing generically when the access token expires.
**Scope:** `web/src/app/api/auth/refresh/route.ts`, its tests, `web/src/features/groups/group-client-api.ts`, group client/form tests
**What changed:**
- Added a CSRF-protected programmatic refresh endpoint that rotates access, refresh, and CSRF cookies without returning tokens to client JavaScript.
- Mapped explicit refresh-token rejection to `SESSION_REQUIRED` and cookie clearing while preserving session cookies for network, configuration, contract, and upstream operational failures.
- Made authenticated client mutations refresh once after an initial 401, fetch the rotated CSRF token, and replay the original mutation exactly once.
- Added a clear session-expired recovery message and retained form values after failed create attempts.
- Added regression coverage for token rotation, error mapping, one-shot retry, second-401 termination, CSRF header precedence, and form-state preservation.
**Decisions:** Kept refresh orchestration in the Web BFF and reused the existing client mutation helper so refresh tokens remain HttpOnly and retry behavior is consistent across current JSON mutation callsites.
**Known gaps / follow-ups:** The helper accepts general `RequestInit` bodies, but all current callsites use replayable JSON strings or no body; a future streaming-body callsite must opt out of replay or provide a replayable body factory.

## 2026-09-01 — Add manual group invitation entry

**Task:** Let signed-in users join a group by entering an invite code or complete invite link.
**Scope:** Join group route and form, invitation parsing and sharing, Groups and empty Overview entry points, tests, feature map
**What changed:**
- Added a dedicated authenticated Join group page that accepts a 12-character invite code or complete `/invite/:code` URL.
- Routed valid entries through the existing public invite review and explicit acceptance flow.
- Added Join group actions to the Groups page and the completely empty Overview state while leaving populated dashboards unchanged.
- Added direct invite-code copying with a manual text-selection fallback alongside the existing link and Web Share options.
- Added focused parser, form, route, state, and clipboard regression coverage.
**Decisions:** Keep QR code UI entirely hidden until it is implemented; do not accept invites immediately from the entry form; accept complete HTTP(S) invite URLs from any origin while validating the exact invite path and canonical code format.
**Known gaps / follow-ups:** QR scanning remains deferred; account profile/logout, public Mimic ID, and safe empty-group archive are separate planned work.

## 2026-09-02 — Add account settings and stable Mimic IDs

**Task:** Add account information, display-name editing, logout, and a stable public identity that remains recognizable after renaming.
**Scope:** User schema and migration, Mimic ID generation, auth/profile/member API responses, shared Web mutation client, Settings route and form, app navigation, member roster, tests, feature map
**What changed:**
- Added immutable unique `MIMIC-XXXX-XXXX` identifiers for new and existing users, with bounded collision retries.
- Exposed Mimic IDs through authentication, profile, and group-member responses without changing internal UUID relationships.
- Added an authenticated Settings page for viewing email and Mimic ID, copying the ID with a manual fallback, editing only the display name, and signing out.
- Enabled Settings navigation and showed stable Mimic IDs beneath member display names in group rosters.
**Decisions:** Keep internal UUIDs authoritative for authentication and foreign keys; make Mimic ID read-only and separate from display names; exclude search, invitation by Mimic ID, and QR support from this increment.
**Known gaps / follow-ups:** Production and Staging need the new Prisma migration applied before deploying the matching API/Web code; account deletion, email changes, avatar editing, and Mimic ID lookup remain out of scope.

## 2026-09-02 — Expose empty-group archive endpoint

**Task:** Expose the existing safe empty-group archive service through the authenticated groups API.
**Scope:** `backend/src/modules/groups/groups.controller.ts`, `backend/test/groups.e2e-spec.ts`
**What changed:**
- Added `POST /api/v1/groups/:groupId/archive` with UUID v4 validation and the established snake_case response contract.
- Added E2E coverage for successful archival, JWT rejection, and invalid UUID rejection before the service call.
**Decisions:** Reused the controller-level JWT guard and delegated all archive eligibility rules to `GroupsService.archiveEmptyGroup`.
**Known gaps / follow-ups:** None for this task.

## 2026-09-02 — Serialize fund and invitation lifecycle writes

**Task:** Serialize fund creation and group invitation writes against group archival.
**Scope:** `backend/src/modules/funds/funds.service.ts`, `backend/src/modules/funds/funds.service.spec.ts`, `backend/src/modules/groups/groups.service.ts`, `backend/src/modules/groups/groups.service.spec.ts`
**What changed:**
- Locked the group mutation boundary before revalidating active group membership and creating funds or invites.
- Re-read accepted invitations and their group after acquiring the group lock, then kept validation, consumption, and membership writes inside the same transaction.
- Added race-focused tests for post-lock archival and invite single-use conditions.
**Decisions:** Preserved existing public error contracts while using the locked invitation snapshot for all order-sensitive acceptance decisions.
**Known gaps / follow-ups:** None for this task.

## 2026-09-02 — Revalidate writable funds after group locks

**Task:** Prevent contribution, expense, and settlement creation from writing after their fund's group is archived concurrently.
**Scope:** `backend/src/modules/contributions`, `backend/src/modules/expenses`, `backend/src/modules/settlements`
**What changed:**
- Revalidated the active fund and active parent group inside each create transaction immediately after acquiring the group mutation lock.
- Returned `FUND_NOT_FOUND` before membership checks, settlement-period checks, or writes when the locked resource is no longer writable.
- Added regression and ordering coverage for all three create paths.
**Decisions:** Kept the existing pre-transaction fund lookup for the group lock key and limited the new transaction-level guard to create operations.
**Known gaps / follow-ups:** None for this task.

## 2026-09-02 — Add empty-group archive Web proxy

**Task:** Proxy empty-group archival through the authenticated Web BFF and clear a stale selected-group preference after success.
**Scope:** `web/src/app/api/app/groups/[groupId]/archive`, group leave BFF route, shared group preference cookie helper
**What changed:**
- Added a POST archive proxy that validates the route ID, forwards without a body, and preserves upstream responses.
- Cleared the selected-group cookie only after successful archive responses.
- Shared the cookie cleanup logic with the existing leave route and added success, conflict, and invalid-ID coverage.
**Decisions:** Preserve failed upstream responses and their cookie state; pass the request ID into route-parameter validation for consistent error tracing.
**Known gaps / follow-ups:** Archive UI is intentionally outside this task.

## 2026-09-02 — Lock pending confirmation dialogs

**Task:** Prevent pending PixelDialog confirmations from closing through the close button, Escape key, or native dialog cancellation.
**Scope:** `web/src/shared/ui/pixel-dialog.tsx`, `web/src/shared/ui/pixel-ui.test.tsx`
**What changed:**
- Added an optional `closeDisabled` contract that defaults to the existing closable behavior.
- Disabled the close button and guarded Escape and native cancel handlers while pending.
- Added regression coverage for all three pending close paths.
**Decisions:** Always prevent native dialog cancellation so React remains the source of truth for closing; preserve caller-cancelled keyboard events and the existing focus-restoration lifecycle.
**Known gaps / follow-ups:** Group archive UI wiring remains a separate task.

## 2026-09-02 — Preserve dialog cancel handlers

**Task:** Compose PixelDialog native cancellation with caller-provided `onCancel` handlers without losing veto behavior.
**Scope:** `web/src/shared/ui/pixel-dialog.tsx`, `web/src/shared/ui/pixel-ui.test.tsx`
**What changed:**
- Invoked the caller cancel handler before internal cancellation handling.
- Preserved caller `preventDefault()` as a veto of `onClose` while still preventing native dialog closure.
- Added enabled, disabled, and caller-veto native cancellation coverage.
**Decisions:** Snapshot `defaultPrevented` immediately after the caller handler because the internal handler always prevents the native default.
**Known gaps / follow-ups:** Group archive UI wiring remains a separate task.

## 2026-09-02 — Type dialog cancel events

**Task:** Correct PixelDialog's native dialog event typings after adding caller cancel-handler composition.
**Scope:** `web/src/shared/ui/pixel-dialog.tsx`
**What changed:**
- Based PixelDialog props on React's `DialogHTMLAttributes<HTMLDialogElement>` so `onCancel` is typed as a dialog event handler.
- Explicitly replaced the native `onClose`, `open`, and `title` contracts with PixelDialog's controlled props.
**Decisions:** Use React's element-specific dialog attributes rather than duplicating the native cancel callback type.
**Known gaps / follow-ups:** Full Web typecheck remains blocked by existing missing Next and CSS module declarations in this worktree; the changed dialog and test files have no diagnostics.

## 2026-09-02 — Delete unused groups from view

**Task:** Add an owner-only Web confirmation flow for archiving an empty group from view.
**Scope:** `web/src/features/groups` group detail, archive dialog, client error copy, styles, and action tests
**What changed:**
- Added an exact-name confirmation dialog that archives once, locks controls while pending, and returns to the group list after success.
- Added archive-specific recovery copy for active-member, financial-history, owner, session, and availability failures without changing rename or leave messages.
- Added an owner-only responsive Danger zone using the existing semantic danger treatment and clear soft-archive retention language.
- Added focused coverage for authorization visibility, exact matching, success navigation, recoverable domain errors, and duplicate-submit protection.
**Decisions:** Keep the input unchanged after failures so owners can retry; describe the operation as removal from view plus archival because membership, invite, and audit history remains retained.
**Known gaps / follow-ups:** There is no self-service restore flow; the dialog states this explicitly.

## 2026-09-02 — Harden archive confirmation lifecycle

**Task:** Prevent stale group archive confirmations and async completions across close, identity, and ownership changes.
**Scope:** `web/src/features/groups` archive dialog, group detail controls, client error copy, and action tests
**What changed:**
- Kept PixelDialog mounted while closed so it can restore focus, and reset confirmation/error state whenever the dialog closes or its group identity changes.
- Scoped archive controls to the current owner/group lifecycle so ownership or identity changes close the dialog without reopening stale state.
- Guarded async completion with mounted and current-operation tokens to prevent stale navigation or state updates.
- Replaced the handwritten confirmation input with PixelField and added access-loss recovery copy.
**Decisions:** Use a render-context state reset to avoid effect-driven state updates while invalidating async operations in lifecycle effects.
**Known gaps / follow-ups:** Full Web typecheck remains blocked by the existing missing Next and CSS module declarations.

## 2026-09-02 — Reject stale archive completions

**Task:** Close the commit-to-passive-effect race for pending archive requests when dialog context changes.
**Scope:** `web/src/features/groups/archive-empty-group-dialog.tsx`, `web/src/features/groups/group-actions.test.tsx`
**What changed:**
- Synchronously tracked the latest group/open context during render and captured the request context at submission.
- Required mounted state, current operation token, matching latest context, and an open request context before success or failure side effects.
- Added pending success and failure coverage across group identity changes, including clean disabled state for the replacement context.
**Decisions:** Retain the operation-invalidating effects as defense in depth while making correctness independent of passive-effect timing.
**Known gaps / follow-ups:** Full Web typecheck remains blocked by the existing missing Next and CSS module declarations.

## 2026-09-02 — Track committed archive context

**Task:** Preserve archive request race protection without mutating shared refs during render.
**Scope:** `web/src/features/groups/archive-empty-group-dialog.tsx`
**What changed:**
- Moved latest-context publication, mounted lifecycle, and operation invalidation into a layout effect so only committed group/open context becomes current and unmounts invalidate before microtasks.
- Preserved mounted, token, and request-context checks for both successful and failed pending requests.
**Decisions:** Use a layout effect because it runs during commit before promise microtasks and passive effects, while abandoned concurrent renders never publish their context.
**Known gaps / follow-ups:** RTL/jsdom does not reliably model an abandoned concurrent render; existing pending context-change success/failure coverage remains the observable regression guard.

## 2026-09-02 — Archive unused groups safely

**Task:** Let the sole active owner remove an unused Group while preserving relational and audit history.
**Scope:** Group archive transaction and endpoint, group-scoped write serialization, Fund and invite lifecycle, Web BFF, owner Danger zone and confirmation, tests, feature map
**What changed:**
- Added soft archival that rejects any Contribution, Expense, Settlement, or RecurringRule financial history, archives active empty Funds, revokes pending invites, and writes an audit record.
- Serialized group-scoped writers and added post-lock checks so archival cannot race fund, invitation, contribution, expense, or settlement creation.
- Added an owner-only exact-name confirmation flow and cleared the selected-group preference only after successful archival.
**Decisions:** Fund creation alone is not financial history; preserve former memberships and historical invites; provide no restore UI in this increment.
**Known gaps / follow-ups:** Archived-group browsing and restore, independent Fund lifecycle UI, and lifecycle support for groups with financial history remain deferred.

## 2026-09-02 — Correct Mimic ID migration table target

**Task:** Fix the failed Staging API pre-deploy migration that referenced a nonexistent user table.
**Scope:** `backend/prisma/migrations/20260902010000_add_user_mimic_id/migration.sql`, migration contract test
**What changed:**
- Changed every Mimic ID migration table reference from `"users"` to the physical Prisma table name `"User"`.
- Aligned the unique-index name with the existing Prisma table and added regression coverage for the physical table contract.
**Decisions:** Correct the existing migration because it failed transactionally and has not been successfully applied in Staging; preserve the additive backfill and uniqueness behavior.
**Known gaps / follow-ups:** Before retrying Staging deployment, mark the failed `20260902010000_add_user_mimic_id` migration as rolled back with Prisma Migrate; then deploy the corrected GitHub commit.

## 2026-09-02 — Complete the core Activity bookkeeping loop

**Task:** Implement the approved timeline-first Activity page with common contribution and expense entry flows.
**Scope:** `web/src/app/app/activity`, Activity feature components and queries, contribution/expense BFF routes, fund-summary shortcuts, navigation and API contracts; backend expense allocation rounding
**What changed:**
- Enabled Activity navigation and added a fund-scoped merged contribution/expense ledger with fund balance, filters, notes, multi-payer summaries, empty states, and fund switching.
- Added deep-linkable contribution and expense dialogs with regular/one-time contributions, multi-payer EQUAL/FIXED expenses, exact minor-unit validation, equal-share preview, mutation feedback, and server refresh.
- Added same-origin BFF POST routes and fund-summary shortcuts into the shared Activity workflow.
- Preserved normal split rounding while capping early shares so tiny amounts cannot create a negative final allocation.
**Decisions:** Keep Activity timeline-first and fund-scoped; expose only the approved common contribution types and EQUAL/FIXED split modes while leaving backend validation authoritative.
**Known gaps / follow-ups:** RATIO/HYBRID expense entry, correction/adjustment UI, settlement records, editing/deletion, pagination beyond the first 50 records per type, and a unified audit-backed activity endpoint remain deferred.

## 2026-09-02 — Stabilize Activity route test teardown

**Task:** Fix the Web CI test failure caused by React work continuing after the Activity route test environment was destroyed.
**Scope:** `web/src/app/app/activity/page.test.tsx`
**What changed:**
- Added explicit React Testing Library cleanup after every Activity route test.
- Ensured the intentional `notFound()` render failure is unmounted before Vitest tears down jsdom.
**Decisions:** Match the existing authenticated route-boundary test lifecycle instead of suppressing Vitest unhandled errors or changing production behavior.
**Known gaps / follow-ups:** None.

## 2026-09-11 — Deliver financial spaces phase 1 management core

**Task:** Execute the approved financial-spaces P1 plan sequentially in the isolated implementation worktree.
**Scope:** Additive Prisma schema/migration and local seed; `backend/src/modules/financial-spaces`, global request validation, group lifecycle guards, real PostgreSQL integration/concurrency tests; Web financial-space contracts; feature map and P1 execution record.
**What changed:**
- Added neutral PERSONAL_EXPENSES / SHARED_EXPENSES / POOLED_FUND metadata with separate personal ownership and group scope, explicit participant intervals and manager roles.
- Delivered authenticated create/list/read/rename/mode-before-history APIs, participant add/delegate/end/rejoin, empty archive and idempotent archive/end retries. Server-assigned audit actors/timestamps and versions are atomic with mutations.
- Restricted group-owner nonparticipants to five governance fields in group lists; inaccessible details and participant intervals return indistinguishable 404 responses. Strict DTOs reject foreign financial fields before legacy whitelist stripping.
- Added group → space transaction locks, last-manager protection, stale-write checks, group departure/archive guards and database identity/interval constraints. New core has no dependency on legacy Fund accounting.
- Added strict Web projection parsers and guarded local demo seed. Two real seed runs retain 3 spaces, 5 participant intervals and 3 CREATE audits; rerunning does not overwrite an existing mode or first-record latch.
**Decisions:**
- P1 is a usable real-backend management API slice. It posts no money and returns no fabricated zero summary. Nonempty archive/exit remains rejected until P3/P5 implement mode-owned obligations.
- Kept legacy Fund schema/data disconnected until P7. Applied the additive migration only to a fresh schema and an old-schema fixture in the dedicated loopback test database; legacy Fund fields remained exactly unchanged and no financial space was synthesized.
- Used direct transactional group guard queries without a new GroupsModule dependency. Lock/participant behavior uses real database tests; conditional pipe behavior is covered through DTO and real HTTP tests. Detailed plan deviations are recorded in the P1 execution record.
- RED/GREEN self-review fixes cover inherited invalid currency, unchanged updates incorrectly creating audit/version changes, interval existence disclosure and valid IANA aliases omitted by timezone enumeration. Seed URL safety also has an observed failing-then-passing test cycle.
**Verification:**
- `npx prisma validate` and backend `npm run build` passed. Final unit run: 24 suites / 266 tests. Existing e2e: 5 suites / 54 tests, no provider changes to those suites.
- Web `npm run lint`, `npm run typecheck`, and `npm test` passed: 69 files / 446 tests.
- Final `npm run test:spaces-db` passed: 2 suites / 27 tests, including real HTTP, schema guards, concurrent duplicate actions, group departure races and audit-failure rollback. Web `npm run build` exited 0 with the baseline standalone warning below.
- Local migration checks passed for fresh and legacy-upgrade histories. Seed safety tests reject external, missing, malformed and unapproved database targets. No Staging or Production database was used.
**Known gaps / follow-ups:**
- P2–P7 remain as mapped in the roadmap, including accounting services, settlements/confirmations/corrections, UI redesign and offline drafts. Full three-mode browser acceptance against a real backend remains the P7 release gate; P1 is verified with authenticated real HTTP and PostgreSQL.
- The pre-existing Web standalone build warning about missing `(public)/page_client-reference-manifest.js` also occurs on this branch. It predates P1; standalone runtime packaging needs a separate follow-up before deployment.
- Original root untracked `.codex-remote-attachments/` and `reference/` were preserved. Work stays on `codex/financial-spaces`; no merge or push is included.

## 2026-09-11 — P2 exact expense values

**Task:** Begin the approved P2 plan sequentially with exact money/date boundaries.
**Scope:** Backend expense-values and Web major-to-minor parser with focused tests.
**What changed:** Added positive bigint minor-unit validation, real DATE/month boundaries and decimal-text conversion without floating-point amounts.
**Decisions:** Preserve existing bigint-safe display formatting; keep the new input parser separate from legacy Activity number arithmetic. Individual records use PostgreSQL bigint bounds; aggregate range is a separate concern.
**Verification:** Observed missing-module RED, then 22 backend value tests and 13 Web input tests passed. Shared local database guard has 9 passing cases after extraction. Full P2 baseline remains a later gate.
**Known gaps / follow-ups:** P2 taxonomy, financial CRUD, monthly read model and browser UI are still in progress.

## 2026-09-11 — P2 persistence and stable taxonomy

**Task:** Add neutral expense facts and shared vocabulary without changing legacy financial semantics.
**Scope:** Prisma schema/migration, taxonomy catalog/seed, local DB guard and test configuration.
**What changed:** Added ExpenseRecord, record tags, idempotency receipts, scoped taxonomy identities and audit events. Added 16 localized categories and 15 contextual tags with stable UUIDs; extracted the loopback-only test database guard.
**Decisions:** Additive migration retains legacy development fixtures until P7 cleanup. Scope/merge/name/amount/version constraints complement service authorization. System seed updates display metadata without replacing identities or private terms.
**Verification:** Observed absent expense table RED before migration. Fresh and P1-upgrade migration histories passed on task-owned local schemas; before/after legacy Fund and P1 box snapshots matched. Constraint, duplicate receipt, FK and private-seed preservation checks passed in the 10-case personal DB suite. Full seed ran twice successfully. Prisma validate/build passed; current backend baseline is 320 unit and 54 e2e tests passing.
**Known gaps / follow-ups:** Financial endpoints and Web are separate following commits. P2 runtime acceptance remains in progress; no external database was modified.

## 2026-09-11 — P2 scoped taxonomy lifecycle

**Task:** Make common categories and tags usable with private/group scope and stable historical identity.
**Scope:** Taxonomy DTOs, policies, controller/service/module, authenticated HTTP test fixture and lifecycle tests.
**What changed:** Added create, rename, merge and archive; immutable system terms; actor-scoped recent/frequent/context picker with participant authorization. Mutations serialize by owner/group and atomically audit actor/time. Merge resolves canonical graphs without rewriting expense IDs.
**Verification:** Observed route404 RED, then 3 real HTTP lifecycle cases GREEN. Two independent Prisma clients tested duplicate term creation, stale renames, competing merges and audit rollback. Missing default regression observed400-style input error RED, then explicit SYSTEM_TAXONOMY_MISSING GREEN. Baseline build/320 unit/54 e2e passed with the P2 modules present.
**Known gaps / follow-ups:** Personal expense posting and Web are following commits; shared and pooled financial rules remain P3/P5.

## 2026-09-11 — P2 private expense accounting

**Task:** Deliver owner-only daily expenses and authoritative monthly consumption.
**Scope:** Expense persistence/receipt services, personal-expense module/DTO/query/consumption services, authenticated lifecycle and concurrency tests.
**What changed:** Create/full-replacement edit/soft-delete with canonical minor-unit strings, real dates, owner/mode checks and atomic actor/time audit. Receipt replay authorizes first and never duplicates writes. First-record latch never clears. Full-month SUM is independent of page size and uses canonical taxonomy only for grouping.
**Decisions:** Personal accounting has no balances, income, payers or transfers. Open dates before box creation are valid for personal history; future local dates are rejected. Archived terms can remain on unchanged historical selections but cannot be selected for new postings. Empty successful reads return zero; failures propagate.
**Verification:** Observed missing-route RED before financial/monthly implementation. Full realDB regression: 5 suites/48 cases passed, including P1 privacy, duplicate create/update/delete, edit/delete and archive races, taxonomy races, audit/receipt rollback, schema constraints, month/currency/cursor isolation, large totals and unchanged stored IDs after merge. Baseline Prisma validate/build, 320 unit and 54 ordinary e2e passed. Self-review corrected the test's expected currency-mutation status to existing strict DTO400.
**Known gaps / follow-ups:** Web acceptance is in progress; P3 shared and P5 pooled financial services are intentionally separate later work.

## 2026-09-11 — P2 Web financial contracts

**Task:** Connect private expense and taxonomy endpoints through the authenticated Web BFF.
**Scope:** Strict financial/taxonomy response schemas, UUID/query BFF routes, exact amount parser compatibility and tests.
**What changed:** Added me/spaces, private taxonomy lifecycle, participant picker, monthly expenses and financial mutation routes. Request bodies preserve minor-unit strings and request UUIDs; common CSRF/session refresh behavior is reused.
**Verification:** Missing-route/schema RED preceded implementation. Focused contract/BFF/parser run passed 37 tests. Self-review caught an unsafe Zod BigInt refinement for invalid decimal input and changed it to guard parsing; Web typecheck caught bigint literal syntax against its existing target and was corrected to BigInt constructors. Earlier Web lint/typecheck passed before subsequent UI refinements; final full baseline remains pending.
**Known gaps / follow-ups:** UI and real backend browser acceptance are separate following work. No financial number coercion or legacy Fund projection was introduced.

## 2026-09-11 — P2 personal PWA delivery

**Task:** Complete a usable no-group personal bookkeeping journey in this task.
**Scope:** `/app/personal`, personal queries/forms/month view, taxonomy picker/manager, minimal navigation, real-backend browser acceptance and feature map.
**What changed:** Added private box creation and selection, exact daily expenses, month/category totals, edit/delete confirmation, paginated reads, ranked searchable taxonomy and private rename/merge/archive. Network retries retain the same request UUID; version conflicts preserve input and explicitly review current state. Offline input remains unposted and requires user submission after reconnecting.
**Verification:** Observed missing-component RED before UI work. Regression RED/GREEN covered conflict input retention, archived category labels and desktop dialog positioning (400px off-center before the scoped CSS fix). Web lint/typecheck and 79 files/498 tests passed. Final real-backend Chromium journey passed all four projects (320/390/768/1440), with no mocked financial responses, including privacy, separate currencies, offline non-posting, keyboard focus and dialog bounds. Production build exited0; the pre-existing `(public)/page_client-reference-manifest.js` standalone-copy warning remains.
**Decisions:** Use existing pixel primitives and add a minimal 我的寶箱 navigation entry; full navigation/home/tasks remain P6. Locally reused the single task-owned Web process after cold-start timeouts/generated-cache corruption; stopped it before production build. Installed matching Playwright Chromium locally. No external database, merge or push was used.
**Known gaps / follow-ups:** P3 shared settlement, P4 references, P5 pooled services, P6 full PWA redesign and P7 durable drafts/three-mode acceptance/legacy removal remain. Standalone packaging warning needs a separate release follow-up.

## 2026-09-11 — P3 shared accounting kernel checkpoint

**Task:** Continue the approved redesign sequentially in this task, starting P3 with exact accounting invariants.
**Scope:** `shared-expenses/shared-accounting.ts`, `shared-allocation.ts`, `shared-settlements/minimum-transfers.ts`, their Jest tests, and P3 kernel plan/execution record.
**What changed:** Added payer/allocation validation, signed correction effects, paid-minus-allocated positions with COMPLETED-only transfers, EQUAL/FIXED/RATIO/HYBRID integer allocation, and exact minimum-transfer suggestions. No contribution or legacy Fund inputs are accepted.
**Decisions:** Largest remainder uses stable identity tie-breaking. Exact settlement search maximizes zero-sum partitions in O(n*2^n), capped at 16 nonzero positions with explicit rejection rather than approximation. Internal aggregates can exceed a database row's bigint range; persistence validation is a later boundary.
**Verification:** Observed 21 accounting, 20 allocation, and 11 minimum-transfer assertion failures before implementations; all 52 new tests then passed. Independent exhaustive oracle checked 625 small balanced cases and replayed transfers to zero. Backend build, all 34 unit suites/372 tests, and 5 ordinary e2e suites/54 tests passed. Reviewed every new source function and test; no critical/important issue remained.
**Known gaps / follow-ups:** This is an arithmetic checkpoint, not P3 acceptance. Shared schema/CRUD, effective-date validation, batch locks, correction persistence, audited/idempotent two-party confirmations, safe lifecycle, Web and real-backend browser acceptance still require implementation. The later integration must enforce the supported participant population before obligations can exceed the search bound. No database, Web, merge, or push operation occurred here.

## 2026-09-11 — P3 shared expense persistence

**Task:** Persist shared payer and allocation facts independently of legacy Fund expenses.
**Scope:** Prisma schema and `20260911000300_shared_expense_facts` migration.
**What changed:** Added shared payer/allocation relations on common ExpenseRecord, composite expense/user keys, user/expense foreign keys, positive payer and nonnegative allocation checks. Soft deletion retains facts; physical fixture cleanup cascades from ExpenseRecord.
**Decisions:** Additive migration with no legacy conversion or resets. Common positive expense storage remains unchanged; locked-source signed corrections belong to the following settlement checkpoint.
**Verification:** Real database table assertion failed before migration and passed afterward. Upgrade on task-local phase2 and all six migrations on phase3_fresh passed; fresh seed ran twice. Direct constraint tests rejected zero payer, negative allocation, duplicate identity and nonexistent user. Prisma validate and full Backend build/unit/e2e/realDB regression passed with the related HTTP implementation present.
**Known gaps / follow-ups:** The following commit connects authenticated CRUD and summary. Settlement batches, permanent/temporary locks, corrections and Web acceptance remain P3 work. Only the task-owned loopback PostgreSQL was accessed.

## 2026-09-11 — P3 shared expense HTTP checkpoint

**Task:** Deliver shared expense create/read/update/soft-delete and exact participant positions in this task.
**Scope:** Shared expense DTO/controller/services/module, common expense input DTO, participant-cap guards, HTTP/concurrency tests and test-suite wiring.
**What changed:** Added participant-private shared expense routes, complete payer/allocation projections, group taxonomy selection, occurrence-date eligibility, creator/manager editing, canonical request receipts and atomic actor/time audits. Payer-only and allocation-only edits advance versions; identical replacement does not. Summary reads full-space SQL sums under RepeatableRead and rejects inconsistent facts instead of displaying partial totals.
**Decisions:** Explicit allocation amounts are the HTTP contract; equal/ratio/hybrid calculations remain available in the kernel for the later form integration. Shared spaces support16 current participants; addition, mode switch and financial writes enforce the bound. Personal/common field validation now derives from neutral ExpenseInputDto without changing the private accounting runner. Existing fixture cleanup needs no change because the new relations cascade from physically removed fixture expenses.
**Verification:** Observed missing HTTP404 failures, then lifecycle GREEN. Disabled-participant assignment and17th-participant addition tests failed201 before their guards were implemented. Final Prisma validate/build,35 unit suites/375 tests,5 ordinary e2e suites/54 tests, and7 real PostgreSQL suites/66 tests passed. New realDB cases cover private/group-owner boundaries, dates, precision, taxonomy, replay, no-op, stale version, two-connection races and audit/receipt rollback. Self-review inspected all new functions and changed existing sections; no critical/important issue remains for this checkpoint.
**Known gaps / follow-ups:** Full P3 is incomplete. Next add batch snapshots and temporary/permanent locks together with source-linked corrections and two-party transfer confirmation; then settled lifecycle and Web/browser acceptance. No Web code or external database was changed, and no merge/push occurred.

## 2026-09-11 — P3 shared batch and correction storage

**Task:** Persist shared settlement periods, two-party transfer facts and immutable corrections independently of legacy Fund accounting.
**Scope:** Prisma schema and migrations 20260911000400/20260911000401.
**What changed:** Added batch/transfer/correction/effect/receipt models, inverse relations, actor/time fields, source revision uniqueness, one-pending-batch index and state constraints.
**Decisions:** Aggregated transfer amounts use exact NUMERIC(65,0) with bigint application arithmetic; ordinary expense targets retain the PostgreSQL bigint ceiling. Added a follow-up migration rather than modifying the already-applied migration when the missing received_at NULL check was discovered.
**Verification:** Table-presence RED then GREEN; a completed transfer with NULL received_at was accepted in the regression test before the additional CHECK and rejected afterward. All eight migrations installed on task-local phase3_batches_fresh; Prisma validate and two seed runs passed. Full backend build,390 unit tests,54 ordinary e2e and91 realDB tests passed; final expanded settlement/correction suites passed28 tests.
**Known gaps / follow-ups:** The related workflow implementation follows in the next commit. Settled lifecycle and shared Web/browser acceptance remain later P3 checkpoints. Only task-owned loopback PostgreSQL was used.

## 2026-09-11 — P3 batch confirmation and correction HTTP checkpoint

**Task:** Deliver shared batches, temporary/permanent locks, two-party confirmation and next-period corrections.
**Scope:** Shared-settlements DTO/controllers/services/module; shared financial read/expense lock wiring; HTTP and two-connection concurrency fixtures/tests.
**What changed:** Manager starts consecutive snapshot batches or cancels before any send. Correct transfer parties confirm sent/received with idempotent actor/time facts; only received transfers affect positions and the last receipt permanently locks the batch. Expense corrections post desired-minus-current signed payer/allocation effects; transfer corrections change obligations without consumption. All mutations atomically retain audits and request receipts under group-to-space locks.
**Decisions:** Source revision begins0 independently of source entity version; corrected total0 requires empty target sides. Current and historical eligibility prevents retroactive assignment to new members. A completed empty batch is formal history. The shared read model composes all expense/correction effects and completed transfers using bigint.
**Verification:** Observed missing batch/confirmation/correction routes fail before implementation, then GREEN;15 policy unit tests followed RED/GREEN. Backend build,36 unit suites/390 tests,5 ordinary e2e suites/54 tests,10 realDB suites/91 tests passed. Expanded final shared suites passed28 tests including3 additional review cases. Races cover edit/start, duplicate start, cancel/send, duplicate confirmations, final receipts, correction revisions and correction/start. Injected audit/receipt failures roll back facts, versions and receipts. Self-review covered every new source function, migrations and changed existing sections; diff exceeds200 lines, unrelated code excluded. Fixed the received_at NULL CHECK gap; no critical/important issue remains within this checkpoint.
**Known gaps / follow-ups:** P3 is not yet complete: settled participant exit/archive and shared Web/browser acceptance follow. Three-mode final browser acceptance remains mandatory before overall completion. No external database, merge or push was used.

**Web verification:** Unchanged Web lint/typecheck passed;79 files/498 tests passed after retrying sandbox spawn EPERM with local process permission. Build exited0 with the existing standalone public manifest-copy ENOENT warning. No shared browser journey is claimed by this backend checkpoint.

## 2026-09-11 — P3 settled shared lifecycle checkpoint

**Task:** Allow settled shared participants to exit and fully settled shared boxes to archive without reopening obligations or exposing history.
**Scope:** Shared lifecycle guard, financial-space archive/participant end integration, historical correction eligibility, manager survival, real PostgreSQL lifecycle/concurrency tests and checkpoint docs.
**What changed:**
- Shared archive now requires no pending batch, zero authoritative positions and completed coverage for every active expense/correction; participant exit applies the same rules only to that participant's obligations.
- Ended participants lose all financial reads, while authorized retries remain idempotent and archived history stays immutable.
- Exit-day source parties may be used in later corrections only after rejoining; unrelated newcomers and ended non-current parties remain ineligible.
- Surviving-manager checks count only other current managers with ACTIVE users and ACTIVE group memberships.
- Independent connections verify write/archive and write/exit races, duplicate lifecycle requests, concurrent manager exits and audit-failure rollback.
**Decisions:** Pooled mode keeps the conservative nonempty guard. Shared lifecycle reuses the authoritative bigint read model and existing group-to-space mutation lock; no schema, money formula or legacy Fund compatibility layer was added.
**Known gaps / follow-ups:** P3 still requires shared Web delivery and a real-backend browser journey. P4 references, P5 pooled lifecycle and later navigation/draft/cleanup phases remain planned.

## 2026-09-11 — P3 shared Web and browser checkpoint

**Task:** Complete the participant-private shared bookkeeping Web UI and prove the full lifecycle against the real task-local backend.
**Scope:** Shared Web/BFF contracts and routes, group discovery, expense/position workspace, settlement/correction/lifecycle panels, responsive pixel CSS, Playwright runtime acceptance, feature map and execution records.
**What changed:**
- Added strict Zod projections and CSRF/session BFF routes for shared spaces, participants, expenses, summaries, batches, transfers and corrections.
- Added participant-only navigation, exact decimal-string payer/allocation editing, authoritative positions, two-party batch confirmation, lock recovery, immutable correction and settled exit/archive UI.
- Added phone-small, phone, tablet and desktop real-backend acceptance with four isolated actor contexts, no mocked financial responses, stale-version recovery and request-ID replay checks.
- Reconstructed subsequent correction targets from ordered signed deltas with `BigInt`, and made archived workspaces explicitly read-only.
**Decisions:** Group governors receive metadata-only cards without financial links; former participants see neither the box name nor financial responses. Production browser acceptance reuses explicit task-owned servers so Next development cold compilation cannot obscure mutation outcomes. No legacy Fund adapter was introduced.
**Known gaps / follow-ups:** P4 personal references, P5 pooled accounting, P6 navigation/home/tasks and P7 durable drafts/full three-mode cleanup remain planned. The existing standalone `(public)/page_client-reference-manifest.js` ENOENT copy warning remains a separate release concern.

## 2026-09-12 — P4 private shared-expense references

**Task:** Link a participant's authoritative shared allocation into an owned personal ledger and prove its privacy and lifecycle against the real backend.
**Scope:** Prisma reference/receipt storage, personal reference mutation and month-query services, strict Web BFF contracts, shared opt-in and personal-ledger UI, four-viewport Playwright acceptance, and checkpoint documentation.
**What changed:**
- Added versioned private reference rows, private tags/notes, dedicated idempotency receipts and personal-space-only audits without creating a duplicate expense.
- Added current-participant, positive-allocation, same-currency and mode authorization under deterministic source/destination locks; former participants and governance-only users receive non-enumerating denials.
- Merged manual expenses and shared references into exact bigint personal consumption with canonical source categories, stable pagination, cross-space view versions and completed-source lock cues.
- Added shared opt-in plus personal private-metadata edit/remove UI with offline, stale, retry, focus and narrow-layout behavior.
- Added real-backend acceptance for phone-small, phone, tablet and desktop, including source updates, settlement, transfer exclusion, remove/reactivate, exit, archive and foreign/pool rejection.
**Decisions:** References derive amount/title/date/category from the shared source and never copy financial facts. Settlement transfers are not personal spending. Completed-source corrections remain separate next-period shared records. Omitted and explicit-null metadata are distinct idempotency payloads.
**Known gaps / follow-ups:** P5 pooled accounting, P6 navigation/home/tasks and P7 drafts/cleanup/full three-mode acceptance remain. The existing standalone public manifest-copy ENOENT warning persists.

## 2026-09-12 — P5 pooled-fund vertical

**Task:** Deliver the complete pooled-fund backend, participant-private Web workspace and real-backend browser lifecycle.
**Scope:** Prisma pooled models/migration; `backend/src/modules/pooled-funds/`; financial-space lifecycle integration; pooled Web contracts/BFF/workspace; real DB and four-viewport Playwright suites; feature and execution documentation.
**What changed:**
- Added bounded scheduled commitments with persisted participant occurrences and self-confirmed formal contributions.
- Added independent exact book/pending/sent-awaiting/available/shortfall accounting, fund-paid and advanced expenses, two-party reimbursements and immutable signed corrections.
- Added CLOSING, explicit fund returns, settled participant exit, archive guards, participant-first privacy and serialized idempotent audit/posting mutations.
- Added strict pooled Web creation, management, failure states and 320/390/768/1440 responsive real-backend acceptance without financial mocks.
**Decisions:** Expected occurrences never affect money; real negative balances remain visible; sent facts are corrected by new events; closing never invents return recipients; pooled accounting does not import shared formulas or legacy Fund normalization.
**Known gaps / follow-ups:** P6 navigation/home/quick-entry/tasks and P7 durable drafts/legacy removal/full three-mode acceptance remain. The existing standalone public manifest-copy ENOENT warning persists. No merge or push was performed.

## 2026-09-12 — P6 treasure navigation, home, quick entry and tasks

**Task:** Replace the active Fund-oriented entry experience with three-mode treasure navigation, home cards, adaptive expense entry and actor-scoped tasks.
**Scope:** `backend/src/modules/home/`, home/tasks DB acceptance, strict Web contracts/BFF, app shell/navigation, home/quick-expense/task UI, group space entry, Playwright acceptance and verification config.
**What changed:**
- Added read-only personal/group home and task projections with current-participant predicates, governance-only metadata, exact bigint strings and no read mutations.
- Added five-item treasure navigation, separate mode summaries, current-context quick expense routing and task center actions; removed the legacy Fund panel from group detail.
- Added deterministic SSR timestamps, offline-disabled quick actions, strict query/composite-ID contracts and real-backend 320/390/768/1440 acceptance.
**Decisions:** Dedicated task projection avoids N+1 full-workspace composition; personal home includes authorized private shared references, while pooled expenses never enter personal consumption. P7 still owns durable drafts and complete legacy removal.
**Known gaps / follow-ups:** Recent-activity projection uses a fixed query set but does not yet apply per-space SQL window limits. P7 retains durable offline drafts, legacy routes/code cleanup and combined three-mode beta acceptance. The existing standalone public manifest-copy ENOENT warning persists.

## 2026-09-13 — P7 durable drafts, legacy cleanup and three-mode acceptance

**Task:** Complete durable offline expense drafts, remove the legacy universal Fund product, and run combined real-backend acceptance for all financial-space modes.
**Scope:** Browser draft storage/recovery and three expense forms; PWA registration; legacy Web/BFF/backend/schema removal; generic route 404 privacy; real-backend acceptance; repository guidance and P7 records.
**What changed:**
- Added strict actor/group/space/mode/operation/version-bound drafts with reload persistence, explicit review/retry/discard, stale/blocked handling, and durable request UUID reuse.
- Removed legacy Fund pages, BFF/API modules, tables/enums, tests, and fixtures while retaining current-mode primitives and a Prisma-independent bigint accounting calculator.
- Added old-bookmark/error privacy, archived/closing draft discard, SSR-safe hydration, current-participant revalidation, and initial service-worker claim stability.
- Extended the five real-backend vertical specs across four viewports and updated the feature map, README, and AGENTS guidance.
**Decisions:** Drafts remain device-local and are never background-synchronized or auto-submitted. Framework not-found is used for old Web URLs; unmatched backend routes use a generic non-reflecting 404. Existing mutation request IDs are the duplicate-submit boundary.
**Known gaps / follow-ups:** Browser local storage is not encryption and assumes the same-origin application is not compromised. Next production build still exits 0 with the existing standalone public manifest trace-copy warning; standalone packaging remains a separate release-tooling follow-up.

## 2026-09-13 — Repair post-P7 GitHub CI contracts

**Task:** Fix the Web typecheck and Production containers failures reported by the first P7 `main` CI run.
**Scope:** `.github/workflows/ci.yml`, parsed workflow regression coverage, and PostgreSQL restore verification contracts.
**What changed:**
- Provisioned and generated the Backend Prisma client before the Web job type-checks real-backend Playwright specs.
- Replaced the restore verifier's legacy Fund table manifest with the complete current financial-space schema and updated its exact table count.
- Updated the backup contract's settlement-table assertion and added a workflow-order regression test.
**Decisions:** Kept the real-backend specs in the Web typecheck boundary; CI now supplies their explicit Backend client dependency instead of weakening TypeScript coverage or adding a duplicate Prisma schema.
**Known gaps / follow-ups:** The Web job performs a second Backend dependency install because GitHub jobs do not share files; this is deliberate and can later be optimized with a reviewed artifact or workspace design.

## 2026-09-14 — Establish visual asset hierarchy

**Task:** Separate Mimic visual sources, runtime assets, documentation art, and legacy mockups without changing rendered visuals.
**Scope:** `web/public`, `web/src/shared/brand`, asset scripts and tests, service-worker asset paths, `docs/design`
**What changed:**
- Moved master and source sheets out of the browser-delivered public tree.
- Replaced six duplicate role-named Mimiku files with one canonical six-state runtime set and semantic aliases.
- Published the visual asset catalogue and enforced public-tree boundaries in tests.
- Archived superseded PairFund mockups under an explicit legacy path.
**Decisions:** Runtime palette tokens are authoritative; image optimization and screen-level visual changes remain deferred.
**Known gaps / follow-ups:** Review responsive image variants, scene decomposition, exported UI icons, state coverage, and effects one screen at a time.

## 2026-09-18 — Reach Page Visual Phase 1 Gate A

**Task:** Execute the approved Asset Style Gate through the calibration approval checkpoint without production integration.
**Scope:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/`, `web/src/shared/brand/asset-style-gate.test.ts`, `web/e2e/asset-style-gate.spec.ts`, and deterministic screenshot baselines.
**What changed:**
- Added the eight-family consumer matrix, calibration briefs, machine-readable manifest, and empty decision log.
- Created one review-only sample each for wordmark, icons, Mimiku states/actions, avatar classes, Landing/Home scenes, frames, props, and motion.
- Added a semantic review index with navy/parchment composites, bounded live fallbacks, four-viewport screenshot baselines, and normal/reduced-motion behavior coverage.
- Added exact PNG signature/dimension/alpha/hash checks, immutable-source coverage, broken-image fallback checks, and motion hash verification.
**Decisions:** Kept every sample under the review directory, left every family `awaiting-calibration`, and made no changes to production assets, runtime registries, pages, tokens, manifest, or service-worker policy. Image-generator canvases were deterministically normalized to the plan's exact review dimensions without changing the approved source assets.
**Known gaps / follow-ups:** Gate A is awaiting explicit per-family approval/correction/rejection and acceptance or revision of proposed staged filenames/canvas choices. Complete-family generation, `docs/design/assets/approved/page-visual-v1/`, runtime promotion, page composition, and Phase 2 remain forbidden. Last verification: 75/75 focused unit/contract tests, 16/16 focused Playwright checks across 320/390/768/1440, changed-file ESLint and Web typecheck passed; immutable `icon.png` hash remained `f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac`.

## 2026-09-18 — Revise Gate A wordmark calibration

**Task:** Revise the rejected Wordmark sample so metal details no longer damage distance or compact-size legibility.
**Scope:** Wordmark review sample, review manifest and decision log, and four deterministic review screenshots.
**What changed:**
- Replaced heavy perimeter metal and repeated straps with wood-led letter silhouettes and sparse secondary join hardware.
- Preserved the display/compact calibration sheet, transparent 1200 × 400 contract, first-`M` eyes, and final-`C` mouth/heart-coin identity.
- Recorded the rejected original direction, updated the exact sample hash, and regenerated only the four review-page screenshot baselines.
**Decisions:** The revised sample remains `awaiting-calibration`; no complete-family generation or runtime integration is authorized.
**Known gaps / follow-ups:** Gate A still needs explicit approval of the revised Wordmark, including eye placement and the final `C` silhouette at compact size. Focused contract tests passed 10/10 and Playwright passed 16/16 across 320/390/768/1440.

## 2026-09-18 — Restore Mimiku visual lineage at Gate A

**Task:** Audit and restore the previously approved visual companion assets as the authority before any Mimiku recalibration.
**Scope:** Phase 1 lineage audit, Mimiku decision state, review index, focused asset contract, and deterministic review screenshots.
**What changed:**
- Recorded exact source, hero, state-sheet, and six runtime-state dimensions and SHA-256 values in a review-only lineage audit.
- Classified established states as `reuse`, missing semantic states/actions as source-constrained `derive`, and prohibited `new` from introducing new character anatomy.
- Marked the independently generated Mimiku calibration `rejected/superseded` while retaining it as auditable evidence.
- Linked the audit from the review page with contrast-safe keyboard focus styling and updated the four viewport baselines.
**Decisions:** Existing Mimiku master/model/state/runtime art remains the visual authority. No replacement image was generated and no production/runtime asset was changed.
**Known gaps / follow-ups:** Await approval of the lineage baseline before producing a replacement Mimiku calibration. Wordmark and the other six families remain separately awaiting calibration.

## 2026-09-18 — Rebuild Mimiku calibration from canonical sources

**Task:** Produce one replacement Mimiku Gate A sample after approval of the existing visual-companion lineage.
**Scope:** Review-only Mimiku archive, derived poses, deterministic composer, manifest/decision/audit records, review index, asset contract, and four viewport screenshots.
**What changed:**
- Archived the rejected independently generated sheet by exact hash instead of using it as an image-generation reference.
- Reused canonical Idle, Happy, Reminder, and Serious pixels; derived Working, Concerned, record-ledger, and adventure-complete only from the approved master/model/state/runtime sources.
- Added a deterministic 1536 × 1024 transparent contact-sheet composer that removes only small export-edge artifacts and clears RGB beneath fully transparent pixels.
- Locked rejected, derived, and final sample hashes in the focused contract and refreshed the review-only screenshots.
**Decisions:** The lineage baseline remains authoritative. The replacement is `awaiting-calibration` and is not approved for complete-family generation or runtime promotion.
**Known gaps / follow-ups:** Await explicit visual approval or corrections for the replacement Mimiku sample before reviewing another family.

## 2026-09-18 — Rebuild wordmark in canonical Mimiku pixel style

**Task:** Replace the smooth illustrated Wordmark calibration with a review-only sample that matches the existing Mimiku hand-drawn pixel language.
**Scope:** Wordmark source derivation, rejected-sample archive, deterministic composer, lineage audit, Gate A manifest/decision/review records, contract test, and four viewport screenshots.
**What changed:**
- Archived the rejected smooth-rendered Wordmark by exact hash and excluded it from replacement style references.
- Generated one source-constrained `MIMIC` wordmark from the canonical Mimiku master and model sheet, preserving the approved first-`M` eyes and final-`C` mouth/heart-coin structure.
- Added deterministic display and compact-inset composition with nearest-neighbor scaling and clean transparent RGB.
- Updated the review page and regression baselines for 320, 390, 768, and 1440 viewports.
**Decisions:** Canonical Mimiku stepped navy outlines, clustered pixels, limited color ramps, restrained dithering, and handmade asymmetry are the Wordmark style authority. The replacement remains `awaiting-calibration`.
**Known gaps / follow-ups:** Await explicit Wordmark visual approval or further correction. No complete family, runtime promotion, page composition, or next-family work is authorized.

## 2026-09-23 — Calibrate selected Wordmark V11

**Task:** Deterministically convert the user-selected V11 Wordmark visual into the required 1200 × 400 Gate A calibration sheet without redesigning it.
**Scope:** Phase 1 Wordmark composer, calibration PNG, manifest, decision/lineage records, review index, and focused asset-style test.
**What changed:**
- Locked V11's exact dimensions and SHA-256 in the focused test before changing the composer.
- Switched the deterministic composer from the superseded derived source to V11, preserving nearest-neighbor display/compact placement and zero RGB under fully transparent pixels.
- Updated the review-only calibration hash and placed the selected V11 control beside the canonical export in the review index.
**Decisions:** The V11 visual source is selected, but the new exact calibration hash and the proposed 1536 × 512 display, 768 × 256 compact, and 4608 × 512 motion-sheet canvases remain pending user confirmation. Wordmark stays `awaiting-calibration`; Gate A remains closed.
**Known gaps / follow-ups:** Stop at the visual checkpoint. Do not produce the complete Wordmark family or begin Icons calibration until the user confirms the exact calibration sample and canvas choices.

## 2026-09-23 — Record Wordmark Gate A approval

**Task:** Record the user's approval of the exact V11-derived Wordmark calibration and proposed staged canvases.
**Scope:** Phase 1 review manifest, decision and lineage records, review index, focused asset-style test, and devlog.
**What changed:**
- Marked only the Wordmark family `approved` at exact calibration SHA-256 `745eda3b5df02f9f7cf3e911a5f095c9fc16178892857a0b2d8d10379f42bd09`.
- Recorded the accepted 1536 × 512 display, 768 × 256 compact, and 4608 × 512 three-frame motion-sheet staged paths and canvases.
- Kept the other seven families at `awaiting-calibration` and kept the overall Gate A closed.
**Decisions:** Per-family approval permits continuing to the next calibration review; it does not authorize complete-family production, runtime promotion, page composition, or Phase 2.
**Known gaps / follow-ups:** Reconcile and present the existing Icons calibration, references, consumer mapping, safe-zone, grayscale, and small-size evidence for the next explicit decision.

## 2026-09-23 — Assemble Icons calibration checkpoint

**Task:** Present the existing Icons calibration beside canonical source/runtime references and required optical checks without producing replacement assets.
**Scope:** Icons review-only HTML and focused asset-style test.
**What changed:**
- Added one review page with the existing candidate, immutable/source/runtime controls, 16/32/48/192 CSS-size previews, grayscale comparison, and a live maskable safe-zone overlay.
- Restated named consumers, live-HTML boundaries, and evidence-based self-check findings outside raster pixels.
- Kept the manifest decision at `awaiting-calibration`; no icon image was generated or promoted.
**Decisions:** Recommend source-constrained recalibration because the candidate's smooth polished rendering does not yet match the approved V11/canonical stepped pixel language, while 16–32px simplification and measurable safe-zone evidence are also unresolved.
**Known gaps / follow-ups:** Stop for explicit approve, reject, or correction direction. Do not produce the complete icon family.

## 2026-09-23 — Recalibrate Icons from canonical sources

**Task:** Produce one review-only Icons replacement after approval of the documented correction directions.
**Scope:** Archived Icons sample, generated source, deterministic composer, manifest/decision/review records, and focused asset contract.
**What changed:**
- Archived the superseded calibration at exact hash instead of deleting it.
- Used built-in ImageGen with the immutable Mimiku master, pixel UI source sheet, selected V11, and prior calibration assigned explicit reference roles.
- Rejected the first generated attempt during self-check because navigation/mode icons retained smooth gradients and scenic bases; a single targeted edit removed those issues without changing the top-band composition.
- Deterministically normalized the selected 1254 × 1254 RGBA source to a clean 1024 × 1024 transparent calibration with nearest-neighbor scaling and zero RGB beneath fully transparent pixels.
**Decisions:** The replacement remains `awaiting-calibration`. It is review-only and does not authorize complete-family production or runtime promotion.
**Known gaps / follow-ups:** Await explicit approval, rejection, or a single-variable correction for exact calibration SHA-256 `28a1add69f6a15dcaeb3ffa897659f19c72736750d845de2ec433bb62ad1728c` and proposed icon staged paths/canvases.

## 2026-09-23 — Raise Mode icon pixel density

**Task:** Replace the rejected coarse mode-icon treatment with the approved high-density V11 hand-drawn pixel direction.
**Scope:** Icons calibration brief, archived intermediate candidate, generated source, deterministic composer input, manifest/decision/review records, and focused asset contract.
**What changed:**
- Recorded that mode icons use detailed 192px-class masters with later 48px optical exports, not enlarged 16 × 16 or 32 × 32 glyphs.
- Archived the coarse candidate at SHA-256 `28a1add69f6a15dcaeb3ffa897659f19c72736750d845de2ec433bb62ad1728c`.
- Reworked only the wallet, overlapping-receipts, and open-chest mode specimens at higher pixel density while retaining their meanings, order, grayscale counterparts, and transparent layout.
- Deterministically normalized the new source to the 1024 × 1024 calibration contract with clean transparent RGB.
**Decisions:** The low-resolution visual-companion mockups and coarse calibration are rejected style references. The current high-density replacement remains `awaiting-calibration`.
**Known gaps / follow-ups:** Await exact visual approval or one-variable correction for SHA-256 `2cdbb9b47bea7dcfe4aefdeed1b85da85830876e06935a0483cc3187bf60c90a`; do not produce the complete icon family.

## 2026-09-23 — Approve primary-navigation icon direction

**Task:** Preserve the user-approved five-icon navigation strip and place it into the Icons calibration beside the other icon evidence.
**Scope:** Navigation source, deterministic Icons composer, calibration/review records, focused asset contract, and devlog.
**What changed:**
- Recorded the approved Base campfire, Adventure Log journal, Adventurer Guild warrior/mage handshake, Tasks quest board, and Settings repaired-gear direction at exact source SHA-256 `3e9284c6666723c1d58a437063cd823bfee62d5acfdf682eaf54d5123c618cea`.
- Replaced only the five-icon navigation band in the review-only 1024 × 1024 Icons calibration; retained the existing install/face and mode evidence.
- Documented that the navigation approval is a sub-family decision and does not approve the complete Icons family.
**Decisions:** Keep Icons at `awaiting-calibration`; individual 48 × 48 optical exports and all non-navigation icon consumers still require review.
**Known gaps / follow-ups:** Review the recomposed calibration, then continue with the remaining Icons evidence without runtime promotion or full-family production.

## 2026-09-23 — Repair navigation calibration slicing

**Task:** Remove broken fragments in the approved primary-navigation row without changing its art direction.
**Scope:** Icons calibration composer, generated review PNG, manifest/decision hashes, focused regression test, and devlog.
**What changed:**
- Reproduced the defect as 123 blue-dominant sleeve pixels leaking into the task-icon cell.
- Replaced equal-width source slicing with deterministic alpha-component labeling, retaining the five main icons and intentional campfire rock components while discarding isolated generation noise.
- Rebuilt the review-only calibration and added a regression assertion that prevents the mage sleeve from leaking into the task icon again.
**Decisions:** Preserve the approved source unchanged; repair only deterministic composition. The Icons family remains `awaiting-calibration`.
**Known gaps / follow-ups:** Individual 48 × 48 optical exports and the remaining non-navigation icon evidence are still pending; no runtime assets were promoted.

## 2026-09-24 — Generate refined Tasks icon candidates

**Task:** Create three more detailed task-board icons for visual selection without changing the approved navigation source.
**Scope:** Phase 1 Tasks icon design/implementation notes, three review-only PNG candidates, comparison page, and devlog.
**What changed:**
- Used built-in ImageGen with the approved five-icon strip as the style and subject reference to create Adventurer Contract Board, Guild Quest Wall, and Expedition Planning Board candidates.
- Preserved each 1254 × 1254 RGBA output under `samples/task-board-variants/` with a versioned descriptive filename.
- Added an equal-scale comparison page with large and 48 px previews plus a live decision-boundary notice.
**Decisions:** No candidate is selected yet. The navigation source, main calibration, runtime assets, and Icons family decision remain unchanged.
**Known gaps / follow-ups:** Await the user's A/B/C selection before any source replacement, calibration recomposition, or optical export work.

## 2026-09-24 — Select Tasks candidate A

**Task:** Apply the user-selected Adventurer Contract Board to the primary-navigation calibration.
**Scope:** Selected Tasks source contract, deterministic Icons composer, calibration PNG, comparison/review pages, manifest/decision records, focused regression test, and devlog.
**What changed:**
- Locked candidate A at SHA-256 `3cb0cfd4d0b91e1e58f09ad69777dc72ce89944fc982a3c46c12817e68b72856` and marked it selected in the comparison page.
- Updated the composer to replace only the Tasks cell while retaining the original strip as the source for the other four navigation directions.
- Ignored invisible low-alpha generation fringe when sizing A so its visible board matches the visual weight of the adjacent icons.
- Rebuilt the review calibration at SHA-256 `8ddfc1ffa00ee3c0a6466c73d14ec813da50256de271d9a1b63793882612720d`.
**Decisions:** Candidate A is the selected Tasks master direction. The complete Icons family remains `awaiting-calibration`; no runtime asset or 48 × 48 optical export was produced.
**Known gaps / follow-ups:** Continue reviewing the remaining non-navigation Icons evidence before any complete-family production or runtime promotion.

## 2026-09-24 — Present focused Mode icon calibration

**Task:** Isolate the current personal, shared, and pooled mode icons for semantic, 48 px, and grayscale review.
**Scope:** Focused Mode review HTML, asset-style regression test, rendered desktop/mobile visual checks, and devlog.
**What changed:**
- Added a three-column review surface for the personal wallet, shared receipts, and pooled open-chest specimens already present in the Icons calibration.
- Reused the existing calibration PNG through clipped sprite windows; no icon pixels or source images were changed.
- Added live 48 px and CSS grayscale evidence for each mode plus explicit semantic, silhouette, and family-style review questions.
- Tightened each crop to its connected visible bounds after visual QA exposed neighboring sprite fragments in the first presentation pass.
**Decisions:** This page is review evidence only. No mode icon is approved, rejected, regenerated, or promoted by this change.
**Known gaps / follow-ups:** Await user feedback on the three mode concepts before recording a Mode sub-family decision or moving to the record-expense Action icon.

## 2026-09-25 — Approve Mode icon directions

**Task:** Record approval of all three presented financial-space Mode icon directions.
**Scope:** Mode comparison page, Icons review/index, calibration brief, decision log, focused regression test, and devlog.
**What changed:**
- Marked Personal wallet, Shared overlapping receipts and coins, and Pooled open coin chest as approved Mode sub-family directions.
- Recorded that approval includes the presented 48 px and grayscale evidence at the unchanged Icons calibration SHA-256 `8ddfc1ffa00ee3c0a6466c73d14ec813da50256de271d9a1b63793882612720d`.
- Updated review surfaces to distinguish the approved navigation and Mode directions from the remaining Icons work.
**Decisions:** This is a Mode sub-family decision only. The complete Icons family remains `awaiting-calibration`.
**Known gaps / follow-ups:** Install/favicon, record-expense Action, event/status, maskable, and final individual optical-export evidence remain pending before Icons Gate A approval.

## 2026-09-25 — Present record-expense Action icon A

**Task:** Produce the approved quill, loose-ledger-page, and subordinate-coin direction for user review.
**Scope:** Action source/master, deterministic composer, specialized review page, review links, and Gate A test.
**What changed:**
- Added one review-only 192 × 192 Action candidate with 48 px and grayscale evidence.
- Retained its generative source and recorded the deterministic master SHA-256 `5f261384aa4e5748a932ed692bc5dfa3bedd30e0c0892c02571a73dc31567680`.
- Kept the complete Icons family awaiting calibration and changed no runtime path.
**Decisions:** The loose page distinguishes the action from the approved Adventure Log navigation icon; the coin remains secondary.
**Known gaps / follow-ups:** User visual approval, event/status icons, install/favicon, maskable evidence, and final complete-family optical exports remain pending.

## 2026-09-27 — Approve record-expense Action icon

**Task:** Record user approval of the presented record-expense Action icon A.
**Scope:** Action review page, Icons review/index, calibration brief, decision log, focused regression test, and devlog.
**What changed:**
- Marked the quill, loose-ledger-page, and subordinate-coin Action direction as approved.
- Locked the approved 192 × 192 master at SHA-256 `5f261384aa4e5748a932ed692bc5dfa3bedd30e0c0892c02571a73dc31567680`, including its presented 48 px and grayscale evidence.
- Updated review surfaces while retaining the complete Icons family as `awaiting-calibration` and leaving runtime paths unchanged.
**Decisions:** Approval applies only to the record-expense Action sub-family direction.
**Known gaps / follow-ups:** Install/favicon, event/status, maskable, and final individual optical-export evidence remain pending before Icons Gate A approval.

## 2026-09-30 — Event and status icon calibration checkpoint

**Task:** Produce nine review-only Event / Status icon directions from the approved direct-accounting-object design.
**Scope:** Event / Status ImageGen sources, deterministic composer, 192 px masters, 48 px optical exports, manifest, review page, focused tests, calibration brief, and decision log.
**What changed:**
- Added nine transparent source directions and deterministic normalized review outputs.
- Added exact SHA-256 metadata, grayscale evidence, approved-family controls, and four-viewport checks.
- Kept all product runtime paths unchanged and retained the Icons family as awaiting calibration.

**Decisions:** Used posture and overlap instead of arrows; preserved the old ledger in Correction; kept Lock and Offline visually simpler than event icons.
**Known gaps / follow-ups:** Await user approval or revision of the exact presented hashes; install/favicon, maskable, and final individual optical-export evidence remain pending.

## 2026-10-01 — Approve Event and Status icon directions

**Task:** Record user approval of all nine presented Event / Status icon directions.
**Scope:** Event / Status manifest, deterministic composer, review page, calibration brief, decision log, focused contracts, and devlog.
**What changed:**
- Marked all nine Event / Status directions approved at their existing exact master hashes.
- Added a deterministic guard that rejects any future master whose SHA-256 differs from the approved set.
- Retained the approved 48 px and grayscale evidence without changing any PNG pixels.
- Kept the complete Icons family awaiting calibration and left runtime paths unchanged.

**Decisions:** Approval applies only to the Event / Status sub-family and preserves all accounting-boundary notes.
**Known gaps / follow-ups:** Install/favicon, maskable, and final individual optical-export evidence remain pending before Icons Gate A approval.

## 2026-10-01 — Approve Install and Favicon direction

**Task:** Produce and record the user-approved Install / Favicon calibration using the selected single-master strategy.
**Scope:** Install / Favicon ImageGen source, deterministic composer and config, five review PNGs, manifest, responsive review page, focused Vitest and Playwright contracts, calibration brief, decision log, and devlog.
**What changed:**
- Generated one complete-character Mimiku source and deterministically composed one opaque 512 px canonical master.
- Derived 192, 48, 32, and 16 px review outputs directly from the canonical master with nearest-neighbor sampling and recorded exact SHA-256 values.
- Added true-size, enlarged, grayscale, browser-tab, installed-app, responsive, opacity, lineage, and determinism evidence.
- Recorded explicit user approval of the single-master Phase 1 exception while leaving all product runtime paths unchanged.

**Decisions:** Keep the complete Mimiku and heart coin at every size without optical redraws. Approval applies only to the exact five Install / Favicon hashes; the complete Icons family remains `awaiting-calibration`.
**Known gaps / follow-ups:** Maskable, remaining final optical-export evidence, runtime promotion, and Gate A approval remain pending.

## 2026-10-01 — Maskable icon calibration checkpoint

**Task:** Produce the approved-direction Maskable review artifacts without runtime promotion.
**Scope:** ImageGen source, deterministic compositor/config, two PNGs, manifest, responsive review, focused contracts, calibration records, and devlog.
**What changed:**
- Generated a dedicated borderless complete-character Mimiku source on deep navy.
- Composed and hashed the opaque 512 px canonical master and direct 192 px nearest-neighbor derivative.
- Added 80% safe-zone, circle, rounded-square, squircle, aggressive-crop, grayscale, responsive, and deterministic review evidence.
- Added independent Vitest and four-viewport Playwright contracts while leaving runtime paths unchanged.

**Decisions:** Use the selected A direction, keep defining anatomy and the complete heart coin inside the centered 80% safe zone, and retain decision state `awaiting-calibration`.
**Known gaps / follow-ups:** Await exact-hash visual approval; runtime promotion, final optical-export evidence, complete Icons-family approval, and Gate A remain deferred.

## 2026-10-01 — Final UI icon optical evidence checkpoint

**Task:** Record Maskable approval and produce the remaining review-only 48 px Navigation, Mode, and Action icon evidence.
**Scope:** Maskable decision records, deterministic icon compositor/config, nine 192 px masters, nine 48 px exports, manifest, responsive review page, and focused Vitest/Playwright contracts.
**What changed:**
- Recorded approval of the exact Maskable source, 512 master, and 192 derivative hashes without changing their pixels.
- Normalized five Navigation, three Mode, and one Action direction from their approved sources into deterministic transparent masters and direct nearest-neighbor 48 px exports.
- Presented all eighteen UI icons together with true-size color and grayscale evidence and live semantic boundaries.
- Added independent raster-integrity and four-viewport no-overflow contracts.

**Decisions:** Preserve the selected Tasks candidate A; reuse the exact Mode crop coordinates from the approved review; keep every output review-only outside `web/public`.
**Known gaps / follow-ups:** Await visual approval of the nine new master/export hash pairs. The complete Icons family, all-family Gate A, staged production families, runtime promotion, and Phase 2 remain pending.

## 2026-10-01 — Icons calibration approval

**Task:** Record user approval of the final Navigation, Mode, and Action master/export pairs.
**Scope:** Optical-evidence manifest/review, Icons decision records, review manifest/index, focused contract, and devlog.
**What changed:**
- Changed the exact-hash optical-evidence decision from `awaiting-calibration` to `approved` without changing any approved PNG pixels.
- Marked the complete Icons calibration approved and linked the complete eighteen-icon evidence from the review index.
- Consolidated duplicate pending optical-evidence records into one approved hash table.

**Decisions:** Approval covers only the review hashes and accepted staged filenames/canvases for Icons; other families and Gate A remain open.
**Known gaps / follow-ups:** Do not create complete staged families until every Gate A family is approved. Runtime promotion and Phase 2 remain unauthorized.

## 2026-10-02 — Mimiku states and actions calibration checkpoint

**Task:** Produce the selected partial-lineage-repair Mimiku state/action family for visual review.
**Scope:** Four ImageGen sources, eight deterministic 512 px masters, combined calibration sheet, manifest, review page, focused Vitest/Playwright contracts, calibration brief, and decision log.
**What changed:**
- Preserved canonical Idle, Happy, Reminder, and Serious as read-only lineage controls.
- Generated repaired Working, Concerned, record-ledger, and adventure-complete sources, then normalized all eight poses with one deterministic pipeline.
- Added real 128 px and grayscale evidence, exact hashes, two semantic comparisons, and four-viewport no-overflow coverage.
- Kept every output review-only and left all runtime paths unchanged.

**Decisions:** Working keeps the quill visibly above the page; record-ledger requires page contact. Concerned stays recoverable and non-blaming; adventure-complete uses a modest step and restrained sparkles.
**Known gaps / follow-ups:** Await visual approval of the eight exact master hashes. Mimiku, Gate A, staged complete families, runtime promotion, and Phase 2 remain pending.

## 2026-10-02 — Clarify Mimiku record-ledger ink contact

**Task:** Move the record-ledger action's ink evidence to the opposite blank page for stronger visual clarity.
**Scope:** Record-ledger ImageGen v02 source, deterministic master/sheet/manifest/review outputs, calibration brief, decision log, and focused contracts.
**What changed:**
- Preserved the prior source and added a v02 source with the quill nib and sole short ink stroke on the cleaner right-hand page.
- Regenerated the record-ledger master and combined sheet at new exact hashes without changing the other seven masters.
- Updated the semantic copy and pending review records; no runtime path changed.

**Decisions:** Keep the mark small and non-textual while making active writing unmistakable at the 128 px evidence size.
**Known gaps / follow-ups:** Await visual approval of the revised exact hashes; Mimiku and Gate A remain pending.

## 2026-10-02 — Add prior-entry evidence to Mimiku ledger

**Task:** Correct the record-ledger interpretation by preserving the original active-writing pose and adding prior recorded marks to the opposite page.
**Scope:** Record-ledger ImageGen v03 source, deterministic master/sheet/manifest/review outputs, calibration brief, decision log, and focused contract.
**What changed:**
- Returned to the original source's quill position and left-page active ink stroke.
- Added three abstract, non-textual prior-entry marks to the right page and preserved v02 as superseded review lineage.
- Regenerated the record-ledger master and combined sheet while leaving the other seven masters unchanged.

**Decisions:** Use both active writing and restrained prior-entry evidence to communicate an in-progress ledger with existing records.
**Known gaps / follow-ups:** Await visual approval of v03; Mimiku and Gate A remain pending.

## 2026-10-02 — Approve Mimiku states and actions calibration

**Task:** Record user approval of the Mimiku states/actions v03 calibration at exact hashes.
**Scope:** Mimiku calibration config, manifest, review page, overall review manifest/index, calibration brief, decision log, design spec, focused contracts, and devlog.
**What changed:**
- Marked the exact eight 512 px master hashes and combined-sheet hash approved without changing any PNG pixels.
- Updated the family review and overall review index to show the approved state and approval date.
- Preserved all outputs as review-only with no runtime promotion.

**Decisions:** Approval includes the v03 record-ledger pose with the original quill and active left-page ink mark plus three restrained prior-entry marks on the right page.
**Known gaps / follow-ups:** Avatar, scenes, frames, props, and motion remain awaiting calibration. Gate A, complete-family production, runtime promotion, and Phase 2 remain pending.

## 2026-10-04 — Build Avatar / Classes calibration evidence

**Task:** Produce the eight-character Avatar / Classes visual calibration candidate from the approved references and implementation plan.
**Scope:** Eight transparent ImageGen sources, deterministic 512 px masters, 128/64 px optical exports, combined sheet, manifest, review page, focused Vitest/Playwright contracts, calibration brief, and decision log.
**What changed:**
- Generated one complete transparent full-body source for warrior, mage, ranger, rogue, physician, bard, alchemist, and cartographer.
- Added a deterministic nearest-neighbor normalization pipeline with a common baseline, clean transparent RGB, exact hashes, and fixed 4 × 2 roster order.
- Added one responsive review page with approved-reference comparisons, semantic identity notes, true-size optical evidence, and four-viewport no-overflow coverage.
- Kept all artifacts review-only and left product runtime paths unchanged.

**Decisions:** Use the warrior as the family anchor for apparent 2.25-head proportions and medium garment clusters; permit finer clusters only for faces, hands, and identity tools. Preserve approved references as identity authority and the ImageGen sources as full-body candidate authority.
**Known gaps / follow-ups:** Await visual approval of the eight exact master hashes. Avatar / Classes, Gate A, complete-family production, runtime promotion, and Phase 2 remain pending.

## 2026-10-04 — Approve Avatar / Classes calibration

**Task:** Record user approval of the eight-character Avatar / Classes calibration at the reviewed exact hashes.
**Scope:** Avatar config, deterministic manifest/review output, focused contracts, overall review manifest/index, calibration brief, decision log, and devlog.
**What changed:**
- Marked the eight exact 512 px masters and their deterministic 128/64 px evidence approved without changing PNG pixels.
- Updated the family and overall review pages to show approval and corrected the overall manifest to the current sheet path and hash.
- Preserved review-only status and left all product runtime paths unchanged.

**Decisions:** Approval is limited to the exact hashes recorded in `avatar-classes.manifest.json`; it does not authorize runtime promotion, animation, or Phase 2.
**Known gaps / follow-ups:** Scenes, Frames, Props, and Motion remain awaiting calibration. Gate A and runtime promotion remain pending.

## 2026-10-05 — Build Landing war-room visual review

**Task:** Compose a review-only Landing war room from the approved resting-party direction and character identities.
**Scope:** Landing spec/plan status, fourteen ImageGen sources, layout config/composer, desktop/phone PNGs, twenty-one transparent layers, wordmark derivation, manifest/review HTML, focused Vitest and Playwright contracts, and devlog.
**What changed:**
- Composed a warm asymmetric cave room with four resting party members, one map crate, one ordinary chest, sign, two torches, three bats, subdued carving, and pressure plate.
- Repositioned the same sources for the phone first viewport and kept live sign/dialogue/CTA text separate from the scene PNGs.
- Added a four-chapter journal example, approved master comparisons, source/output hashes, and deterministic alpha-clean layer exports.
- Used contract-first tests for manifest, dimensions, lineage, transparent RGB, and exact desktop 2× pixels; browser contracts cover 320/390/768/1440 widths.

**Decisions:** Preserve raw ImageGen bytes and clean only derivatives. Reuse the approved wooden wordmark as a separate accessible element. Lower the phone mage to the floor and separate the phone sign from Mimiku and the dialogue panel. Run static review browser checks through an ignored session config.
**Known gaps / follow-ups:** Await the user's visual review. Interaction responses, full horizontal exploration, lighting/animation production passes, Home, and runtime integration remain deferred. Scenes remains awaiting-calibration. Review artifacts remain uncommitted to preserve the pre-existing staged and unstaged work.

## 2026-10-05 — Refine Landing background toward option B

**Task:** Replace the visually busy, distant pointed cave backdrop with the user's selected B old-vault masonry direction.
**Scope:** Landing background ImageGen v03 source/prompt, config, composer review copy, deterministic desktop/phone outputs and manifest, spec/plan refinement, preserved v01 comparison PNGs, and devlog.
**What changed:**
- Replaced the central deep cavern vista and sharp formations with a close warm-brown rear wall of large masonry blocks; retained natural ceiling rock and the asymmetric side passages.
- Preserved the old architecture source and desktop/phone composites as versioned files.
- Reused all existing character/prop sources, layer preparation, placements, wordmark, and journal content.
- Recorded the parent source hash and submitted ImageGen prompt with the B revision.

**Decisions:** Keep this pass focused on the background so the room's enclosure and visual noise can be judged without changing the party. Maintain the existing floor height and review-only boundary.
**Known gaps / follow-ups:** Await visual judgment of the B composite. Scenes remains awaiting-calibration; interactions and runtime promotion remain deferred. No staging or commit was performed.

## 2026-10-06 — Refine Landing natural wall and hanging wordmark

**Task:** Retain B's enclosed room while replacing central masonry with natural rock and hanging the approved wooden MIMIC wordmark above the party.
**Scope:** Two versioned ImageGen sources/prompts, Landing config/composer, derived layers and desktop/phone outputs, manifest/review HTML, focused Vitest/Playwright contracts, spec/plan refinement, and devlog.
**What changed:**
- Generated a close warm natural rear wall and a separate transparent two-hook/short-cord mounting layer; archived the B desktop/phone PNGs without changing their source.
- Moved the unchanged approved wordmark to the upper central wall with a restrained contact shadow and separate desktop/phone placements.
- Added contract-first checks for mount connection, approved wordmark hash, party clearance and rendered positioning at four viewports.
- Corrected the desktop comparison to include the live wordmark rather than showing only its mounting hardware.

**Decisions:** Preserve all existing character/prop sources, placements, and wordmark pixels. Keep lettering accessible and separate from scene PNGs; normalize only derived alpha. Keep every change review-only and uncommitted.
**Known gaps / follow-ups:** Await visual judgment of this wall/sign refinement. Scenes remains awaiting-calibration; interaction design, Home, runtime integration and Phase 2 are deferred. No staging or commit was performed.

## 2026-10-06 — Enlarge Landing MIMIC wall title

**Task:** Enlarge the hanging MIMIC title to approximately two thirds of the central wall width.
**Scope:** Landing config, generated desktop/phone mounting layers and composites, manifest/review page, versioned browser previews, focused contracts, spec/plan notes and devlog.
**What changed:**
- Set desktop title width to 360 of 540 logical wall pixels and phone title width to 260 of 390 visible wall pixels; repositioned and scaled mounting hardware.
- Kept approved wordmark bytes, all creative source images, party/prop placements, background and journal content unchanged.
- Added contract-first wall-ratio checks and actual four-viewport browser sizing checks; corrected browser measurement to use artwork content width rather than the scene's 4-pixel border.

**Decisions:** Interpret two thirds as wall width, not total canvas area. Preserve the original wordmark aspect ratio and leave clearance above the mage; no new ImageGen source is needed for a layout-only scale change.
**Known gaps / follow-ups:** Await visual judgment of the enlarged title. Remains review-only and awaiting-calibration; no runtime changes, staging or commit.

## 2026-10-07 — Seat smaller Landing title on an intact rock face

**Task:** Reduce the previous MIMIC title by 20% and make it feel embedded in a broad rock face rather than bridging stone gaps.
**Scope:** Versioned architecture ImageGen source/prompt, Landing config/composer, generated review outputs/manifest/page, focused contracts, versioned previews, spec/plan notes and devlog.
**What changed:**
- Locally revised the central rear rock face to remove title-area intersecting seams while retaining the room geometry.
- Set title widths to 288/208 logical pixels, removed the hanging layer from selected composition, and reduced the contact shadow for a flush-mounted appearance.
- Added contract-first checks for exact 80% scale, intact-face placement, no hanging layer, and unchanged approved wordmark bytes.

**Decisions:** Preserve the wooden letter design as accessible live UI, not stone-carved or baked into the background. Retain prior sources, mounting exports and previews for comparison; party/prop placements stay unchanged.
**Known gaps / follow-ups:** Await visual judgment of v06. Scenes remains awaiting-calibration; no runtime changes, staging or commit.

## 2026-10-07 — Center Landing title on upper rock face

**Task:** Shift MIMIC slightly right and place it at the broad rock wall's upper center.
**Scope:** Landing config, generated manifest/review page, focused Vitest/Playwright contracts, versioned browser previews, spec/plan notes and devlog.
**What changed:**
- Moved desktop title from [332,87] to [385,84] and phone title from [91,154] to [96,130], preserving 288/208-pixel widths.
- Updated safe-face layout bounds to reflect the intact rock face; title center is horizontally aligned and about 35% down its height.
- Added contract-first horizontal/vertical placement checks and four-viewport rendered center checks.
- Self-review caught the first desktop placement approaching the bats; adjusted title placement and added an eight-logical-pixel clearance contract without moving other assets.

**Decisions:** Reuse every raster byte; this is a live layout adjustment with no ImageGen regeneration or runtime integration.
**Known gaps / follow-ups:** Await visual judgment of v07. Remains review-only and awaiting-calibration; no staging or commit.

## 2026-10-07 — Subdue Landing title tone

**Task:** Make the wooden MIMIC title slightly dimmer so it integrates better with the rock wall.
**Scope:** Landing review config/composer, generated manifest/HTML, Playwright contract, v08 browser previews, spec/plan notes and devlog.
**What changed:**
- Applied review-local brightness 0.82 and saturation 0.72, retaining full opacity and the shallow contact shadow.
- Added a red-green browser check of computed title filters while preserving four-viewport framing checks.
- Retained all original raster hashes, title dimensions/positions, characters and prop placements.

**Decisions:** Adjust live rendering rather than redraw or alter the approved wordmark pixels. Desktop/phone screenshot inspection confirms readable wood detail and more restrained highlights.
**Known gaps / follow-ups:** Await visual judgment of v08. Review-only and awaiting-calibration; no runtime promotion, staging or commit.

## 2026-10-07 — Explore Landing title rock inlay

**Task:** Show multiple ways to integrate the wooden title into the rock wall using local fissures and inset edges.
**Scope:** Three new ImageGen concept PNGs under landing-war-room/inlay-options-v09, comparison/prompt notes and devlog only.
**What changed:**
- Generated independent A/B/C edits from the subdued v08 desktop screenshot: restrained grooves, local rock interlocking, and a shared shallow recess.
- Saved raw generated bytes without replacing the selected review, approved wordmark, sources or layered composites.
- Recorded exact prompts and flagged that full-scene generated concepts may re-render unrelated pixels and UI text.

**Decisions:** Use concepts for choosing the stone/wood junction only; after selection integrate into the existing separated assets and keep accessible text live. Actual C reads more like a surround, so A or A with limited B interlocking is the calmer direction.
**Known gaps / follow-ups:** Await user choice. No production-ready invariant claim, responsive inlay exports, Scenes approval, runtime changes, staging or commit.

## 2026-10-07 — Match inlay title illumination to rock

**Task:** Bring the MIMIC title brightness closer to the surrounding dim stone wall.
**Scope:** Three new v10 ImageGen concept PNGs, exact prompt/comparison notes and devlog only.
**What changed:**
- Revised each v09 concept with subdued wood, brass and white highlights while retaining the prior junction direction.
- Saved new raw outputs separately and documented off-target foreground tone changes in A/B.

**Decisions:** Judge only the intended title lighting; do not promote generated scene-wide differences or dim the approved Mimiku layer during later integration.
**Known gaps / follow-ups:** Await visual choice; concepts are not byte-preserving production exports. Original review and runtime unchanged; no staging or commit.

## 2026-10-07 — Compare smaller, spaced B title in three brightness levels

**Task:** Refine selected B with slightly smaller wooden letters, more spacing and three visible brightness choices.
**Scope:** Three new v11 ImageGen concept PNGs, prompt/comparison notes and devlog only.
**What changed:**
- Generated a common B geometry anchor with smaller individual glyphs and clearer gaps; used it as the medium option.
- Generated dark and lighter title-tone concepts from that common anchor.
- Preserved old sources and selected review; documented generation targets versus actual visual results and incidental scene drift.

**Decisions:** Compare numbered brightness options 1/2/3 without conflating them with earlier A/B/C junction options. Final layered integration remains after user choice.
**Known gaps / follow-ups:** Await brightness selection. No exact percentage or pixel-invariance claim for concepts, runtime changes, staging, commit or Scenes approval.

## 2026-10-08 — Angle and enlarge Landing map crate

**Task:** Make the map crate less frontal, about 20% larger and clearly left of the campfire.
**Scope:** New ImageGen crate source/prompt; Landing config, composer, manifest, desktop/phone composites, derived map layers and browser previews; focused Vitest/Playwright contracts; scene spec, plan and devlog.
**What changed:**
- Generated a three-quarter low crate with front/right faces, preserving map, wood and small metal details; kept the old source.
- Increased displayed width from 94/66 to 113/79 and repositioned left of the unchanged fire.
- Added actual-alpha fire/warrior occlusion checks and browser checks that the dialogue does not cover the crate.
- Recorded the previously selected B junction / third v11 title brightness as pending layered integration.

**Decisions:** The first placement put the warrior's foot over the map. A foreground trial appeared off the floor, so it was rejected; the final desktop layout shifts only the warrior 60 logical pixels left, retaining the original dialogue and all other positions. Only the map source changes; character references and UI assets remain identical.
**Known gaps / follow-ups:** Await visual judgment of the crate and necessary desktop spacing. Selected v11 title integration remains deferred. No Scenes approval, runtime/public changes, staging or commit.

## 2026-10-08 — Place Landing map crate upper-left of campfire

**Task:** Move the same map crate nearer the warrior/mage and slightly upper-left of the campfire without fire occlusion.
**Scope:** Landing config, composer review copy, manifest, desktop/phone composites and versioned browser previews; focused calibration contract; scene spec, plan and devlog.
**What changed:**
- Changed only crate placement: desktop [340, 290, 113], phone [124, 332, 79].
- Added a contract-first upper-left/left-party relation check alongside existing actual-alpha occlusion, size and lineage contracts.
- Retained the v02 angled ImageGen source, widths, all character positions, fire and dialogue.

**Decisions:** Treat this as optical placement only, not a new creative source. The crate is in front of the mage's lower robe while her upper body remains clear. Preserve v02 previews and save v03 separately.
**Known gaps / follow-ups:** Await visual judgment; selected v11 title integration still pending. No runtime/public changes, staging, commit or Scenes approval.

## 2026-10-08 — Refine Landing warming warrior and map-study mage

**Task:** Exchange the left-party roles so the warrior rests nearer the fire and the mage quietly studies the crate's map.
**Scope:** Two new ImageGen sources and prompt records; Landing config, review copy, manifest, composites, derived character layers and versioned browser previews; focused Vitest contract; scene spec, plan and devlog.
**What changed:**
- Generated separate transparent warrior warming-hands and mage map-study poses, preserving the previous sources and approved masters.
- Positioned the warrior closer to the unchanged fire and the mage at the left crate; aligned the crate with her hand without changing its source, angle or enlarged widths.
- Added contract-first source/role checks and an actual-alpha warrior/fire clearance regression.

**Decisions:** The first composite covered the warrior's right leg with the fire ring. A failing pixel-overlap test confirmed the defect; the revised position clears all flame/ring pixels on desktop and phone. The mage's staff rests at her outer side and the held book is omitted to clarify map reading. All other source assets, placements, lighting and live UI remain unchanged.
**Known gaps / follow-ups:** Await visual judgment of the two poses and responsive composition. Selected v11 title integration remains pending. No runtime/public changes, staging, commit or Scenes approval.

## 2026-10-08 — Compare Landing warm-rest compositions

**Task:** Execute the approved warm-rest plan inline through an A/B rough-composition visual checkpoint.
**Scope:** New landing-warm-rest config/composer/renderer, manifest and HTML; ImageGen sources/prompts/lineage under warm-rest; A/B logical, color, grayscale, layers and browser previews; independent Vitest/Playwright/lint configuration; devlog append only.
**What changed:**
- Generated independent continuous-ground desktop/phone architecture, four directionally lit resting companions and one ground-reflection layer. Retained raw originals and revised the ranger gaze inward in a second ImageGen version.
- Built A tight-fire-side and B staggered-welcome compositions with identical source assets, scales, live v08 title/UI and preserved four-chapter journal.
- Added contract-first source/hash, dimensions, exact 2x, grayscale, transparent RGB, alpha-occlusion, visitor-ground and four-viewport browser checks.
- Corrected phone sign/Mimiku occlusion and ranger/fire contact through placement-only adjustments; aligned desktop ground contacts and mage hands with the unchanged map.

**Decisions:** The approved coordinates were optical starting points, not final positions. Keep the fire and angled map sources/widths unchanged; do not loosen overlap assertions to pass. Existing v04 files, staged index and earlier untracked artwork remain untouched. Review artifacts are not staged or committed.
**Known gaps / follow-ups:** Both drafts remain awaiting-calibration, reviewOnly and not runtime-promoted. Await A/B choice and visual feedback before fine polish or selected B/C wordmark integration. No Scenes approval, product/runtime/public/registry/PWA/SW/Home/accounting/interaction or Phase 2 changes.

## 2026-10-09 — Landing A reduced party and staggered wordmark review

**Task:** Execute the approved Landing A refinement inline: remove the mage and compare single-line versus equal-letter-scale staggered MI / MIC titles.
**Scope:** New landing-a-title config/composer/renderer, manifest and review HTML; wordmark ImageGen sources/prompts/lineage; review rasters and 12 viewport previews; independent Web Vitest/Playwright/lint configuration; devlog append only.
**What changed:**
- Reconstructed the same A desktop and independent phone scenes, omitting only the mage and preserving every remaining source, layer, scale and placement.
- Retained two transparent ImageGen originals. Rejected v01 duplicate eyes; v02 keeps eyes only in the first M and the heart in C, with equal-scale staggered rows.
- Exported desktop single/staggered and shared phone staggered color/grayscale frames, cleaned wordmark masters, dimensions and exact hashes; preserved the four-chapter journal and live review UI.
- Added contract-first pixel, source/hash, alpha, viewport, focus and UI checks. Self-review added the layout-only reference hash through a failing test before fixing lineage.
- Verified 15 focused Vitest tests, four Playwright viewports (320/390/768/1440), focused ESLint, typecheck, 18 byte-identical regenerated outputs, dimensions and transparent RGB. Inspected actual live UI previews.
**Decisions:** Raw ImageGen content reaches alpha 254, not 255; preserve raw bytes and assert near-opaque content, while deterministic cleaned masters require binary alpha and zero transparent RGB. Apply one baked tone to both title arrangements. Keep this implementation unstaged and uncommitted in the existing dirty checkout.
**Known gaps / follow-ups:** Await visual review; all new artifacts remain awaiting-calibration, reviewOnly and not runtime-promoted. B wall integration / third-C brightness polish and chest/map crate/trap placement are deferred. No Scenes approval, product/runtime/public/registry/PWA/SW/Home/accounting/interaction or Phase 2 changes. Production build and full-repository test suites were not run.

## 2026-10-14 — Landing desktop title positioning review tool

**Task:** Add the approved desktop single-line MIMIC positioning tool to the existing review page.
**Scope:** New positioning model/controller/tool renderer/HTML-only CLI; incremental existing renderer/HTML; independent Vitest/Playwright contracts; new preview screenshots; devlog append only.
**What changed:**
- Layered the existing title-free desktop scene and fixed-size single-line title without modifying source or export bytes.
- Added pointer drag, focused keyboard and button nudges, separate guide/clean modes, reset and immutable-identity JSON.
- Added native clipboard copying, selectable fallback and serialized requests with stale-position feedback; image failures disable the tool.
- Preserved the original review HTML outside the tool block, phone frame, candidates and journal.
- Verified 23 focused Vitest tests, 52 Playwright cases across 320/390/768/1440 (including native clipboard and actual file URL), TypeScript and five-MJS/three-TS focused lint; HTML regenerated byte-identically, with 36 prior title assets/config files unchanged. Saved and inspected eight new initial/clean previews.
**Decisions:** Coordinates are integer logical pixels in the 960×540 desktop frame. No scaling/rotation, automatic file saves, local persistence or position approval. Keep implementation unstaged in the dirty checkout. Test import uses the repository's literal relative MJS pattern; browser mouse steps scroll to the real scene and refresh geometry; native clipboard checks normalize Windows CRLF while retaining exact JSON content checks. MJS lint runs from repo root so docs files are not ignored.
**Known gaps / follow-ups:** Await user-position JSON before any separately authorized composition update. Runtime/public/registry/PWA/SW/Home/accounting/production exports and Phase 2 remain out of scope. Full repository suites and production build are not implied by focused review verification.

## 2026-10-14 — Landing mobile title positioning extension

**Task:** Extend the approved title-positioning review tool to the independent phone MI/MIC frame after the user's desktop positioning feedback.
**Scope:** Existing pure model/controller/tool renderer/HTML-only CLI and generated review HTML; new frame/clipboard coordinator and mobile Vitest/Playwright contracts; minimal desktop test selector/config changes; eight new mobile previews; devlog append only.
**What changed:**
- Added explicit desktop/phone selection with independent coordinates, guide/mode preferences, reset and JSON. Phone uses the unchanged 390×600 scene and 148×98 staggered title, starting at 116/93.
- Kept hidden-frame controls inert, ended capture on switching and preserved focus. Coordinated clipboard writes across frames; failed or mismatched phone images disable only phone.
- Preserved all historical HTML outside the sole marked tool block. HTML-only generation validates actual hashes and dimensions of all four desktop/phone sources and produces byte-identical results.
- Observed 4 new unit failures before frame math, then only the absent phone HTML failure; all 60 new browser cases failed before UI implementation. Final focused verification passed 28 Vitest tests and 112 Playwright cases across 320/390/768/1440, including actual file URL, native clipboard and real touch dragging/page scrolling. Focused ESM/TS ESLint and typecheck passed.
- Saved and inspected eight new initial/clean phone previews. Self-review re-read actual implementation and contracts; no critical or important issues remained. Verified 1,276 prior non-task files, web/public and staged binary diff against the fresh execution baseline.
**Decisions:** Reuse the existing warm brown/brass controls and artwork, with single-pointer nudge alternatives and phone-specific live overlays. No media-query frame switching or automatic persistence. User desktop receipt x=376/y=100, exact source hashes and center 54.17%/26.30% are recorded in the independent implementation plan, not applied to manifest/config or raster exports. Only the new spec/plan were independently committed; overlapping implementation remains unstaged/uncommitted.
**Known gaps / follow-ups:** Await the user's phone position JSON and separately authorized position application. Reload resets each preview to manifest coordinates. No art/source/master/gray/config/manifest/runtime/public/registry/PWA/SW/product/Home/accounting/production export or Phase 2 changes; assets remain awaiting-calibration, reviewOnly and not promoted. Full-repository suites and production build were not run. Non-failing Playwright NO_COLOR/FORCE_COLOR and Git LF/CRLF notices are not lint or contract failures.

## 2026-10-15 — Apply confirmed Landing title placements to review outputs

**Task:** Apply the user's confirmed desktop 376/100 and phone 130/59 title positions to review-only color and grayscale scenes.
**Scope:** New placement receipts, independent compositor, derivative manifest/review HTML, six versioned PNG exports and eight viewport scene previews; new Vitest/Playwright contracts and combined config; devlog append only.
**What changed:**
- Validated both complete user receipts against the unchanged frame/source identities, dimensions, logical bounds and center percentages before composition.
- Reused the existing title-free bases and exact transparent title rasters without redrawing, resizing the title, retone or moving any other object. Exported desktop logical 960×540 and nearest-neighbor color/gray 1920×1080; phone logical/color/gray remain 390×600.
- Created a separate confirmation page showing only selected desktop/phone frames, actual grayscale, live labels and the original four-chapter journal. Original review, positional tools, configs, manifests, sources and old exports remain unchanged.
- Observed five actual unit RED assertions and four viewport RED cases before implementation. Final focused verification passed 33 Vitest tests and 116 Playwright cases at 320/390/768/1440, focused ESM/TS ESLint and typecheck. Verified alpha/transparent RGB, independent full-pixel reconstruction, scale/grayscale coefficients and all asset hashes; all eight generated files regenerated byte-identically.
- Re-read actual implementation/contracts and inspected both color/gray exports plus eight viewport previews. Self-review found no remaining critical or important issue. New owned-output overwrite protection was exercised by temporary test tampering with exact restoration in finally.
**Decisions:** Keep previous evidence intact in the dirty checkout and create a versioned confirmation instead of invoking the old bulk composer. Reuse the existing warm review styles with independent frame proportions. Vite's eager analysis prevented the initial literal missing-module assertion, so delayed loading established actual RED; once the real module existed, use the established literal relative import to avoid Windows dynamic-path drive loss. Only the new independent implementation plan was committed; implementation/artifacts stay unstaged/uncommitted.
**Known gaps / follow-ups:** Await visual approval or adjustment feedback for the applied placement version. Old positioning tool deliberately retains its original initial coordinates; the new confirmation page/manifest are the applied-position evidence. No Scenes approval, runtime/public/registry/PWA/SW/product/Home/accounting/production exports or Phase 2 changes. Full repository suites and production build were not run. Original 1,295 files and staged binary diff are protected by a fresh baseline; devlog history is append-only.

## 2026-10-15 — Calibrate ordinary Landing chest material to warrior

**Task:** Redraw only the ordinary round-lid chest material and pixel treatment against the warrior, keeping its placement, both title placements and phone unchanged.

**Scope:** New ImageGen source/prompt/lineage, three independent review modules, manifest/review HTML, eight PNG exports and twelve viewport previews; new Vitest/Playwright contracts and isolated combined config; devlog append only.

**What changed:**

- Used built-in ImageGen with the original chest as edit target and warrior master, actual scene warrior and desktop as references. Preserved the returned transparent source bytes; simplified woodgrain and metallic shading without changing chest identity or orientation.
- Normalized a transparent 78x66 logical layer with proportional nearest-neighbor fit and binary alpha/clean transparent RGB. Rebuilt the original scene from architecture and ordered layers and proved complete old-scene pixel equality before replacement.
- Kept the chest at 105/284. Exactly 4,146 logical pixels differ, all inside its fixed 78x66 bounds; no old-chest paint-over, background retouch or other object movement.
- Reused original phone/title bytes. Added actual-size, equal 3x zoom, grayscale, warrior references, original/new desktop with live UI and the four-chapter journal; saved and inspected twelve real screenshots across 320/390/768/1440.
- Observed seven original unit RED assertions and four browser RED cases before implementation. Added a further failing integration test showing an incomplete prior output inventory could bypass one output hash; require the complete expected output set before writes.
- Final focused verification passed 41 Vitest tests and 120 Playwright cases, scoped ESM/TS ESLint, TypeScript, syntax and deterministic complete-byte regeneration of all eight PNGs, HTML and manifest. Contracts independently verify pixels, source hashes, alpha/RGB, dimensions, proportional fit, zoom and grayscale.
- Re-read all new implementation/contracts and checked all seven self-review dimensions. Fixed an unnecessary test-module return type assertion and the output-inventory guard; no critical or important issues remain.

**Decisions:** Keep all artifacts independent and review-only; no historical composer/config/manifest/page/source edits. One selected material candidate, not position candidates. New implementation/artifacts remain unstaged/uncommitted. Existing 1,320 protected files, all 19 web/public files and staged binary diff matched the fresh baseline before this append; the original devlog prefix is protected separately.

**Known gaps / follow-ups:** Await user material-only visual approval or edits. Chest position, map-crate/trap review and whole Scenes approval remain separate. No runtime/public/asset registry/PWA manifest/service worker/product/Home/accounting/production export/Phase 2 changes. Full-repository suites and production build were not run. Playwright NO_COLOR/FORCE_COLOR and Git LF/CRLF notices are non-failing environment warnings.

## 2026-10-17 — Coordinated Landing treasure-chest four-state review

**Task:** Complete closed, cracked, half-open and open states together, freezing both titles, phone and all other objects.

**Scope:** New ImageGen atlas/prompt/lineage, five review-only ESM modules, twenty-five PNG exports, independent manifest/HTML, two Vitest files, Playwright spec/config; implementation-plan sample-code corrections and this append.

**What changed:**

- Used built-in ImageGen for one coordinated 2x2 family, then two registration edits. Preserved all three original transparent image files with exact hashes and edit-target lineage. Gold coins dominate with a few gems retained inside; no reward effects or financial behavior.
- Shared one source scale, 104x120 envelope, origin (92,230), local ground (52,120), world ground (144,350), and closed-derived lower body. No per-state tight-crop fit or CSS-rotated fake lid.
- Reconstructed architecture and ordered layers, keeping original title/phone bytes. Changed 4311/4313/4959/5181 logical pixels across the four states, all within the chest envelope; other objects remain untouched.
- Added actual-size/2x/true-gray family comparison, old closed candidate and warrior references, unchanged phone, live semantic labels, native chest hit target and external controls. Playback is manual, 140ms per transition, reverse-to-close, no input queue, manual cancellation, reduced-motion terminal switching, and explicit missing/decode failure handling.
- Observed 13 initial unit RED assertions and a genuine missing-page browser RED. Self-review added complete ImageGen history and real non-image decode coverage. Fixed transformed function-toString output differences by embedding hash-checked raw script bytes instead; deterministic regeneration now passes through Node and Vitest.
- Final verification: 55 focused Vitest tests across nine files (14 new, 41 existing), 140 Playwright cases (20 new, 120 existing) across 320/390/768/1440, scoped TS/ESM ESLint, typecheck and five ESM syntax checks. Inspected sixteen state scene screenshots plus four unchanged-phone screenshots.

**Decisions:** Run mutation-based artifact suites sequentially with a 30s test budget; parallel runs could observe another suite's deliberately damaged manifest. No old tests or guards weakened. Preserve dirty checkout/index, do not stage or commit. Synchronize plan interface/sample code with raw-script and source-history changes. UI/UX reduced-motion review confirmed the existing media-query/direct-terminal behavior without changing art direction.

**Known gaps / follow-ups:** Await user visual approval of the entire four-state family; no individual state or Scenes-family approval inferred. Hinge coordinate is a review guide, not an automatically measured physical hinge. No runtime/public/registry/PWA/SW/product/Home/accounting/production exports/Phase 2 changes. Full-repository suites and production build not run. Original 915 scoped files and staged diff verified unchanged; devlog original bytes must remain an exact prefix. Windows sandbox tests required normal-host execution; NO_COLOR/FORCE_COLOR and Git EOL notices are non-failing warnings.

## 2026-10-20 — Restored treasure-chest eight-frame review

**Task:** Produce the approved repaired old-chest family and weighted opening/closing preview together, without moving titles, phone or surrounding objects.

**Scope:** Six new restored-chest ESM modules; three raw ImageGen attempts, selected source, prompt and lineage; 49 PNG outputs, independent manifest/HTML/verification receipt; two Vitest files and Playwright spec/config; this append.

**What changed:**

- Used built-in ImageGen for the coordinated chest and two targeted revisions. Kept every raw transparent source unchanged, preserving actual edit targets, references and exact hashes. The family includes four semantic states and four latch/lid transition frames, a replaced lower-corner fitting, warm wood, overlapping treasure and a restrained teal accent.
- Added explicit frame/state separation and nonuniform opening750ms / closing660ms. The latch clears first and returns after the lid closes. Retained native buttons, keyboard control, manual interruption, no input queue, reduced-motion terminal switching and missing/non-image failure protection.
- Shared a104x120 envelope, origin(92,230), ground(52,120), world ground(144,350), and lower-body pixel reuse excluding the moving latch. Independently reconstructed ordered scenes and verified zero changed pixels outside the envelope. Original phone/title bytes and all other objects remain unchanged.
- Observed17 initial unit RED failures and6 genuine missing-page browser failures before implementation. Added a further failing regular-lattice test after diagnosing source outer-padding versus cell-pitch mismatch, then made it pass without per-frame fitting, translation, scale changes or weakened registration tolerances.
- Final checks passed73 focused Vitest cases across11 files (18 new /55 existing),164 Playwright cases (24 new /140 existing), scoped TS/ESM ESLint, typecheck and6 ESM syntax checks. Inspected32 state scene screenshots,4 unchanged-phone screenshots, eight enlarged sprites and grayscale output.
- Two direct Node regenerations matched all51 PNG/HTML/manifest files byte-for-byte, in addition to the two Vitest rebuilds. Verified957 original scoped files and the existing staged binary-diff hash unchanged before this append; the original devlog bytes are protected separately.

**Decisions:** ImageGen produced transparent outer padding around a regular atlas lattice: use one origin(20,0),432x430 cell and432x430 stride for all eight frames, rather than treating the whole canvas edge as the cell boundary. This is documented in prompt/manifest and covered by an extra contract. No independent state crop-fit or scene repositioning. Retain v01 and all existing specs/plans unchanged. Inline only, no worktree/subagents, staging or commits. Self-review covered all seven dimensions with no critical/important implementation issues remaining; UI/UX review confirmed manual-only motion and reduced-motion handling without changing art direction.

**Known gaps / follow-ups:** Await entire new family visual approval or revisions; technical passes do not approve art or Scenes. Hinge coordinate remains a manual review guide. No runtime/public/registry/PWA/SW/product/Home/accounting/production exports/Phase2 changes. Full-repository suites and production build not run. Sandbox cache EPERM and sandbox-only Chromium path failures were re-run on the normal host; only genuine subsequent RED/GREEN runs count. Playwright NO_COLOR/FORCE_COLOR and Git EOL notices are non-failing environment warnings.

## 2026-10-20 — Ancient recovered treasure chest visual family v03

**Task:** Produce the whole chest visual family as an understated ancient treasure repaired by the party, calibrated against the warrior, without moving titles, phone or other objects.

**Scope:** New antique-chest style decision record; compose/render-ancient-treasure-chest modules; v03 ImageGen sources/prompts/lineage and 49 review PNGs; independent HTML/manifest/verification receipt; one Vitest contract and Playwright spec/config; this append.

**What changed:**

- Recorded the product-commission mode's approved visual direction: value through workmanship and age, not ornate decoration; arched walnut timber, restrained dark iron, one integrated repair and a slim mechanical hasp. Prior v02 art was rejected, not approved. All prior artifacts remain untouched.
- Used built-in ImageGen for four actual calls: exploration, fresh warrior-referenced generation, connected-hasp/proportion revision, then whole-atlas registration/margin revision. Saved every raw output unchanged and selected attempt04 as family-source; actual generation versus edit targets and references are explicit, with no invented edit targets. No third-party survey artwork was copied or sent to ImageGen.
- Kept the existing eight-frame/four-state playback, 750ms opening/660ms closing, fixed 104x120 envelope and world ground(144,350). New compositor uses one regular source lattice origin(62,0), cell/stride410x410 and one uniform transform; no per-frame fit, warp or translation. Reused verified lower-body pixels excluding the moving hasp region.
- Preserved existing model/controller/raster/renderers read-only. New renderer exposes real generate/edit lineage separately because the legacy table assumes every source has an edit target; retained v01 and rejected v02 comparisons, actual size/2x/grayscale/warrior reference and frozen phone.
- Observed genuine RED: seven missing-manifest unit failures and one missing-HTML desktop browser failure. New suite passed7; combined focused suite passed80 across12 files. New browser cases passed24; full scoped browser regression passed188 across320/390/768/1440. Scoped TS/ESM ESLint, typecheck, two ESM syntax checks and git diff checks passed.
- Two direct Node rebuilds matched all51 PNG/HTML/manifest files byte-for-byte, in addition to two Vitest rebuilds. All49 PNG dimensions passed; 368610 transparent output pixels had zero nonzero hidden RGB. Independent ordered-scene tests verified no changes outside the chest envelope; titles and phone remain pinned.
- Compared1025 original scoped files with the turn-start baseline: zero changed. Staged binary-diff hash remains96241f5fc7516568a9ba83d26d2ccd1a6ead98e3ff36cdea1e01979629b402d3. Original devlog prefix is verified separately. No staging, commits, worktree or subagents.

**Decisions:** User approved the understated recovered-antique identity and explicitly authorized the whole visual family. The selected source is93a3096fd29ae343d833cc5921bcc6a3740d824af4765f856fb8f762a217f170. Keep art awaiting-calibration/reviewOnly with runtimePromotion false. Self-review covered correctness, edge cases, completeness, architecture, style, security and tests; no critical/important implementation issues remain. Visual checks included all eight enlarged sprites, grayscale, logical closed/open composites and representative four-viewport scene/phone screenshots; automated contracts cover every frame in every viewport.

**Known gaps / follow-ups:** Await user's whole-family visual verdict; no claim of artistic approval or final production animation. Scene hinge is still a manual review guide. No product/runtime/public/registry/PWA/service worker/Home/accounting changes, production exports or Phase2. Full-repository suites and production build not run. Initial sandbox temp-cache EPERM and sandbox-specific Chromium lookup failures do not count as RED; reran with workspace TEMP/TMP and existing host PLAYWRIGHT_BROWSERS_PATH. Non-failing NO_COLOR/FORCE_COLOR and existing Git EOL warnings remain.

## 2026-11-02 — Ancient chest v04 visual review family

**Task:** Execute the approved v04 revision design using ImageGen edits of v03, RED opening-progress contracts, and an independent whole-family visual review.
**Scope:** New v04 composer/renderer/verifier, derivation sources/prompts/lineage/baseline, 49 review PNGs, manifest/HTML/verification receipt, focused Vitest and Playwright spec/config; this append only.
**What changed:**
- Retained five raw built-in ImageGen edits; attempt01 edits v03 with warrior references, selected attempt05 copied unchanged to family-source (SHA-256 494f26780f351601962c58630857fc21aea60dafa0a00c3bb3c31e7282eb45ca).
- Added opening-progress contract and v03 negative control. Final 2x tops116/116/116/114/106/98/86/78; cracked-to-open steps8/8/12/8, max33.33%, all four rules pass.
- Added eight-frame v03 comparison, measured progress table, repair1x/4x color/true-gray crops, original scene and frozen phone, actual edit lineage.
- Added RED and fixes for missing original-scene comparison, exposed-staple drift and static-lid drift during hasp-only poses. Kept the single lattice/common transform; explicitly reuse stationary pixels.
- Final v04 Vitest13 passed and four-viewport Playwright28 passed; earlier combined92 and browser regression212 passed. ESLint/typecheck/syntax passed. Two direct Node rebuilds kept all51 files byte-identical;49 PNG dimensions/hashes passed,382374 transparent pixels with zero hidden RGB. Envelope exterior has zero differences.
**Decisions:** Retain original750ms opening/660ms closing and segment delays. Preserve all v01-v03 and existing scoped artifacts;876 captured hashes unchanged, staged binary diff unchanged, original205135-byte devlog prefix preserved. No staging or commit.
**Known gaps / follow-ups:** Stop awaiting whole-family visual verdict. Lower-left lighter wood is identifiable in scene and grayscale; the side-facing square nail remains less legible than the front fastener at1x, so the two-square-nail detail is not certified. Exact100-degree geometry is a visual target, not a measured angle. No runtime/public/registry/PWA/SW/product/accounting changes, exports or Phase2. Full-repository suites and production build not run.

## 2026-11-02 — Approve Landing treasure chest v04

**Task:** Record the user's approval of the ancient treasure-chest v04 family after independent review.
**Scope:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`; this append.
**What changed:**
- Added an approval section with the selected source hash, all eight sprite hashes, re-measured lid progression and accepted limitations.
**Decisions:** Left the v04 manifest at `awaiting-calibration` because its composer regenerates it byte-identically under contract tests; the decision log is the approval authority. Scenes row stays open; only the chest element is approved.
**Known gaps / follow-ups:** Map crate / trap placement and whole-Scenes approval are next; Frames, Props and Motion remain. No runtime/public/registry changes, staging or commits.


## 2026-11-02 — Landing pressure plate v02 appearance candidate (C)

**Task:** In product-commission mode, execute only C from the approved prop-placement / pressure-plate design, verify it, and stop for appearance review before A.
**Scope:** New pressure-plate-v02 derivation sources/prompts/lineage; standalone compositor,12 review PNGs, HTML/manifest/verification receipt; focused Vitest and four-viewport Playwright spec/config; this append only.
**What changed:**
- Used built-in ImageGen with the exact design-document attempt01 prompt and actual cave scene / warrior / approved v04 chest references; followed with two edits for muted stone, footprint and a continuous mechanism slot. Preserved all three raw PNGs and prompts; attempt03 copied byte-identically as the review candidate (SHA-256 9be635235f59d04107827569c372346508cea8423d65143575ee72039b0101ab).
- Added native1x / nearest4x / true-grayscale / v01 comparisons, original-position desktop scene and native-size scrollable scene/crops. Derived an80x18 binary-alpha sprite with transparent RGB0 using one uniform nearest transform and no hand painting.
- Kept origin(850,339), scene opacity0.85, approved v04 chest, titles, phone and all other layers frozen. Independently rebuilt the v04 desktop exactly before replacement; only1,254 pixels inside the80x18 pressure-plate envelope changed.
- Final focused Vitest5 passed; four-viewport Playwright12 passed at320/390/768/1440. Scoped TS/ESM ESLint, typecheck, ESM syntax and Git whitespace checks passed. Two direct Node rebuilds kept14 PNG/HTML/manifest files byte-identical; all12 PNG dimensions/hashes passed,11,662 transparent pixels had zero hidden RGB.
**Decisions:** Stop awaiting the user's pressure-plate appearance verdict; do not mark approved or start A. Use an80x18 canvas with16px sampled content to preserve generated proportions. Review remains awaiting-calibration/reviewOnly with runtimePromotion false. Self-review covered all new functions and contracts; no critical/important implementation issues remain. Preserved all1,266 captured pre-existing files and Git index; devlog original bytes retained as a prefix.
**Known gaps / follow-ups:** User may select or revise the appearance; position and A remain pending. No runtime/public/registry/PWA/service-worker/product/accounting changes, worktree/subagent, staging/commit, production exports or Phase2. Full-repository suites / production build not run. The earlier automatic approval review failed due to usage limits before the compositor was written; resumed on the user's instruction. Initial test-root/import-resolution and ignored-file lint issues were corrected and are not counted as missing-artwork RED.

## 2026-11-02 — Pressure plate attempt-04 front gap and warmer stone (C revision)

**Task:** Execute only the design's C revision using its exact prompt to edit attempt-03, verify the result, and stop for appearance review before A.
**Scope:** New attempt-04/retry raw PNGs and prompts, sibling lineage, standalone composer,19 review PNGs, HTML/manifest/verification receipt,2 focused Vitest files and four-viewport Playwright spec/config; this append only.
**What changed:**
- Used built-in ImageGen with the exact attempt-04 document prompt, unchanged attempt-03 edit target and actual cave colour reference. Retained that raw output; normalization exposed interrupted front-gap highlights, so made one groove-only retry and preserved both calls/prompts. Selected retry SHA-2566186839b101bbad448f6fe22e181652a61ed3168942f3490226b413aab5fab16; all attempt-01–03 originals and previous review artifacts remain read-only.
- Added attempt-03/v01,1x/4x/true-gray, desktop/local context and front-edge8x comparisons. Canvas80x18, origin(850,339), opacity0.85 unchanged. One uniform nearest transform with binary alpha/hidden RGB0; no manual painting. Only1252 pixels within plate envelope differ from frozen approved-chest desktop.
- Added reproducible HSV contract: fixed inner plate rectangle(854,342,72,9) and2px floor ring. Candidate S0.696208,V0.600194; floor S0.714348,V0.543358; delta+0.056835. Attempt-03 S0.461468 fails S>=0.58. Normalized front gap is73 contiguous warm near-black pixels on row13 (91.25%).
- Focused Vitest8 and four-viewport Playwright12 pass; scoped TS/ESM ESLint, typecheck, syntax and Git whitespace checks pass. Two direct rebuilds match21 files byte-identically;19 PNG dimensions/hashes pass,22665 transparent pixels have zero hidden RGB; all5 raw copies verified.1293 captured old files and Git index unchanged; original devlog prefix retained.
**Decisions:** Keep awaiting-calibration/reviewOnly with runtimePromotion:false. The document does not record the original HSV mask; use identical explicitly pinned masks for both versions and disclose that these do not exactly replicate the old undocumented averages. Self-review inspected all changed functions/behaviours and representative browser/raster evidence; no critical/important implementation issues remain.
**Known gaps / follow-ups:** Await user's appearance verdict; no artistic approval or position approval. Exact original-mask measurement replication remains unverified. A has not started. No runtime/public/registry/PWA/service-worker/product/accounting changes, worktree/subagent, staging/commit, production exports or Phase2. Full-repository suites/build not run. Existing non-failing Playwright environment and Git line-ending warnings remain.


## 2026-11-02 — Pressure plate attempt-05 stair-aligned perspective (C revision)

**Task:** Execute the approved final C revision: measure architecture-only stairs, generate an outline, edit attempt-04 with the document prompt, verify and stop for appearance review before A.
**Scope:** New attempt-05 preparation/contracts/composer/renderer; raw sources/prompts/guide/lineage;13 review PNGs plus4 prepared PNGs; HTML/manifest/verification receipt;2 focused Vitest files and four-viewport Playwright spec/config; execution plan; this append only.
**What changed:**
- Manually marked the lower three stair left corners (857,326), (871,312), (883,299) on the architecture-only scene. Least-squares upward dx/dy=0.963436929; saved annotated evidence and a texture-free96x18 guide before ImageGen. Manual point-selection uncertainty approximately +/-1 logical px.
- Built-in ImageGen used the exact attempt-05 document prompt and raw selected attempt-04, guide and cave references. Preserved that output and two geometry-only retries with actual prompts. Selected retry-02 SHA-256 d2902a1277831ddd88b779852949ee34c79b6c83650cf44fb3d3ceaeca36c9b4; no CLI fallback, painting, warping or colour replacement.
- Added attempt-04 comparisons,1x/4x/true-gray, guide overlay, stair measurement, native scene and stair-mouth context. Uniform nearest derivation creates binary-alpha/RGB0 sprite on96x18, origin(850,339), opacity0.85; only1541 pixels within the expanded envelope differ from frozen baseline.
- Alpha slopes1.000/0.916667 pass measured slope +/-25%, relative difference8.33% <=20%. Attempt-04 has opposite signs; both earlier new outputs fail right-slope threshold. Fixed guide-adjusted colour mask yields S0.707723,V delta+0.070880; front gap77/80=96.25% continuous warm near-black pixels.
- Focused Vitest12 pass in3 files; four-viewport Playwright12 pass at320/390/768/1440. Scoped TS/ESM ESLint, typecheck, syntax and whitespace checks pass. Two direct rebuilds keep20 targets byte-identical;17 derived/prepared PNGs and3 raw copies verified.1220 captured pre-existing files and Git index unchanged; original devlog bytes retained as prefix.
**Decisions:** Awaiting-calibration/reviewOnly with runtimePromotion:false; stop at appearance review before A. Preserve front-left landing and approximately80px front long edge, widen canvas to96px for rear-right shear. Record/show the new fixed colour-mask formula; old rectangle retained, no claim of numerical equivalence. Self-review covered all new functions/sections and representative visual/browser evidence; no critical/important review-implementation issues remain.
**Known gaps / follow-ups:** User appearance verdict pending; position not approved. All attempt-01-04 originals/reviews/contracts unchanged. No A, runtime/public/registry/PWA/service-worker/product/accounting changes, worktree/subagent, stage/commit, production exports or Phase2. Full-repository suites/build not run. Corrected sandbox TEMP issue and a browser/image-decode race by running the browser after mutation/rebuild unit tests; final browser run all12 pass. Protected .agents directory requires scoped elevation solely for this append.


## 2026-11-03 — Pressure plate attempt-06 existing-source appearance review (C)

**Task:** Resume C using only the existing five attempt-06 sources; select a passing candidate, finish lineage/composition/review/validation/devlog and stop for appearance review without starting A.
**Scope:** New attempt-06 lineage, composer/renderer,13 review PNGs, HTML/manifest/verification receipt, focused integrity tests and four-viewport Playwright spec/config; local selection/baseline/rebuild receipts; this append only. Existing measurement, guide, preparation, contracts, core tests, all five source/prompt files and attempt-01-05 artifacts remain unchanged.
**What changed:**
- Re-evaluated the existing five sources with identical frozen scene, fitting, masks and thresholds; selected retry-04, SHA-256 f95a1a7b3db580c2baa1aeaf1bb7d2cd501674cb17ad7a5255e921aaf157abcc. No new ImageGen calls, no new source images, no remeasurement/guide/contract regeneration. Recorded all five historical edit calls, their actual prompts, guide/scene/extra references and original-byte locations in lineage.
- Candidate diamond slopes -0.412308/+0.412174/+0.398462/-0.397826 pass measured0.409276 +/-20%; opposite-pair differences3.51%/3.33% <=15%, apex x difference0px. Attempt-05's80px horizontal upper span fails the new diamond contract. Preserved the saved ten-tile measurement and2x2 diamond guide.
- Candidate scene S0.741732,V0.563881, floor V0.539935, delta+0.023946 passes S>=0.58 and delta0.02-0.08. Other deltas: retry-03 +0.098469, retry-02 -0.025010, retry-01 +0.095433, first output +0.121831; all fail colour. Existing gap contract left/right95.00%/97.44%; independent8-connected shadow check95.00%/92.31% also passes without editing the contract.
- Uniform nearest derivation yields80x35 content offset(2,0) on85x35; origin(856,331), center(898,348), opacity0.85. Binary alpha and RGB0. Only1661 pixels differ from original baseline,1850 from attempt-05, all inside old/new plate union(850,331,96,35). Added1x/4x/true-gray, attempt-05, guide overlay, same-scale real M2 tile comparison, scene/context, mask/gap evidence and five-source results.
- Focused Vitest15 pass across3 files; four-viewport Playwright12 pass at320/390/768/1440. Scoped TS/ESM ESLint, typecheck, syntax and whitespace checks pass. Two rebuilds keep37 monitored targets byte-identical;21 PNG hashes/dimensions/transparent RGB and all5 raw copies verified.1257 initial and1280 resume pre-existing files preserved, Git index unchanged; original devlog prefix retained.
**Decisions:** Preserve existing contracts and thresholds exactly; retry-04 is the only passing colour candidate. Rebuild skips byte-identical existing outputs and never calls preparation/ImageGen. Keep awaiting-calibration/reviewOnly with runtimePromotion:false. Self-review covered all new functions/sections plus representative raster/browser evidence; no critical/important review implementation issues remain.
**Known gaps / follow-ups:** User appearance verdict pending; no artistic or positioning approval. A remains unstarted. No runtime/public/registry/PWA/service-worker/product/accounting changes, worktree/subagent, stage/commit, production exports or Phase2. Full-repository suites/build not run. Previous run's automatic approval usage-limit interruption left the proposed contract patch unexecuted; continuation did not apply it. Manual tile-corner uncertainty remains approximately +/-2 logical px as recorded.

## 2026-11-03 — Approve Landing pressure plate attempt-06

**Task:** Record the user's approval of the floor-diamond pressure plate after independent review.
**Scope:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`; this append.
**What changed:**
- Added an approval section with source and sprite hashes, review placement, measured slopes, colour and gap results, and the accepted low-contrast limitation.
**Decisions:** Manifest left at `awaiting-calibration` (byte-identical regeneration); decision log is the authority. Only the plate element is approved; position awaits the placement tool (A).
**Known gaps / follow-ups:** Execute A (prop-placement tool) next. Scenes, Frames, Props and Motion remain open. No runtime/public/registry changes, staging or commits.


## 2026-11-03 — Landing prop placement tool (A)

**Task:** Implement the approved prop-placement tool using pressure plate attempt-06 and chest v04; finish verification and wait for user coordinate JSON without applying positions.
**Scope:** New landing-prop-position model/controller/composer/renderer, standalone HTML/manifest, two architecture-only review PNGs, verification report, implementation plan, focused Vitest, four-viewport Playwright spec/config; this append only.
**What changed:**
- Added independent desktop chest/mapCrate/pressurePlate and phone mapCrate placement, pointer capture, keyboard/buttons at 1/10 logical px, X/Y entry, individual/frame reset, guides and clean preview.
- Pinned the approved 85x35 attempt-06 sprite e398cd840975bd77dd2b6053476be2c1ab371107e5f6087f793052b08c883f7c at opacity0.85 and all eight approved v04 chest sprites. Chest uses one ground anchor across previews. No restriction to the right passage.
- Added advisory dialogue/floor/face/fire/Mimiku/sign/title/out-of-frame/open-lid warnings, y-based actor/prop order, and source-hashed per-frame JSON receipts. Hidden/error frames disable interaction. Clipboard requests serialize across frames and report stale/rejected writes.
- Final focused Vitest18 pass across3 files; broader asset contract run36 pass across5 files. Four-viewport Playwright24 pass at320/390/768/1440. Scoped ESM/TS ESLint and Web typecheck pass. Native Node rebuilds are byte-identical. All878 pre-existing review files preserved; original devlog prefix retained.
**Decisions:** Reconstruct architecture-only backgrounds from verified original crop/nearest sources and keep fixed actors as separate exact-source layers for depth sorting. Use conservative documented rectangle warnings rather than adding runtime collision logic. Initial positions are the existing review defaults and are not approvals. Self-review fixed inherited44px minimum height stretching sprites, sign-text depth, and dialogue layout drift; no critical/important issues remain.
**Known gaps / follow-ups:** Wait for the user to drag and return desktop/phone JSON; do not apply positions in this round. Warning geometry remains conservative and needs visual judgment. No new artwork, old-tool edits, runtime/public/registry/PWA/service-worker/product/accounting changes, worktree/subagent, stage/commit, production exports or Phase2. Full product suites/build not run. Full Web lint initially raced deletion of Playwright temporary output; final scoped checks passed. Protected devlog append uses scoped elevation only.

## 2026-11-03 — Remove Landing pressure plate

**Task:** Record the user's decision to drop the pressure plate as a Landing interactive prop after trying placements.
**Scope:** decision-log; prop-placement/pressure-plate spec; this append.
**What changed:**
- Decision-log entry withdrawing the attempt-06 approval for use, removing the plate layer from Landing, and noting the deviation from the 2026-09-14 initial interactive-object list.
- Spec appended with the removal decision; placement application now covers chest (desktop) and map crate (desktop/phone) only.
**Decisions:** Keep all pressure-plate artifacts as archived history; no files deleted. Did not edit the 2026-09-14 approved design; deviation recorded in decision-log.
**Known gaps / follow-ups:** Await the user's chest/map-crate placement JSON, then apply in a separate round without the plate. Consider whether a replacement discovery is wanted. No runtime/public/registry changes, staging or commits.

## 2026-11-04 — Landing 道具位置與比例套用

**Task:** 依核對過的桌機與手機回執套用寶箱與地圖木箱。  
**Scope:** Phase 1 獨立場景審核頁、合成器、產物與驗證。  
**What changed:** 從 v04 高解析圖集重新取樣八格寶箱，從原始木箱 PNG 分別取樣桌機與手機尺寸。依落地點排序，場景省略壓力板。  
**Decisions:** 木箱寬度保留原圖比例並取最近奇數，以維持半像素落地中心。關箱可見高度 94 px，木箱桌機 47 px、手機 33 px。  
**Known gaps / follow-ups:** 整體場景視覺審核待使用者確認。

## 2026-11-04 — Approve Landing scene composition

**Task:** Record the user's visual approval of the full Landing scene after independent measurement.
**Scope:** decision-log; this append.
**What changed:**
- Added approval section with desktop closed/open and phone scene hashes, independent measurements and the user-accepted shield overlap.
**Decisions:** Scenes row left open: Home secret-base calibration and a revised layered staged file set are still required by Gate A; the application round's verification receipt is still missing.
**Known gaps / follow-ups:** Codex to add the verification receipt; decide Home calibration and revise Scenes staged set; Frames, Props, Motion remain.

## 2026-11-04 — Home 秘密基地校準

**Task:** 執行 Scenes 規格第 2 部分並停在 Home 視覺審核。  
**Scope:** Phase 1 Home 審核頁、合成器、素材與來源、專項測試及兩份驗證紀錄。  
**What changed:** 保存 ImageGen 的桌機與手機原圖及提示詞，產出邏輯畫布與角色圖層。審核頁提供 Landing 並排比較、安全區、三職業切換及灰階。補登 Landing 道具套用的唯讀驗證。  
**Decisions:** 直接重用兩個 Landing 尺寸的篝火及地面光，以已核准的 Mimiku idle 和八職業素材貼合 Home 落地點。最近冒險卡後方採局部壓暗。  
**Known gaps / follow-ups:** 等待 Home 視覺審核。Scenes Gate A 與 Landing 手機探索條留在各自的後續階段。

## 2026-11-04 — Home 秘密基地 v02 校準

**Task:** 依 Scenes 規格 2R 製作獨立 Home v02，停在視覺審核。

**Scope:** Home v02 背景原圖與提示詞、合成器、審核頁、比例證據、驗證紀錄與測試。

**What changed:** 桌機和手機地板改為不規則扁石。桌機卡片區清出岩壁，手機保留 v01 卡片像素。依 Landing 頭部和眼球標註校準人物比例，新增八職業切換及可選空白掛紙。原 Home v01 產物以唯讀方式比對。

**Decisions:** 八職業每個畫布各用一個共通倍率。沿用 Landing 火光。桌機卡片不加壓暗，掛紙預設關閉。

**Known gaps / follow-ups:** 待 Home v02 視覺審核，包含石塊透視與掛紙取捨。

## 2026-11-04 — Approve Home secret base v02

**Task:** Record the user's approval of Home v02 after independent review.
**Scope:** decision-log; this append.
**What changed:** Approval section with architecture, Mimiku and avatar-slot hashes for desktop and phone, scale evidence, and accepted decisions (larger flagstones intentional; parchment placeholder not adopted).
**Known gaps / follow-ups:** Landing phone exploration strip (spec §3) is the last Scenes item before Gate A approval of the family.

## 2026-11-04 — Landing 手機探索條

**Task:** 依 Scenes 規格第 3 部分交付手機探索素材與擺位工具。
**Scope:** Phase 1 Landing 手機探索條、v04 寶箱八格、擺位預覽與驗證紀錄。
**What changed:** 保存 ImageGen 原圖及提示詞，產出 1170×600 探索背景與 110×126 八格寶箱；擺位工具可切換三段並匯出全畫布座標。
**Decisions:** 中段逐列覆蓋核准底圖，固定圖層及 33 px 木箱平移 x+390；寶箱以同一原圖 transform 取樣，關箱可見高度 66 px。
**Known gaps / follow-ups:** 兩側交界有局部石紋折線待目視驗收；等待使用者擺位回執。

## 2026-11-04 — 手機探索條 3R 接縫與回執擺位

**Task:** 局部重繪手機探索條接縫，通過 contract 後套用核准擺位並交付視覺審核。  
**Scope:** Phase 1 的 3R 合成腳本、ImageGen lineage、背景與八格合成、layout、manifest、審核頁、verification。  
**What changed:** 中段 234,000 個 RGBA 像素零差異，遮罩外零差異。兩條原接縫均未通過，新接縫均通過。已驗證回執雜湊、圖層順序及重建雜湊。  
**Decisions:** 在兩條 24 px 帶內取用 ImageGen 候選，對齊邊界顏色並校正偏冷像素，採 1.20 欄差比上限。  
**Known gaps / follow-ups:** 局部地板與岩塊仍看得出色階轉折，待使用者視覺審核。

## 2026-11-05 — 手機探索條 3R2 接縫暗谷

**Task:** 依 3R2 規格補正手機探索條接縫暗谷，加上色相保護並交付視覺審核。  
**Scope:** Phase 1 的 3R2 合成器、背景、八格場景、layout、manifest、審核頁與驗證紀錄。  
**What changed:** 兩條接縫的牆、地板與前景均通過 92% 亮度門檻及冷色比例檢查。共提亮 20,460 像素，中段 10,509 像素，變動限於兩條指定的 24 px 帶。  
**Decisions:** 採 BT.709 亮度偏移與冷色去飽和，使用二次羽化，沿用 3R 已驗證的圖層擺位。  
**Known gaps / follow-ups:** 牆面接縫亮度高於參考欄，接縫觀感與變更後的中段待使用者審核。


## 2026-11-05 — 手機探索條 3R3 接縫色度

**Task:** 依 3R3 規格修正 3R2 手機探索條接縫色度並交付視覺審核。  
**Scope:** Phase 1 的 3R3 合成器、背景、八格場景、layout、manifest、審核頁與驗證紀錄。  
**What changed:** 兩處接縫的六組量測通過 92% 亮度及 85% 飽和度門檻，3R2 負向對照五組未通過飽和度門檻。新增三版本全條與 6× 接縫對照。  
**Decisions:** 在 BT.709 YCbCr 沿固定 Y 修正 Cb／Cr，使用兩側參考欄與線性羽化。8 位元輸出最大亮度誤差為 0.482／255。  
**Known gaps / follow-ups:** 等待使用者目視審核接縫及中段。


## 2026-11-05 — Approve Landing phone exploration strip and Scenes family

**Task:** Record the user's approval of the 3R3 phone exploration strip and of the Scenes family for Gate A.
**Scope:** decision-log (Scenes table row and new section); this append.
**What changed:** Scenes row set to approved with references to Landing desktop, Landing phone strip 3R3 and Home v02 sections; added strip hashes, placement, seam-fix history and Gate A status (5 of 8 families approved).
**Decisions:** Did not edit `review-manifest.json` because its contract tests could not be run here; flagged for a separate Codex round.
**Known gaps / follow-ups:** Update review-manifest scenes sample with tests; Frames, Props, Motion remain.

## 2026-11-05 — Props 家族校準 v02

**Task:** 重做 Mimiku 壁畫、繪製四張功能插圖，交付可操作的 Props 校準審閱。
**Scope:** Phase 1 素材及 ImageGen 來源、擺位工具、審閱頁、manifest 與專項驗證。
**What changed:** 增加桌機與手機各兩種刻痕狀態、四張 256×256 功能插圖、實景切換、倍率及灰階對照、壁畫座標與狀態輸出。
**Decisions:** 同一 ImageGen 刻痕遮罩依預設岩壁像素調光。功能插圖由 ImageGen 四格圖分離並整數放大。擺位重用已核准的桌機圖層及手機 3R3 版配置。
**Known gaps / follow-ups:** 待視覺審核。壁畫色彩依預設落點校準，移位後需目視重新確認明暗。驗證結果見 props-calibration-v02-verification.md。

## 2026-11-05 — Approve feature chapter cues; request wall-carving revision

**Task:** Record approval of the four feature cues and specify the wall-carving revision.
**Scope:** decision-log; Props spec §2R; this append.
**What changed:** Feature cue hashes approved; carving v02 rejected for invisibility on phone, line-art look and conflict with the chest's open lid; §2R adds incised-groove styling, single-rock-face placement, chest-open forbidden zone and a texture-relative discoverability metric.
**Known gaps / follow-ups:** Carving v03 by Codex; Props row then approvable.

## 2026-11-05 — 隱藏壁畫 v03（2R）

**Task:** 依 Props 規格 2R 製作凹槽刻痕，更新擺位與審閱後交付視覺審核。  
**Scope:** v03 ImageGen lineage、composer、紋理量測模組、共用擺位 model／controller／renderer、v03 review／manifest／verifier、review-index、verification。  
**What changed:** 新增桌機與手機兩狀態刻痕、v02／v03 實景對照與實際大小截圖，工具即時重算紋理比值，新增隨寶箱座標更新的 open 禁止區與砌磚灰縫提示。  
**Decisions:** 桌機選 (718,128) 以遠離岩縫，手機 (948,136) 貼合斜岩面。取 ImageGen 實心輪廓重建暗槽與暖色槽緣。沿用已核准插圖與場景來源。  
**Known gaps / follow-ups:** 停在視覺審核。Hidden 偏含蓄，凹槽感與可發現性需驗收。移位後工具沿用素材像素，定案位置需重新合成取色。驗證詳見 props-calibration-v03-verification.md。


## 2026-11-05 — 隱藏壁畫 v04（2R2）

**Task:** 加強凹槽明暗、調整桌機落點並加入標題保留區，交付視覺審核。  
**Scope:** v04 壁畫 PNG、專項合成與驗證腳本、Props 審閱頁、擺位工具及驗證紀錄。  
**What changed:** 桌機與手機兩狀態加入更清楚的暗槽和暖色下緣。審閱頁顯示 v03／v04 與分組量測。擺位工具提示標題外框周圍 48 px，保留即時紋理比值、開蓋及灰縫提示。  
**Decisions:** 桌機保留 (860,120) 的 72×48 畫布，將可見刻線收進單一岩面。手機沿用 (948,136)。兩端沿用 v03 ImageGen 構圖。  
**Known gaps / follow-ups:** 停在視覺審核。待確認凹槽的立體感、hidden 可發現性及手機 revealed 的強度。數值見 props-calibration-v04-verification.md。


## 2026-11-06 — Approve wall carving v04 and Props family

**Task:** Record the user's approval of the wall carving v04 and of the Props family for Gate A.
**Scope:** decision-log (Props row and new section); this append.
**What changed:** Props row approved; carving hashes, placements, ratios and accepted small-size limitation recorded; Gate A now 6 of 8 (frames, motion open).
**Known gaps / follow-ups:** Update review-manifest.json scenes/props samples with tests; Frames and Motion calibration remain.


## 2026-11-06 — Frames 家族校準

**Task:** 製作五種 9-slice 框與可操作的 Phase 1 審閱頁，交付視覺審核。

**Scope:** Frames 審閱頁、審閱索引、PNG 母圖、frames.json、合成器、Vitest／Playwright 與驗證紀錄。

**What changed:** 以實際 border-image 套用羊皮紙、木、暖石、暖深褐對話框與筆記本。用法律文字、檔案、帳務表格、任務板、設定及快速記帳表單檢查留白，並將對話框放入 Landing 與 Home 的桌機／手機素材。

**Decisions:** 共用 36 × 36 的 1× 母圖規格、10 px 切片與 2× 角件。中心由 CSS 純色填滿。金屬配件採低調黃銅與暗鐵。

**Known gaps / follow-ups:** Frames 待視覺審核。Scenes／Props manifest 樣本另案更新，涉及既有 Gate A 測試契約。驗證見 frames-calibration-verification.md。



## 2026-11-06 — Frames 2R 原圖重繪

**Task:** 以 ImageGen 重繪五種 9-slice 框，交付新舊比較並停在視覺審核。

**Scope:** Frames 審閱頁與索引、ImageGen 原始圖集與提示詞、2R 合成器、PNG 與 frames.json、Vitest／Playwright、2R 驗證紀錄。

**What changed:** 以既有洞窟與道具作為材質參考。五張 52 × 52 母圖沿用 border-image，切片放寬為 14 邏輯 px，並加入同尺寸、同內容的第一版與 2R 比較。

**Decisions:** 保存單次圖集及來源外框。以確定性方式清理鍵色、調整金屬亮度並收斂邊條首尾。內距改為手機 18、桌機 26 CSS px，對話框維持原高度比例。

**Known gaps / follow-ups:** 2R 待視覺審核。窄視窗中的桌機場景預覽會裁切兩側。驗證見 frames-calibration-2r-verification.md。


## 2026-11-06 — Approve Frames 2R

**Task:** Record the user's approval of the Frames 2R masters and the Frames family for Gate A.
**Scope:** decision-log (Frames row and new section); this append.
**What changed:** Frames row approved with master and frames.json hashes, verification summary and accepted characteristics (stone/parchment slightly loud on dark pages; visible edge repetition on very wide frames). Gate A now 7 of 8; motion remains.
**Known gaps / follow-ups:** Motion calibration; synchronise review-manifest.json samples and Gate A tests.

## 2026-11-06 — Motion v02 校準與 Gate A 審閱資料同步

**Task:** 依 Motion 家族規格完成第 0 步、ImageGen 編修與逐格審閱頁，交付視覺審核。
**Scope:** Phase 1 review manifest／index、Gate A 契約測試、Motion v02 圖格／來源／合成器／審閱頁／驗證紀錄。
**What changed:** 同步 Scenes、Frames、Props 的既有核准樣本與雜湊。新增桌機與手機標題眨眼、Mimiku 待機、記帳、完成慶祝及篝火逐格，沿用 v04 寶箱與壁畫、Frames 2R 對話框。
**Decisions:** 以核准圖為底稿，只將 ImageGen 像素嵌入指定動作區。桌機與手機動作共用核准 512 px master 的對位，再取樣到各自的場景尺寸。標題 Mimiku「C」未辨識到獨立眼睛，保留原像素。
**Known gaps / follow-ups:** Motion 待視覺審核。見 motion-calibration-v02-verification.md。

## 2026-11-06 — Motion 2R 待機與完成慶祝

**Task:** 依 Motion 規格 2R 修正待機與完成慶祝，交付視覺審核。
**Scope:** Motion v02r 合成器、圖格、manifest、審閱頁、驗證，及 Gate A 審閱索引與契約。
**What changed:** 待機改為每格 250 ms 的雙格循環，每 3–6 秒插入 140 ms 眨眼。完成慶祝中段使用核准的開心姿勢，依序上移 2、3、1、0 個邏輯像素，首尾使用完成關鍵格。新增 v02／2R 時間軸與逐格對照。
**Decisions:** v02 作為唯讀比對基準。開心姿勢沿用 Home idle 的最近鄰取樣、倍率與場景錨點，星光直接取自 v02 的星光區。
**Known gaps / follow-ups:** Motion 2R 待視覺審核。見 motion-calibration-v02r-verification.md。


## 2026-11-06 — Motion 2R 慶祝角色尺寸一致

**Task:** 消除完成慶祝首尾因切換角色姿勢而產生的尺寸跳動。
**Scope:** Motion 2R 慶祝圖格、播放結果、審閱頁、規格與驗證紀錄。
**What changed:** 六格都採同一核准開心姿勢，僅垂直平移並疊加既有星光。播放結束、跳過與減少動態都切到 Home idle 基準格並保留冒險完成結果。
**Decisions:** Home idle 是播放後結果，與六格慶祝圖分開。逐格回歸測試分離角色與星光，檢查可見寬高、水平座標與預期垂直位移。
**Known gaps / follow-ups:** 等待 Motion 2R 視覺審核。

## 2026-11-06 — Approve Motion 2R; Gate A complete

**Task:** Record the user's approval of Motion 2R and completion of Gate A.
**Scope:** decision-log (Motion row and new section); this append.
**What changed:** Motion row approved; revision history, accepted sparse-sparkle characteristic and verification summary recorded; Gate A marked complete (8 of 8).
**Known gaps / follow-ups:** Gate B — complete staged families under docs/design/assets/approved/page-visual-v1/ with QA packet; motion-calibration-v02r manifest still reads awaiting status by generator design (decision log is authority).

## 2026-11-09 — Gate B1 已核准素材匯出

**Task:** 依 Gate B 規格匯出已核准素材並驗證 B1。  
**Scope:** `docs/design/assets/approved/`、`web/src/shared/brand/asset-style-gate.test.ts`。  
**What changed:** 新增可重建的 102 個素材檔、production manifest 與 B1 驗證紀錄。測試先重現缺 manifest，再重現缺素材。  
**Decisions:** 字標裁出核准的 display 與 compact，原像素置中留透明邊。Home 地面光沿用 Landing 像素，透過無損重新編碼保留獨立路徑和檔案雜湊。  
**Known gaps / follow-ups:** 停在 B1 審閱。Home 頭像槽已引用預定的 Avatar 資產 ID，對應圖片屬 B2。


## 2026-11-09 — Gate B1R 字標透明邊距

**Task:** 依 B1R 修訂兩張字標的輸出畫布。

**Scope:** Wordmark PNG、B1 匯出器、production manifest、asset style gate 測試與驗證紀錄。

**What changed:** 先以兩個測試重現原畫布超出留白規格。依核准校準圖的 alpha 外框裁切，保留四邊各 8 px 透明邊。Display 為 916 × 281，compact 為 256 × 86。

**Decisions:** 依校準圖的左右區域分別計算外框。沿用原像素與預定 CSS 寬度。匯出器略過位元組相同的檔案。

**Known gaps / follow-ups:** 停在 B1R 審閱。

## 2026-11-09 — Gate B2-1 素材校準

**Task:** 製作 Wordmark、八職業與 Mimiku 動作候選圖，交付校準審閱。  
**Scope:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/gate-b2-1/`。  
**What changed:** 建立 23 張候選 PNG、來源雜湊、審閱頁與驗證紀錄。  
**Decisions:** 新繪像素由內建 ImageGen 編修核准 master。Wordmark 只匯入眼睛區。Avatar 從核准像素取景、面積平均並吸附原色。新動作播放節奏列為校準提案。  
**Known gaps / follow-ups:** 等待 B2-1 審核，重點為新動作的本體一致性與共用基金的邊緣。正式匯出屬 B2-2。

## 2026-11-09 — Gate B2-1R 無手動作校準

**Task:** 依 B2-1R 修訂邀請、共用基金與導覽，維持 Mimiku 無手。  
**Scope:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/gate-b2-1/`。  
**What changed:** 重做 3 張 sheet，更新新舊逐格比對與 Home 預覽，新增非動作區、手套色塊及共用基金邊緣檢查。比對 20 張核准候選的 SHA-256。  
**Decisions:** 以核准 idle master 對位組圖，從 ImageGen 編修擷取眼睛與道具。邀請最後一格保留空白卡。共用基金逐格清理與透明區相連的淺色邊緣。  
**Known gaps / follow-ups:** 停在 B2-1R 候選審閱。正式匯出屬 B2-2。

## 2026-11-09 — Gate B2-1R2 道具可讀性

**Task:** 放大邀請卡及共用基金錢箱，讓小幣從嘴邊落入錢箱，加入 Home 尺寸驗收。  
**Scope:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/gate-b2-1/`。  
**What changed:** 重做邀請與共用基金各 5 格，保留上一版供並排。桌機卡片外框 40×33 px，錢箱高度比 38.2–40.4%，共用基金第 2→3 格重心位移 7.3 px。21 張核准候選以 decision log 雜湊核對。  
**Decisions:** Sprite 內等比例縮放角色留道具空間，Home 還原核准角色尺寸。兩格以原牙遮住小幣的一部分，回正格使用核准 happy 眼神。  
**Known gaps / follow-ups:** 停在 B2-1R2 候選審閱。

## 2026-11-09 — Approve Gate B2-1

**Task:** Record approval of the remaining B2-1 candidates.
**Scope:** decision-log; this append.
**What changed:** Invitation and pooled-funds R2 hashes approved; all 23 B2-1 candidates now approved.
**Known gaps / follow-ups:** B2-2 export and final QA.
