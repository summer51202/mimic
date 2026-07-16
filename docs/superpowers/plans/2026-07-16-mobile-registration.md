# Mobile Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create an account from the existing authentication screen, persist the returned session, and enter the authenticated app.

**Architecture:** Extend the existing auth repository/controller pipeline with registration while reusing `AuthSessionPayload` and shared session persistence. Keep login-versus-registration mode local to `LoginScreen` and reuse the existing `/login` route.

**Tech Stack:** Flutter, Riverpod, Dio API abstraction, GoRouter, flutter_test

---

### Task 1: Add registration to the auth repository

**Files:**
- Modify: `mobile/lib/features/auth/data/auth_repository.dart`
- Modify: `mobile/test/features/auth/auth_repository_test.dart`

- [ ] **Step 1: Write a failing repository test**

Record the fake client's last POST path and data, call `register(displayName: 'Taylor', email: 'taylor@example.com', password: 'secret1')`, and expect `/auth/register`, the exact snake_case payload, and mapped access/refresh/user values.

- [ ] **Step 2: Run the repository test and verify RED**

```powershell
flutter test test/features/auth/auth_repository_test.dart
```

Expected: compilation fails because `AuthRepository.register` and `RemoteAuthRepository.register` do not exist.

- [ ] **Step 3: Implement repository registration**

Add this interface method and equivalent demo/remote implementations:

```dart
Future<AuthSessionPayload> register({
  required String displayName,
  required String email,
  required String password,
});
```

The remote implementation posts `display_name`, `email`, and `password` to `/auth/register`, then uses `AuthLoginDto` and `mapAuthSessionPayload`.

- [ ] **Step 4: Run the repository test and verify GREEN**

Expected: all repository tests pass.

### Task 2: Add registration to the auth controller

**Files:**
- Modify: `mobile/lib/features/auth/providers/auth_controller.dart`
- Modify: `mobile/test/features/auth/auth_controller_test.dart`

- [ ] **Step 1: Write failing controller tests**

Extend `FakeAuthRepository` with register argument capture. Verify successful registration updates `sessionProvider` and `SessionPersistence`; verify a throwing repository returns false and sets `Unable to create your account right now.`

- [ ] **Step 2: Run the controller test and verify RED**

```powershell
flutter test test/features/auth/auth_controller_test.dart
```

Expected: compilation fails because `AuthController.register` is missing.

- [ ] **Step 3: Implement controller registration**

Add `register` with display name/email/password parameters. Factor login's successful session update into `_persistSession(AuthSessionPayload payload)` and call it from both login and register. Keep their failure messages distinct.

- [ ] **Step 4: Run controller and repository tests and verify GREEN**

```powershell
flutter test test/features/auth/auth_controller_test.dart test/features/auth/auth_repository_test.dart
```

Expected: all auth data/controller tests pass.

### Task 3: Add registration mode to the authentication screen

**Files:**
- Modify: `mobile/lib/features/auth/presentation/login_screen.dart`
- Modify: `mobile/lib/features/auth/presentation/widgets/login_form.dart`
- Modify: `mobile/test/features/auth/login_screen_test.dart`

- [ ] **Step 1: Write failing widget tests**

Verify `Create account` switches modes and reveals `Display name`; verify `Already have an account? Sign in` restores login mode; submit registration through a fake repository and verify display name/email/password values plus authenticated navigation.

- [ ] **Step 2: Run the widget test and verify RED**

```powershell
flutter test test/features/auth/login_screen_test.dart
```

Expected: FAIL because the Create account mode control is absent.

- [ ] **Step 3: Implement the minimal registration UI**

Add `_isRegistering`, a display-name controller, a mode-aware submit handler, mode-aware heading/copy/button labels, and a disabled mode switch during submission. `LoginForm` receives optional display-name controls and explicit submit label/loading label.

- [ ] **Step 4: Run focused and full verification**

```powershell
flutter test test/features/auth
flutter test
flutter build web --no-wasm-dry-run --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

Expected: all tests pass and `build/web` succeeds.

- [ ] **Step 5: Update runtime and records**

Restart the static server against the new `build/web`, append `.agents/devlog.md`, confirm `/auth/register` through the browser flow, and commit the implementation and records.
