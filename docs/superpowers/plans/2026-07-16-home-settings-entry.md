# Home Settings Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Settings screen and Sign out action reachable from the authenticated home screen.

**Architecture:** Add one presentation-only navigation control to `HomeDashboardScreen`. Reuse `AppRoutes.settings` and the existing router/settings implementation so authentication behavior remains centralized.

**Tech Stack:** Flutter, Riverpod, GoRouter, flutter_test

---

### Task 1: Add and verify the home Settings entry

**Files:**
- Modify: `mobile/lib/features/home/presentation/home_dashboard_screen.dart`
- Modify: `mobile/test/features/home/home_dashboard_screen_test.dart`

- [ ] **Step 1: Write the failing navigation test**

Add a widget test that provides a loaded home summary, defines `/` and `/settings` GoRouter routes, taps the button found by `find.byTooltip('Settings')`, and expects `find.text('Settings destination')`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
flutter test test/features/home/home_dashboard_screen_test.dart
```

Expected: FAIL because no widget has the `Settings` tooltip.

- [ ] **Step 3: Add the minimal Settings control**

Replace the standalone `PairFund` heading with a row containing the existing heading and:

```dart
IconButton(
  tooltip: 'Settings',
  onPressed: () => context.push(AppRoutes.settings),
  icon: const Icon(Icons.settings_outlined),
)
```

- [ ] **Step 4: Run focused and related tests**

Run:

```powershell
flutter test test/features/home/home_dashboard_screen_test.dart test/features/settings/settings_screen_test.dart test/app/app_smoke_test.dart
```

Expected: all tests pass with no layout overflow.

- [ ] **Step 5: Verify runtime and commit**

Confirm `http://localhost:8080` returns HTTP 200, refresh the running Flutter Web app, and commit:

```powershell
git add mobile/lib/features/home/presentation/home_dashboard_screen.dart mobile/test/features/home/home_dashboard_screen_test.dart
git commit -m "fix(mobile): expose settings from home"
```
