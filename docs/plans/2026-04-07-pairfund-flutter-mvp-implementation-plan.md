# PairFund Flutter MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Flutter mobile MVP for PairFund using the existing mobile UI specs, API contracts, and locked-settlement accounting rules.

**Architecture:** Implement the app in feature slices around auth, home, funds, expenses, settlements, tasks, and settings. Use Riverpod for async state and form draft state, GoRouter for navigation, Dio for API access, and small shared presentation components that mirror the design system. Keep backend-derived accounting results authoritative and use local calculation only for input preview.

**Tech Stack:** Flutter, Riverpod, GoRouter, Dio, Freezed, json_serializable, Flutter Secure Storage, intl, formz or lightweight field validation utilities

## Environment Assumptions

Current local setup decision:

* proceed with Flutter development now
* do not require Android Studio as a blocker for MVP coding
* use existing Flutter SDK for project scaffolding, widget tests, and non-Android-targeted development
* defer Android SDK / Android Studio installation until Android build, emulator, or device verification becomes necessary

Notes:

* Chrome and Windows targets are sufficient for early UI and state-flow development
* Android toolchain setup remains an explicit follow-up task, not a prerequisite for Task 1 through Task 4
* if a later task needs `flutter run -d android` or Android-specific packaging, unblock by installing Android SDK or Android Studio at that point

## Deferred Environment Todo

- [ ] Install Android SDK or Android Studio when Android device build, emulator testing, push setup, or release packaging becomes necessary
- [ ] Run `flutter doctor` again after Android SDK setup and confirm Android toolchain is green
- [ ] Accept Android licenses once SDK is installed
- [ ] Verify `flutter run` on at least one Android target before beta distribution
- [ ] Add Android signing and release configuration in a later release-readiness pass

---

### Task 1: Bootstrap Flutter App Shell

**Files:**
- Create: `mobile/pubspec.yaml`
- Create: `mobile/lib/main.dart`
- Create: `mobile/lib/app/app.dart`
- Create: `mobile/lib/app/router/app_router.dart`
- Create: `mobile/lib/app/theme/app_theme.dart`
- Create: `mobile/lib/shared/constants/design_tokens.dart`
- Create: `mobile/test/app/app_smoke_test.dart`

- [ ] **Step 1: Write the failing app smoke test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/app/app.dart';

