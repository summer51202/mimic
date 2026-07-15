import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/tasks/data/tasks_repository.dart';
import 'package:pairfund_mobile/features/tasks/presentation/tasks_screen.dart';

class FakeTasksRepository implements TasksRepository {
  final List<String> approvedIds = <String>[];
  final List<String> rejectedIds = <String>[];

  @override
  Future<void> approveConfirmation(String confirmationId, {String? comment}) async {
    approvedIds.add(confirmationId);
  }

  @override
  Future<TaskSummary> fetchTasks() async {
    return const TaskSummary(
      count: 1,
      items: <TaskItem>[
        TaskItem(
          id: 'confirmation-1',
          title: 'late_entry - expense',
          subtitle: 'Needs attention today',
          status: 'pending',
        ),
      ],
    );
  }

  @override
  Future<void> rejectConfirmation(String confirmationId, {String? comment}) async {
    rejectedIds.add(confirmationId);
  }
}

void main() {
  testWidgets('shows pending tasks header', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          tasksRepositoryProvider.overrideWithValue(FakeTasksRepository()),
        ],
        child: MaterialApp(
          home: TasksScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Pending tasks'), findsOneWidget);
  });

  testWidgets('shows approve and reject actions for pending task items', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          tasksRepositoryProvider.overrideWithValue(FakeTasksRepository()),
        ],
        child: const MaterialApp(
          home: TasksScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Approve'), findsOneWidget);
    expect(find.text('Reject'), findsOneWidget);
  });

  testWidgets('tapping approve triggers repository action', (
    WidgetTester tester,
  ) async {
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
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    expect(repository.approvedIds, contains('confirmation-1'));
    expect(find.text('Confirmation updated.'), findsOneWidget);
  });

  testWidgets('tapping reject triggers repository action', (
    WidgetTester tester,
  ) async {
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
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    expect(repository.rejectedIds, contains('confirmation-1'));
    expect(find.text('Confirmation updated.'), findsOneWidget);
  });
}
