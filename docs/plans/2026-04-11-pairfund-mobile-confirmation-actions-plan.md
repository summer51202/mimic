# PairFund Mobile Confirmation Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approve and reject actions for confirmation items in the mobile task center so users can process pending confirmations instead of only reading them.

**Architecture:** Extend the existing `TasksRepository` and `TasksScreen` flow instead of creating a new confirmation module. Keep the MVP scope narrow: action buttons on task cards, repository methods for approve/reject, optimistic refresh by invalidating the existing `tasksProvider`, and no comment dialog yet.

**Tech Stack:** Flutter, Riverpod, Dio-backed repositories, existing PairFund API client, flutter_test

---

## Scope

This plan only covers:

* approve confirmation
* reject confirmation
* task center UI updates
* repository contract tests
* widget tests for action wiring

This plan does **not** cover:

* comment entry UI
* batch approve / reject
* non-confirmation task types
* optimistic local mutation without refresh

## File Map

### Existing files to modify

* `mobile/lib/features/tasks/data/tasks_repository.dart`
  * add approve / reject repository methods
  * keep task fetch logic in the same module
* `mobile/lib/features/tasks/providers/tasks_provider.dart`
  * add refresh-friendly invalidation helper or notifier pattern
* `mobile/lib/features/tasks/presentation/tasks_screen.dart`
  * render action buttons for pending items
  * call approve / reject actions
  * refresh list after action completes
* `mobile/test/features/tasks/tasks_repository_test.dart`
  * extend with approve / reject contract coverage
* `mobile/test/features/tasks/tasks_screen_test.dart`
  * extend with approve / reject interaction coverage

### New files to create

* `mobile/test/features/tasks/task_action_controller_test.dart`
  * if we introduce a controller / notifier for actions

## Task 1: Add Repository Contract For Approve / Reject

**Files:**
* Modify: `mobile/lib/features/tasks/data/tasks_repository.dart`
* Modify: `mobile/test/features/tasks/tasks_repository_test.dart`

- [ ] **Step 1: Write the failing approve / reject repository tests**

```dart
test('remote tasks repository approves confirmation', () async {
  final apiClient = RecordingApiClient(
    <String, Map<String, dynamic>>{
      '/confirmations/confirmation-1/approve': <String, dynamic>{
        'data': <String, dynamic>{'id': 'confirmation-1', 'status': 'approved'},
      },
    },
  );
  final repository = RemoteTasksRepository(apiClient);

  await repository.approveConfirmation('confirmation-1');

  expect(apiClient.lastPostPath, '/confirmations/confirmation-1/approve');
});

test('remote tasks repository rejects confirmation', () async {
  final apiClient = RecordingApiClient(
    <String, Map<String, dynamic>>{
      '/confirmations/confirmation-1/reject': <String, dynamic>{
        'data': <String, dynamic>{'id': 'confirmation-1', 'status': 'rejected'},
      },
    },
  );
  final repository = RemoteTasksRepository(apiClient);

  await repository.rejectConfirmation('confirmation-1');

  expect(apiClient.lastPostPath, '/confirmations/confirmation-1/reject');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/tasks/tasks_repository_test.dart
```

Expected:

* FAIL because `approveConfirmation` and `rejectConfirmation` do not exist yet.

- [ ] **Step 3: Add minimal repository interface and remote implementation**

```dart
abstract class TasksRepository {
  Future<TaskSummary> fetchTasks();
  Future<void> approveConfirmation(String confirmationId);
  Future<void> rejectConfirmation(String confirmationId);
}
```

```dart
class RemoteTasksRepository implements TasksRepository {
  @override
  Future<void> approveConfirmation(String confirmationId) async {
    await _apiClient.post('/confirmations/$confirmationId/approve');
  }

  @override
  Future<void> rejectConfirmation(String confirmationId) async {
    await _apiClient.post('/confirmations/$confirmationId/reject');
  }
}
```

```dart
class DemoTasksRepository implements TasksRepository {
  @override
  Future<void> approveConfirmation(String confirmationId) async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
  }

  @override
  Future<void> rejectConfirmation(String confirmationId) async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
flutter test test/features/tasks/tasks_repository_test.dart
```

Expected:

* PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/features/tasks/data/tasks_repository.dart mobile/test/features/tasks/tasks_repository_test.dart
git commit -m "feat: add confirmation approve reject repository actions"
```

## Task 2: Add Task Action State Handling

**Files:**
* Modify: `mobile/lib/features/tasks/providers/tasks_provider.dart`
* Create or Modify: `mobile/test/features/tasks/task_action_controller_test.dart`

- [ ] **Step 1: Write the failing task-action state test**

```dart
test('approve action invalidates tasks list after success', () async {
  final container = ProviderContainer(
    overrides: <Override>[
      tasksRepositoryProvider.overrideWithValue(FakeTasksRepository()),
    ],
  );
  addTearDown(container.dispose);

  await container.read(approveTaskActionProvider('confirmation-1').future);

  expect(container.read(fakeTasksRepositoryProvider).approvedIds, contains('confirmation-1'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/tasks/task_action_controller_test.dart
```

Expected:

* FAIL because no action provider / controller exists yet.

- [ ] **Step 3: Add minimal action provider pattern**

Recommended minimal implementation:

```dart
final taskActionProvider = Provider<TaskActionService>((ref) {
  return TaskActionService(ref);
});

class TaskActionService {
  TaskActionService(this._ref);
  final Ref _ref;

  Future<void> approve(String confirmationId) async {
    await _ref.read(tasksRepositoryProvider).approveConfirmation(confirmationId);
    _ref.invalidate(tasksProvider);
  }

  Future<void> reject(String confirmationId) async {
    await _ref.read(tasksRepositoryProvider).rejectConfirmation(confirmationId);
    _ref.invalidate(tasksProvider);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
flutter test test/features/tasks/task_action_controller_test.dart
```

Expected:

* PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/features/tasks/providers/tasks_provider.dart mobile/test/features/tasks/task_action_controller_test.dart
git commit -m "feat: add task action refresh flow"
```

## Task 3: Add Approve / Reject Buttons To Task Cards

**Files:**
* Modify: `mobile/lib/features/tasks/presentation/tasks_screen.dart`
* Modify: `mobile/test/features/tasks/tasks_screen_test.dart`

- [ ] **Step 1: Write the failing widget test**

```dart
testWidgets('shows approve and reject actions for pending confirmation items', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        tasksRepositoryProvider.overrideWithValue(FakeTasksRepository()),
      ],
      child: const MaterialApp(home: TasksScreen()),
    ),
  );
  await tester.pumpAndSettle();

  expect(find.text('Approve'), findsOneWidget);
  expect(find.text('Reject'), findsOneWidget);
});
```

```dart
testWidgets('tapping approve triggers repository action', (tester) async {
  final repository = FakeTasksRepository();

  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        tasksRepositoryProvider.overrideWithValue(repository),
      ],
      child: const MaterialApp(home: TasksScreen()),
    ),
  );
  await tester.pumpAndSettle();

  await tester.tap(find.text('Approve'));
  await tester.pumpAndSettle();

  expect(repository.approvedIds, contains('confirmation-1'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/tasks/tasks_screen_test.dart
```

Expected:

* FAIL because task cards do not render action buttons yet.

- [ ] **Step 3: Render actions only for pending items**

Recommended UI shape:

```dart
Column(
  children: [
    ListTile(
      title: Text(task.title),
      subtitle: Text(task.subtitle),
      trailing: Text(task.status),
    ),
    if (task.status == 'pending')
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => ref.read(taskActionProvider).reject(task.id),
                child: const Text('Reject'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: () => ref.read(taskActionProvider).approve(task.id),
                child: const Text('Approve'),
              ),
            ),
          ],
        ),
      ),
  ],
)
```

- [ ] **Step 4: Add lightweight success / error feedback**

Use `ScaffoldMessenger` for MVP:

```dart
ScaffoldMessenger.of(context).showSnackBar(
  const SnackBar(content: Text('Confirmation updated.')),
);
```

On failure:

```dart
ScaffoldMessenger.of(context).showSnackBar(
  const SnackBar(content: Text('Unable to update this confirmation right now.')),
);
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
flutter test test/features/tasks/tasks_screen_test.dart
```

Expected:

* PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/features/tasks/presentation/tasks_screen.dart mobile/test/features/tasks/tasks_screen_test.dart
git commit -m "feat: add task confirmation actions"
```

## Task 4: Sync Docs And Remote Readiness Notes

**Files:**
* Modify: `docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md`
* Modify: `docs/design/pairfund-mobile-flutter-spec-v0.2.md`

- [ ] **Step 1: Update remote readiness checklist**

Change task center status from:

* `Ready` for read-only list

To:

* `Ready` for read + approve / reject confirmation actions

Also update the remaining gaps section to clarify that:

* comment input is still deferred
* non-confirmation task actions are still deferred

- [ ] **Step 2: Update Flutter spec**

Add to the task center section:

* pending confirmation cards now support approve / reject
* actions refresh the list after completion
* action feedback uses snackbars in MVP

- [ ] **Step 3: Run focused regression tests**

Run:

```powershell
flutter test test/features/tasks/tasks_repository_test.dart
flutter test test/features/tasks/task_action_controller_test.dart
flutter test test/features/tasks/tasks_screen_test.dart
```

Expected:

* PASS

- [ ] **Step 4: Commit**

```bash
git add docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md docs/design/pairfund-mobile-flutter-spec-v0.2.md
git commit -m "docs: sync confirmation action readiness"
```

## Self-Review

### Spec Coverage

Covered by this plan:

* approve confirmation action
* reject confirmation action
* task center UI action buttons
* provider invalidation and refresh
* readiness docs update

Not covered intentionally:

* action comments
* batch updates
* non-confirmation task actions

### Placeholder Scan

No TODO-only instructions are left intentionally. Each task includes concrete files, sample code, and explicit verification commands.

### Type Consistency

This plan keeps existing naming:

* `TasksRepository`
* `tasksRepositoryProvider`
* `tasksProvider`
* `TasksScreen`

New proposed naming:

* `approveConfirmation`
* `rejectConfirmation`
* `TaskActionService` or equivalent action provider