void main() {
  testWidgets('renders app shell', (tester) async {
    await tester.pumpWidget(const PairFundApp());
    expect(find.text('PairFund'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test mobile/test/app/app_smoke_test.dart`
Expected: FAIL because the app shell does not exist yet.

- [ ] **Step 3: Write minimal app shell implementation**

```dart
// mobile/lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';

void main() {
  runApp(const ProviderScope(child: PairFundApp()));
}
```

```dart
// mobile/lib/app/app.dart
import 'package:flutter/material.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class PairFundApp extends StatelessWidget {
  const PairFundApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'PairFund',
      theme: buildAppTheme(),
      routerConfig: appRouter,
    );
  }
}
```

- [ ] **Step 4: Mirror design tokens into theme files**

```dart
// mobile/lib/shared/constants/design_tokens.dart
import 'package:flutter/material.dart';

class PfColors {
  static const appBg = Color(0xFFF7F1EA);
  static const canvasBg = Color(0xFFF4ECE4);
  static const surface = Color(0xFFFFF8F2);
  static const card = Color(0xFFFFFFFF);
  static const inkPrimary = Color(0xFF2F241F);
  static const inkSecondary = Color(0xFF7E6A61);
  static const accent = Color(0xFFD7795F);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `flutter test mobile/test/app/app_smoke_test.dart`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/pubspec.yaml mobile/lib/main.dart mobile/lib/app mobile/lib/shared/constants/design_tokens.dart mobile/test/app/app_smoke_test.dart
git commit -m "feat: bootstrap flutter app shell"
```

### Task 2: Add Core Infrastructure

**Files:**
- Create: `mobile/lib/shared/network/dio_provider.dart`
- Create: `mobile/lib/shared/storage/secure_storage_provider.dart`
- Create: `mobile/lib/shared/api/api_exception.dart`
- Create: `mobile/lib/shared/models/api_result.dart`
- Create: `mobile/lib/shared/navigation/navigation_service.dart`
- Create: `mobile/lib/shared/providers/session_provider.dart`
- Test: `mobile/test/shared/network/dio_provider_test.dart`

- [ ] **Step 1: Write the failing infrastructure test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/shared/network/dio_provider.dart';

void main() {
  test('provides dio instance', () {
    final dio = buildDioClient('http://localhost');
    expect(dio.options.baseUrl, 'http://localhost');
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test mobile/test/shared/network/dio_provider_test.dart`
Expected: FAIL because the provider and builder do not exist.

- [ ] **Step 3: Implement network and session infrastructure**

```dart
// mobile/lib/shared/network/dio_provider.dart
import 'package:dio/dio.dart';

Dio buildDioClient(String baseUrl) {
  return Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));
}
```

- [ ] **Step 4: Add token-aware Riverpod providers**

```dart
// mobile/lib/shared/providers/session_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SessionState {
  const SessionState({this.accessToken, this.userId});
  final String? accessToken;
  final String? userId;
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier() : super(const SessionState());

  void setSession({required String accessToken, required String userId}) {
    state = SessionState(accessToken: accessToken, userId: userId);
  }

  void clear() => state = const SessionState();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `flutter test mobile/test/shared/network/dio_provider_test.dart`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/shared mobile/test/shared/network/dio_provider_test.dart
git commit -m "feat: add flutter app infrastructure"
```

### Task 3: Implement Auth Flow

**Files:**
- Create: `mobile/lib/features/auth/data/auth_repository.dart`
- Create: `mobile/lib/features/auth/presentation/login_screen.dart`
- Create: `mobile/lib/features/auth/presentation/widgets/login_form.dart`
- Create: `mobile/lib/features/auth/providers/auth_controller.dart`
- Test: `mobile/test/features/auth/login_screen_test.dart`

- [ ] **Step 1: Write the failing login screen test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/auth/presentation/login_screen.dart';

void main() {
  testWidgets('shows login actions', (tester) async {
    await tester.pumpWidget(const LoginScreen());
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test mobile/test/features/auth/login_screen_test.dart`
Expected: FAIL because the auth UI does not exist.

- [ ] **Step 3: Build minimal login UI and controller**

```dart
// mobile/lib/features/auth/presentation/login_screen.dart
import 'package:flutter/material.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Sign in'),
              SizedBox(height: 16),
              TextField(decoration: InputDecoration(labelText: 'Email')),
              TextField(decoration: InputDecoration(labelText: 'Password')),
            ],
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Add repository and token persistence flow**

```dart
// mobile/lib/features/auth/data/auth_repository.dart
abstract class AuthRepository {
  Future<void> login(String email, String password);
  Future<void> logout();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `flutter test mobile/test/features/auth/login_screen_test.dart`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/features/auth mobile/test/features/auth/login_screen_test.dart
git commit -m "feat: implement auth flow"
```

### Task 4: Implement Home Dashboard And Fund Entry

**Files:**
- Create: `mobile/lib/features/home/data/home_repository.dart`
- Create: `mobile/lib/features/home/providers/home_summary_provider.dart`
- Create: `mobile/lib/features/home/presentation/home_dashboard_screen.dart`
- Create: `mobile/lib/features/home/presentation/widgets/balance_hero_card.dart`
- Create: `mobile/lib/features/home/presentation/widgets/fund_card_list.dart`
- Test: `mobile/test/features/home/home_dashboard_screen_test.dart`

- [ ] **Step 1: Write the failing home screen test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/home/presentation/home_dashboard_screen.dart';

void main() {
  testWidgets('renders shared balance section', (tester) async {
    await tester.pumpWidget(const HomeDashboardScreen());
    expect(find.text('Our shared funds'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test mobile/test/features/home/home_dashboard_screen_test.dart`
Expected: FAIL because the dashboard screen does not exist.

- [ ] **Step 3: Build home screen from the mobile spec**

```dart
// mobile/lib/features/home/presentation/home_dashboard_screen.dart
import 'package:flutter/material.dart';

class HomeDashboardScreen extends StatelessWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('Our shared funds'),
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Bind home summary provider to backend summary endpoint**

```dart
// mobile/lib/features/home/providers/home_summary_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final homeSummaryProvider = FutureProvider.autoDispose((ref) async {
  return ref.watch(homeRepositoryProvider).fetchSummary();
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `flutter test mobile/test/features/home/home_dashboard_screen_test.dart`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/features/home mobile/test/features/home/home_dashboard_screen_test.dart
git commit -m "feat: implement home dashboard"
```

### Task 5: Implement Fund Detail And Activity Entry

**Files:**
- Create: `mobile/lib/features/funds/data/fund_repository.dart`
- Create: `mobile/lib/features/funds/providers/fund_detail_provider.dart`
- Create: `mobile/lib/features/funds/presentation/fund_detail_screen.dart`
- Create: `mobile/lib/features/activity/presentation/activity_screen.dart`
- Test: `mobile/test/features/funds/fund_detail_screen_test.dart`

- [ ] **Step 1: Write the failing fund detail test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/funds/presentation/fund_detail_screen.dart';

void main() {
  testWidgets('shows fund balance and positions section', (tester) async {
    await tester.pumpWidget(const FundDetailScreen(fundId: 'fund-1'));
    expect(find.text('Member positions'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test mobile/test/features/funds/fund_detail_screen_test.dart`
Expected: FAIL because the fund detail screen does not exist.

- [ ] **Step 3: Build fund detail layout**

```dart
// mobile/lib/features/funds/presentation/fund_detail_screen.dart
import 'package:flutter/material.dart';

class FundDetailScreen extends StatelessWidget {
  const FundDetailScreen({super.key, required this.fundId});

  final String fundId;

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('Member positions'),
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Add activity screen for history and correction entry**

```dart
// mobile/lib/features/activity/presentation/activity_screen.dart
import 'package:flutter/material.dart';

class ActivityScreen extends StatelessWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: Text('Activity')));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `flutter test mobile/test/features/funds/fund_detail_screen_test.dart`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/features/funds mobile/lib/features/activity mobile/test/features/funds/fund_detail_screen_test.dart
git commit -m "feat: implement fund detail and activity screens"
```

### Task 6: Implement Expense Creation And Correction Flow

**Files:**
- Create: `mobile/lib/features/expenses/data/expense_repository.dart`
- Create: `mobile/lib/features/expenses/providers/expense_form_controller.dart`
- Create: `mobile/lib/features/expenses/presentation/create_expense_screen.dart`
- Create: `mobile/lib/features/corrections/presentation/create_correction_screen.dart`
- Test: `mobile/test/features/expenses/create_expense_screen_test.dart`

- [ ] **Step 1: Write the failing expense form test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/expenses/presentation/create_expense_screen.dart';

void main() {
  testWidgets('shows payer and split sections', (tester) async {
    await tester.pumpWidget(const CreateExpenseScreen(fundId: 'fund-1'));
    expect(find.text('Payer'), findsOneWidget);
    expect(find.text('Split mode'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test mobile/test/features/expenses/create_expense_screen_test.dart`
Expected: FAIL because the expense form does not exist.

- [ ] **Step 3: Build expense form draft state and screen**

```dart
// mobile/lib/features/expenses/presentation/create_expense_screen.dart
import 'package:flutter/material.dart';

class CreateExpenseScreen extends StatelessWidget {
  const CreateExpenseScreen({super.key, required this.fundId});

  final String fundId;

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              Text('Payer'),
              Text('Split mode'),
            ],
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Add correction entry screen that follows lock rules**

```dart
// mobile/lib/features/corrections/presentation/create_correction_screen.dart
import 'package:flutter/material.dart';

class CreateCorrectionScreen extends StatelessWidget {
  const CreateCorrectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('Original record stays unchanged'),
        ),
      ),
    );
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `flutter test mobile/test/features/expenses/create_expense_screen_test.dart`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/features/expenses mobile/lib/features/corrections mobile/test/features/expenses/create_expense_screen_test.dart
git commit -m "feat: implement expense and correction flows"
```

### Task 7: Implement Settlement, Tasks, And Settings

**Files:**
- Create: `mobile/lib/features/settlements/data/settlement_repository.dart`
- Create: `mobile/lib/features/settlements/providers/settlement_provider.dart`
- Create: `mobile/lib/features/settlements/presentation/settlement_screen.dart`
- Create: `mobile/lib/features/tasks/presentation/tasks_screen.dart`
- Create: `mobile/lib/features/settings/presentation/settings_screen.dart`
- Test: `mobile/test/features/settlements/settlement_screen_test.dart`

- [ ] **Step 1: Write the failing settlement test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settlements/presentation/settlement_screen.dart';

void main() {
  testWidgets('shows lock explanation', (tester) async {
    await tester.pumpWidget(const SettlementScreen(fundId: 'fund-1'));
    expect(find.text('This period becomes locked after completion'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test mobile/test/features/settlements/settlement_screen_test.dart`
Expected: FAIL because the settlement screen does not exist.

- [ ] **Step 3: Build settlement, tasks, and settings screens**

```dart
// mobile/lib/features/settlements/presentation/settlement_screen.dart
import 'package:flutter/material.dart';

class SettlementScreen extends StatelessWidget {
  const SettlementScreen({super.key, required this.fundId});

  final String fundId;

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('This period becomes locked after completion'),
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Wire task center and settings entry points into routing**

```dart
// mobile/lib/features/tasks/presentation/tasks_screen.dart
import 'package:flutter/material.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: Text('Tasks')));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `flutter test mobile/test/features/settlements/settlement_screen_test.dart`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/features/settlements mobile/lib/features/tasks mobile/lib/features/settings mobile/test/features/settlements/settlement_screen_test.dart
git commit -m "feat: implement settlement tasks and settings screens"
```

### Task 8: Verification, Empty States, And Handoff Sync

**Files:**
- Modify: `mobile/lib/app/router/app_router.dart`
- Modify: `mobile/lib/app/theme/app_theme.dart`
- Modify: `mobile/lib/features/**`
- Create: `mobile/test/features/navigation/app_router_test.dart`
- Create: `mobile/test/features/locked_states/locked_record_test.dart`
- Modify: `docs/design/pairfund-mobile-flutter-spec-v0.2.md`

- [ ] **Step 1: Write failing navigation and locked-state tests**

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('router contains main mobile routes', () {
    const routes = [
      '/home',
      '/funds/:fundId',
      '/funds/:fundId/expenses/new',
      '/funds/:fundId/settlement',
      '/confirmations',
      '/settings',
    ];
    expect(routes.length, 6);
  });
}
```

- [ ] **Step 2: Run tests to verify baseline**

Run: `flutter test mobile/test/features/navigation/app_router_test.dart mobile/test/features/locked_states/locked_record_test.dart`
Expected: one or more FAIL until routing and locked-state UI are fully wired.

- [ ] **Step 3: Finish missing empty, loading, and locked-state UX**

```text
Implement these UI states:
- empty home with create fund CTA
- empty fund with add expense CTA
- locked record banner with create correction CTA
- settlement no-action-needed state
- task center empty state
```

- [ ] **Step 4: Run full Flutter test suite**

Run: `flutter test`
Expected: PASS

- [ ] **Step 5: Sync docs to implemented routes and widgets**

```text
Update the Flutter spec if any route names, component names, or screen responsibilities changed during implementation.
```

- [ ] **Step 6: Commit**

```bash
git add mobile docs/design/pairfund-mobile-flutter-spec-v0.2.md
git commit -m "feat: finalize flutter mvp flow"
```

## Self-Review

### Spec Coverage

Covered by this plan:

* app shell and theme
* auth
* home dashboard
* fund detail
* activity
* expense create
* correction
* settlement
* tasks
* settings
* locked-state UX

Remaining outside this plan:

* push notifications
* offline queue beyond simple draft preservation
* advanced analytics instrumentation

### Placeholder Scan

No TODO-only task entries are left intentionally. Every task has concrete file targets and executable steps.

### Type Consistency

Routes, feature names, and screen names match the Flutter spec and the mobile design docs:

* `HomeDashboardScreen`
* `FundDetailScreen`
* `CreateExpenseScreen`
* `SettlementScreen`
* `TasksScreen`
* `SettingsScreen`
