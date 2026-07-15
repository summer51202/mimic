import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class TaskItem {
  const TaskItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.status,
  });

  final String id;
  final String title;
  final String subtitle;
  final String status;
}

class TaskSummary {
  const TaskSummary({
    required this.count,
    required this.items,
  });

  final int count;
  final List<TaskItem> items;
}

abstract class TasksRepository {
  Future<TaskSummary> fetchTasks();
  Future<void> approveConfirmation(String confirmationId, {String? comment});
  Future<void> rejectConfirmation(String confirmationId, {String? comment});
}

class DemoTasksRepository implements TasksRepository {
  @override
  Future<TaskSummary> fetchTasks() async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return const TaskSummary(
      count: 2,
      items: <TaskItem>[
        TaskItem(
          id: 'confirmation-demo-1',
          title: 'Late March correction review',
          subtitle: 'Needs attention today',
          status: 'pending',
        ),
        TaskItem(
          id: 'confirmation-demo-2',
          title: 'Recurring contribution reminder',
          subtitle: 'Trip Fund - Due tomorrow',
          status: 'pending',
        ),
      ],
    );
  }

  @override
  Future<void> approveConfirmation(String confirmationId, {String? comment}) async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
  }

  @override
  Future<void> rejectConfirmation(String confirmationId, {String? comment}) async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
  }
}

class RemoteTasksRepository implements TasksRepository {
  RemoteTasksRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<TaskSummary> fetchTasks() async {
    final response = await _apiClient.get('/confirmations');
    final items = readDataListEnvelope(response)
        .map(
          (json) => TaskItem(
            id: '${json['id'] ?? ''}',
            title:
                '${json['request_type'] ?? 'confirmation'} - ${json['related_entity_type'] ?? 'item'}',
            subtitle: '${json['message'] ?? 'Needs review'}',
            status: '${json['status'] ?? 'pending'}',
          ),
        )
        .toList();

    return TaskSummary(
      count: items.length,
      items: items,
    );
  }

  @override
  Future<void> approveConfirmation(String confirmationId, {String? comment}) async {
    await _apiClient.post(
      '/confirmations/$confirmationId/approve',
      data: <String, dynamic>{
        if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim(),
      },
    );
  }

  @override
  Future<void> rejectConfirmation(String confirmationId, {String? comment}) async {
    await _apiClient.post(
      '/confirmations/$confirmationId/reject',
      data: <String, dynamic>{
        if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim(),
      },
    );
  }
}

final tasksRepositoryProvider = Provider<TasksRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteTasksRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoTasksRepository();
});
