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
