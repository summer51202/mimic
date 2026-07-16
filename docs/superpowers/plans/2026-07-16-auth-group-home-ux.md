# Auth, Group-Aware Home, and Group Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver actionable authentication UX, an explicit multi-group Home context, and basic secure group viewing and management.

**Architecture:** Ship three vertical batches. Batch 1 stays inside mobile auth. Batch 2 introduces a persisted selected-group provider and makes Home data explicitly group-scoped. Batch 3 adds backend group detail/rename authorization and a mobile Group detail feature. Every batch ends with a browser acceptance checkpoint.

**Tech Stack:** Flutter, Riverpod, GoRouter, flutter_secure_storage, NestJS, Prisma, Jest, Supertest

---

## Batch 1: Authentication UX

### Task 1: Preserve useful API error semantics in auth

**Files:**
- Modify: `mobile/lib/features/auth/providers/auth_controller.dart`
- Modify: `mobile/test/features/auth/auth_controller_test.dart`

- [ ] **Step 1: Write failing controller tests**

Add tests where the repository throws `ApiException` for duplicate email, invalid credentials, and network failure. Expect stable user messages:

```dart
'This email already has an account. Sign in instead.'
'Email or password is incorrect.'
"We couldn't connect. Please try again."
```

- [ ] **Step 2: Run RED**

```powershell
cd mobile
flutter test test/features/auth/auth_controller_test.dart
```

Expected: tests fail because the controller currently collapses errors into generic messages.

- [ ] **Step 3: Implement explicit exception-to-copy mapping**

Catch `ApiException`, map only known auth/domain codes, and use the connectivity fallback for unknown server/network failures. Never pass `exception.message` directly to state.

- [ ] **Step 4: Run GREEN and commit**

```powershell
flutter test test/features/auth/auth_controller_test.dart
git add mobile/lib/features/auth/providers/auth_controller.dart mobile/test/features/auth/auth_controller_test.dart
git commit -m "fix(mobile): show actionable auth errors"
```

### Task 2: Add local field validation, placeholders, and Demo fill

**Files:**
- Modify: `mobile/lib/features/auth/presentation/login_screen.dart`
- Modify: `mobile/lib/features/auth/presentation/widgets/login_form.dart`
- Modify: `mobile/test/features/auth/login_screen_test.dart`

- [ ] **Step 1: Write failing widget tests**

Cover:

- Email and password controllers start empty.
- Placeholders are `you@example.com` and `At least 6 characters`.
- Typing hides the placeholder naturally.
- `Use demo account` fills `demo@pairfund.local` and `password` only when tapped.
- Registration rejects blank display name, malformed email, and passwords shorter than six characters with field-local messages.
- Editing a field or switching modes clears stale local/remote errors.

- [ ] **Step 2: Run RED**

```powershell
flutter test test/features/auth/login_screen_test.dart
```

Expected: failures for prefilled values, missing Demo action, and missing field validation.

- [ ] **Step 3: Implement form state**

Use local error fields for display name, email, and password. Validate before calling `AuthController`. Pass `errorText` into each `InputDecoration`, use hints only, add `Use demo account`, and clear relevant errors from `onChanged`.

- [ ] **Step 4: Verify Batch 1**

```powershell
flutter test test/features/auth
flutter test
flutter build web --no-wasm-dry-run --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

Expected: all tests and Web build pass.

- [ ] **Step 5: User checkpoint**

Publish the new `build/web`. User verifies placeholders, Demo fill, password guidance, duplicate-email copy, registration, and login.

## Batch 2: Group-Aware Home

### Task 3: Add persisted selected-group state

**Files:**
- Create: `mobile/lib/features/groups/providers/selected_group_provider.dart`
- Create: `mobile/lib/features/groups/data/selected_group_persistence.dart`
- Create: `mobile/test/features/groups/selected_group_provider_test.dart`
- Modify: `mobile/lib/shared/storage/secure_storage_provider.dart` only if a shared storage abstraction is required

- [ ] **Step 1: Write failing state tests**

Test initial restore, explicit selection, persistence, stored-ID fallback, and clearing when no groups remain. The provider API must expose:

```dart
Future<void> reconcile(List<GroupSummary> groups);
Future<void> select(String groupId);
```

- [ ] **Step 2: Run RED**

```powershell
flutter test test/features/groups/selected_group_provider_test.dart
```

- [ ] **Step 3: Implement selected-group persistence**

Store the ID under `pairfund.selected_group_id`. `reconcile` retains a valid stored/current ID, otherwise selects the first active group, and clears when the list is empty.

- [ ] **Step 4: Run GREEN and commit**

```powershell
flutter test test/features/groups/selected_group_provider_test.dart
git add mobile/lib/features/groups mobile/test/features/groups
git commit -m "feat(mobile): persist selected group"
```

### Task 4: Make Home repository explicitly group-scoped

**Files:**
- Modify: `mobile/lib/features/home/data/home_repository.dart`
- Modify: `mobile/lib/features/home/data/remote/home_remote_mapper.dart`
- Modify: `mobile/lib/features/home/providers/home_summary_provider.dart`
- Modify: `mobile/test/features/home/home_repository_test.dart`

- [ ] **Step 1: Write failing repository/provider tests**

Require group list items to include ID/name/type plus member count and role when available. Change summary loading to accept `selectedGroupId`; assert funds requests use exactly that ID and never `groups.first` implicitly.

- [ ] **Step 2: Run RED**

```powershell
flutter test test/features/home/home_repository_test.dart
```

- [ ] **Step 3: Implement selected-group data flow**

Split group-list loading from selected-group summary loading. Reconcile selection after group-list fetch. Return an explicit no-group model when the list is empty.

- [ ] **Step 4: Run GREEN**

```powershell
flutter test test/features/home/home_repository_test.dart
```

### Task 5: Build hybrid Home and no-group onboarding

**Files:**
- Create: `mobile/lib/features/home/presentation/widgets/current_group_card.dart`
- Create: `mobile/lib/features/home/presentation/widgets/group_selector_sheet.dart`
- Modify: `mobile/lib/features/home/presentation/home_dashboard_screen.dart`
- Modify: `mobile/test/features/home/home_dashboard_screen_test.dart`
- Modify: `mobile/lib/app/router/app_routes.dart`

- [ ] **Step 1: Write failing widget tests**

Cover Current group name/role/members, selector options, changing groups, View group, Invite, Create group, Join with code, no-group onboarding, loading/error/retry, and 360px width without overflow.

- [ ] **Step 2: Run RED**

```powershell
flutter test test/features/home/home_dashboard_screen_test.dart
```

- [ ] **Step 3: Implement the approved hybrid layout**

Render the financial dashboard only when a selected group exists. Group actions must use the selected ID. The no-group state contains only explanatory copy and Create/Join actions.

- [ ] **Step 4: Verify Batch 2**

```powershell
flutter test test/features/groups test/features/home test/app/app_smoke_test.dart
flutter test
flutter build web --no-wasm-dry-run --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

