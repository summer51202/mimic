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
