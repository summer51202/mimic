# PairFund Mobile Comment Actions And Contribution Create Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional comment input for confirmation approve/reject actions, then add a remote-ready contribution create flow for the Flutter mobile app.

**Architecture:** Keep both features aligned with the existing mobile structure. Confirmation actions should stay in the `tasks` feature and extend the current repository/service/screen path with an optional comment payload. Contribution create should mirror the existing expense/correction/create-fund flows: repository, controller, screen, route, repository tests, and widget tests, with `demo` and `remote` modes.

**Tech Stack:** Flutter, Riverpod, Dio-backed repositories, existing PairFund API client, flutter_test

---

## Scope

This plan covers:

* confirmation approve / reject optional comment dialog
* repository support for approve / reject comment payloads
* task action service updates
* tasks screen action flow updates
* contribution create repository
* contribution form controller
* contribution create screen
* route wiring and CTA updates
* repository tests and widget tests
* docs sync

This plan does **not** cover:

* batch confirmation actions
* contribution edit / delete / restore
* contribution list screen
* contribution detail screen
* contribution activity-row deep linking

## File Map

### Existing files to modify

* `mobile/lib/features/tasks/data/tasks_repository.dart`
* `mobile/lib/features/tasks/providers/tasks_provider.dart`
* `mobile/lib/features/tasks/presentation/tasks_screen.dart`
* `mobile/lib/app/router/app_routes.dart`
* `mobile/lib/app/router/app_router.dart`
* `mobile/lib/features/home/presentation/home_dashboard_screen.dart`
* `mobile/lib/features/funds/presentation/fund_detail_screen.dart`
* `docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md`
* `docs/design/pairfund-mobile-flutter-spec-v0.2.md`

### New files to create

* `mobile/lib/features/contributions/data/contribution_repository.dart`
* `mobile/lib/features/contributions/providers/contribution_form_controller.dart`
* `mobile/lib/features/contributions/presentation/create_contribution_screen.dart`
* `mobile/test/features/tasks/task_comment_action_test.dart`
* `mobile/test/features/contributions/contribution_repository_test.dart`
* `mobile/test/features/contributions/create_contribution_screen_test.dart`
* `mobile/test/features/contributions/contribution_form_controller_test.dart`

## Task 1: Add Optional Comment Support To Confirmation Actions

**Files:**
* Modify: `mobile/lib/features/tasks/data/tasks_repository.dart`
* Modify: `mobile/lib/features/tasks/providers/tasks_provider.dart`
* Modify: `mobile/lib/features/tasks/presentation/tasks_screen.dart`
* Create: `mobile/test/features/tasks/task_comment_action_test.dart`

- [ ] **Step 1: Write the failing widget test**

Add tests for:

* approve can submit with comment
* reject can submit with comment
* dialog closes and snackbar still appears

Example target behavior:

```dart
testWidgets('approve dialog submits optional comment', (tester) async {
  final repository = FakeTasksRepository();

  await tester.pumpWidget(...);
  await tester.pumpAndSettle();

  await tester.tap(find.text('Approve'));
  await tester.pumpAndSettle();

  await tester.enterText(find.byType(TextField), 'Looks correct');
  await tester.tap(find.text('Submit'));
  await tester.pumpAndSettle();

  expect(repository.lastApprovedComment, 'Looks correct');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/tasks/task_comment_action_test.dart
```

Expected:

* FAIL because actions currently have no dialog and no comment payload.

- [ ] **Step 3: Extend repository and service contracts**

Update interface:

```dart
Future<void> approveConfirmation(String confirmationId, {String? comment});
Future<void> rejectConfirmation(String confirmationId, {String? comment});
```

Remote payload:

```dart
await _apiClient.post(
  '/confirmations/$confirmationId/approve',
  data: <String, dynamic>{
    if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim(),
  },
);
```

And same idea for reject.

- [ ] **Step 4: Add lightweight comment dialog**

Use `showDialog` with:

* title: `Approve confirmation` or `Reject confirmation`
* one multiline text field
* `Cancel`
* `Submit`
* empty comment allowed

Keep UX minimal and MVP-friendly.

- [ ] **Step 5: Run tests**

Run:

```powershell
flutter test test/features/tasks/task_comment_action_test.dart
flutter test test/features/tasks/tasks_screen_test.dart
flutter test test/features/tasks/task_action_controller_test.dart
```

Expected:

* PASS

## Task 2: Add Contribution Repository And Form Controller

**Files:**
* Create: `mobile/lib/features/contributions/data/contribution_repository.dart`
* Create: `mobile/lib/features/contributions/providers/contribution_form_controller.dart`
* Create: `mobile/test/features/contributions/contribution_repository_test.dart`
* Create: `mobile/test/features/contributions/contribution_form_controller_test.dart`