- [ ] **Step 5: User checkpoint**

User verifies switching among at least two groups, refresh persistence, invalid stored-group fallback, View group/Invite paths, and no-group onboarding with a fresh account.

## Batch 3: Secure Group Detail and Basic Management

### Task 6: Add backend membership authorization and group detail

**Files:**
- Modify: `backend/src/modules/groups/groups.service.ts`
- Modify: `backend/src/modules/groups/groups.controller.ts`
- Create: `backend/src/modules/groups/dto/update-group.dto.ts`
- Modify: `backend/src/modules/groups/groups.service.spec.ts`
- Create: `backend/test/groups.e2e-spec.ts`

- [ ] **Step 1: Write failing service/e2e tests**

Cover active member detail access, non-member denial, Owner rename, Member rename denial, archived group denial, and members-list authorization. Expected stable domain codes include `GROUP_NOT_FOUND`, `GROUP_ACCESS_DENIED`, and `OWNER_REQUIRED`.

- [ ] **Step 2: Run RED**

```powershell
cd backend
npm run test -- --runInBand groups.service.spec.ts
npm run test:e2e -- --runInBand groups.e2e-spec.ts
```

- [ ] **Step 3: Implement backend contracts**

Add authenticated `GET /groups/:groupId` and `PATCH /groups/:groupId`. Service methods must receive `userId`, verify active membership, and enforce Owner for rename/invite. Update members listing to receive and authorize the requester.

- [ ] **Step 4: Run GREEN and backend verification**

```powershell
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

### Task 7: Add mobile Group repository and controller

**Files:**
- Create: `mobile/lib/features/groups/data/group_repository.dart`
- Create: `mobile/lib/features/groups/providers/group_detail_controller.dart`
- Create: `mobile/test/features/groups/group_repository_test.dart`
- Create: `mobile/test/features/groups/group_detail_controller_test.dart`

- [ ] **Step 1: Write failing data/controller tests**

Cover exact GET/PATCH/member/fund paths, snake_case mapping, loading, rename success, provider invalidation, role handling, and friendly error/retry state.

- [ ] **Step 2: Run RED, implement, then run GREEN**

```powershell
flutter test test/features/groups/group_repository_test.dart test/features/groups/group_detail_controller_test.dart
```

### Task 8: Add Group detail UI and production routing

**Files:**
- Create: `mobile/lib/features/groups/presentation/group_detail_screen.dart`
- Create: `mobile/test/features/groups/group_detail_screen_test.dart`
- Modify: `mobile/lib/app/router/app_routes.dart`
- Modify: `mobile/lib/app/router/app_router.dart`
- Modify: `mobile/test/app/app_smoke_test.dart`

- [ ] **Step 1: Write failing screen/router tests**

Cover group identity, role, members, funds, Owner rename/invite controls, Member-hidden controls, retry, named route group-ID propagation, and narrow layout.

- [ ] **Step 2: Run RED, implement, then run GREEN**

```powershell
flutter test test/features/groups/group_detail_screen_test.dart test/app/app_smoke_test.dart
```

### Task 9: Final records, runtime smoke, and acceptance

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`
- Modify: `backend/README.md`

- [ ] **Step 1: Run complete verification**

```powershell
cd backend
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build

cd ../mobile
flutter test
flutter build web --no-wasm-dry-run --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

- [ ] **Step 2: Run multi-group API and browser smoke**

Use an Owner in two groups plus one Member account. Verify group switching, persisted selection, detail, members, Owner rename, Member denial, invite creation/acceptance, refresh persistence, and friendly auth errors.

- [ ] **Step 3: Update records and commit**

Mark group-aware Home/detail atoms accurately, append factual devlog evidence, document WSL keep-alive/container restart/static Web commands, and commit records only after user acceptance.
