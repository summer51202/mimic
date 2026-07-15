import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/tasks/data/tasks_repository.dart';
import 'package:pairfund_mobile/features/tasks/presentation/tasks_screen.dart';

class FakeTasksRepository implements TasksRepository {
  String? lastApprovedId;
  String? lastRejectedId;
  String? lastApprovedComment;
  String? lastRejectedComment;

  @override
  Future<void> approveConfirmation(String confirmationId, {String? comment}) async {
    lastApprovedId = confirmationId;
    lastApprovedComment = comment;
  }

  @override
  Future<TaskSummary> fetchTasks() async {
    return const TaskSummary(
      count: 1,
      items: <TaskItem>[
        TaskItem(
          id: 'confirmation-1',
          title: 'late_entry - expense',
          subtitle: 'Needs review',
          status: 'pending',
        ),
      ],
    );
  }

  @override
  Future<void> rejectConfirmation(String confirmationId, {String? comment}) async {
    lastRejectedId = confirmationId;
    lastRejectedComment = comment;
  }
}

void main() {
  testWidgets('approve dialog submits optional comment', (WidgetTester tester) async {
    final repository = FakeTasksRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          tasksRepositoryProvider.overrideWithValue(repository),
        ],
        child: const MaterialApp(
          home: TasksScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Approve'));
    await tester.tap(find.text('Approve'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Looks correct');
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    expect(repository.lastApprovedId, 'confirmation-1');
    expect(repository.lastApprovedComment, 'Looks correct');
    expect(find.text('Confirmation updated.'), findsOneWidget);
  });

  testWidgets('reject dialog submits optional comment', (WidgetTester tester) async {
    final repository = FakeTasksRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          tasksRepositoryProvider.overrideWithValue(repository),
        ],
        child: const MaterialApp(
          home: TasksScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Reject'));
    await tester.tap(find.text('Reject'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Please explain this entry');
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    expect(repository.lastRejectedId, 'confirmation-1');
    expect(repository.lastRejectedComment, 'Please explain this entry');
    expect(find.text('Confirmation updated.'), findsOneWidget);
  });
}