- [ ] **Step 1: Write failing repository and controller tests**

Repository target behavior:

* demo mode returns success after delay
* remote mode posts to `POST /funds/{fundId}/contributions`

Controller target behavior:

* validates title-equivalent fields for contribution input
* validates positive amount
* supports note and occurred date
* returns to non-submitting state after failure

Suggested payload shape:

```dart
<String, dynamic>{
  'contributor_user_id': contributorUserId,
  'amount_minor': amountMinor,
  'contribution_type': contributionType,
  'occurred_on': occurredOn,
  if (note.trim().isNotEmpty) 'note': note.trim(),
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
flutter test test/features/contributions/contribution_repository_test.dart
flutter test test/features/contributions/contribution_form_controller_test.dart
```

Expected:

* FAIL because contribution feature files do not exist yet.

- [ ] **Step 3: Implement repository dual-mode support**

Add:

* `ContributionRepository`
* `DemoContributionRepository`
* `RemoteContributionRepository`
* `contributionRepositoryProvider`

Use first available session user as contributor fallback in demo/controller layer until member selection becomes richer.

- [ ] **Step 4: Implement form controller**

State should include:

* amount input
* note
* occurredOn
* contributionType
* isSubmitting
* errorMessage

Keep MVP narrow:

* default type = `one_time`
* one contributor only
* no recurring rule support here

- [ ] **Step 5: Run tests**

Run:

```powershell
flutter test test/features/contributions/contribution_repository_test.dart
flutter test test/features/contributions/contribution_form_controller_test.dart
```

Expected:

* PASS

## Task 3: Add Create Contribution Screen And Route

**Files:**
* Create: `mobile/lib/features/contributions/presentation/create_contribution_screen.dart`
* Modify: `mobile/lib/app/router/app_routes.dart`
* Modify: `mobile/lib/app/router/app_router.dart`
* Modify: `mobile/lib/features/home/presentation/home_dashboard_screen.dart`
* Modify: `mobile/lib/features/funds/presentation/fund_detail_screen.dart`
* Create: `mobile/test/features/contributions/create_contribution_screen_test.dart`

- [ ] **Step 1: Write failing widget test**

Target behavior:

* screen renders amount field, note field, date info, and `Save contribution`
* tapping save triggers controller

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/contributions/create_contribution_screen_test.dart
```

Expected:

* FAIL because contribution screen and route do not exist yet.

- [ ] **Step 3: Build MVP screen**

Screen sections:

1. intro card
2. amount input
3. type selector (`one_time`, `regular`)
4. note field
5. occurred-on helper text
6. sticky submit button

Behavior:

* success snackbar
* error banner / snackbar
* loading button state

- [ ] **Step 4: Wire route and CTA access**

Add route:

* `/funds/:fundId/contributions/new`

Update CTAs:

* home quick actions or fund detail should expose contribution creation
* keep route naming aligned with current app conventions

- [ ] **Step 5: Run tests**

Run:

```powershell
flutter test test/features/contributions/create_contribution_screen_test.dart
flutter test test/features/funds/fund_detail_screen_test.dart
flutter test test/app/app_smoke_test.dart
```

Expected:

* PASS

## Task 4: Sync Docs

**Files:**
* Modify: `docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md`
* Modify: `docs/design/pairfund-mobile-flutter-spec-v0.2.md`

- [ ] **Step 1: Update readiness checklist**

Change:

* contribution create flow from `Demo-only` to `Ready`
* note that confirmation actions now support optional comment payloads

- [ ] **Step 2: Update Flutter spec**

Add:

* tasks screen now uses optional comment dialog for confirmation actions
* contribution create screen is remote-backed for MVP create-only flow

- [ ] **Step 3: Run focused regression tests**

Run:

```powershell
flutter test test/features/tasks/task_comment_action_test.dart
flutter test test/features/contributions/contribution_repository_test.dart
flutter test test/features/contributions/contribution_form_controller_test.dart
flutter test test/features/contributions/create_contribution_screen_test.dart
```

Expected:

* PASS

## Self-Review

### Coverage

Covered:

* confirmation comment payload support
* contribution create flow
* route wiring
* repository and widget tests
* docs sync

Not covered intentionally:

* contribution list/detail
* contribution edit/delete
* recurring rules
* rich member selection for contributor
* batch confirmation review

### Consistency

This plan follows the same app patterns already used for:

* expense create
* correction create
* create fund
* task actions

### Scope

This remains a reasonable next increment after activity. It adds one UX refinement and one new create-only bookkeeping flow without expanding into maintenance flows.
