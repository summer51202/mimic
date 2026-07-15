import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/tasks_repository.dart';

final tasksProvider = FutureProvider.autoDispose<TaskSummary>((Ref ref) {
  return ref.watch(tasksRepositoryProvider).fetchTasks();
});

class TaskActionService {
  TaskActionService(this._ref);

  final Ref _ref;

  Future<void> approve(String confirmationId, {String? comment}) async {
    await _ref
        .read(tasksRepositoryProvider)
        .approveConfirmation(confirmationId, comment: comment);
    _ref.invalidate(tasksProvider);
  }

  Future<void> reject(String confirmationId, {String? comment}) async {
    await _ref
        .read(tasksRepositoryProvider)
        .rejectConfirmation(confirmationId, comment: comment);
    _ref.invalidate(tasksProvider);
  }
}

final taskActionServiceProvider = Provider<TaskActionService>((Ref ref) {
  return TaskActionService(ref);
});
