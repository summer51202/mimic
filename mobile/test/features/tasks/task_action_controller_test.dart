import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/tasks/data/tasks_repository.dart';
import 'package:pairfund_mobile/features/tasks/providers/tasks_provider.dart';

class FakeTasksRepository implements TasksRepository {
  final List<String> approvedIds = <String>[];
  final List<String> rejectedIds = <String>[];
  int fetchCount = 0;

  @override
  Future<void> approveConfirmation(String confirmationId, {String? comment}) async {
    approvedIds.add(confirmationId);
  }

  @override
  Future<TaskSummary> fetchTasks() async {
    fetchCount += 1;
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
    rejectedIds.add(confirmationId);
  }
}

void main() {
  test('task action service approves and invalidates tasks list', () async {
    final repository = FakeTasksRepository();
    final container = ProviderContainer(
      overrides: <Override>[
        tasksRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);

    await container.read(tasksProvider.future);
    expect(repository.fetchCount, 1);

    await container.read(taskActionServiceProvider).approve('confirmation-1');
    await container.read(tasksProvider.future);

    expect(repository.approvedIds, contains('confirmation-1'));
    expect(repository.fetchCount, 2);
  });

  test('task action service rejects and invalidates tasks list', () async {
    final repository = FakeTasksRepository();
    final container = ProviderContainer(
      overrides: <Override>[
        tasksRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);

    await container.read(tasksProvider.future);
    expect(repository.fetchCount, 1);

    await container.read(taskActionServiceProvider).reject('confirmation-1');
    await container.read(tasksProvider.future);

    expect(repository.rejectedIds, contains('confirmation-1'));
    expect(repository.fetchCount, 2);
  });
}
