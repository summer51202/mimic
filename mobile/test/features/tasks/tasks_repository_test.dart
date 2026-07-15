import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/tasks/data/tasks_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class FakeApiClient implements PairFundApiClient {
  FakeApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;
  String? lastPostPath;
  Map<String, dynamic>? lastPostData;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for GET $path');
    }
    return response;
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    lastPostPath = path;
    lastPostData = data;
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for POST $path');
    }
    return response;
  }
}

void main() {
  test('remote tasks repository maps confirmations to pending tasks', () async {
    final repository = RemoteTasksRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/confirmations': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'confirmation-1',
                'request_type': 'late_entry',
                'related_entity_type': 'expense',
                'message': 'This March expense affects a settled period.',
                'status': 'pending',
              },
            ],
          },
        },
      ),
    );

    final summary = await repository.fetchTasks();

    expect(summary.count, 1);
    expect(summary.items.first.title, 'late_entry - expense');
    expect(summary.items.first.subtitle, 'This March expense affects a settled period.');
  });

  test('remote tasks repository approves confirmation', () async {
    final apiClient = FakeApiClient(
      <String, Map<String, dynamic>>{
        '/confirmations/confirmation-1/approve': <String, dynamic>{
          'data': <String, dynamic>{
            'id': 'confirmation-1',
            'status': 'approved',
          },
        },
      },
    );
    final repository = RemoteTasksRepository(apiClient);

    await repository.approveConfirmation(
      'confirmation-1',
      comment: 'Looks correct',
    );

    expect(apiClient.lastPostPath, '/confirmations/confirmation-1/approve');
    expect(apiClient.lastPostData?['comment'], 'Looks correct');
  });

  test('remote tasks repository rejects confirmation', () async {
    final apiClient = FakeApiClient(
      <String, Map<String, dynamic>>{
        '/confirmations/confirmation-1/reject': <String, dynamic>{
          'data': <String, dynamic>{
            'id': 'confirmation-1',
            'status': 'rejected',
          },
        },
      },
    );
    final repository = RemoteTasksRepository(apiClient);

    await repository.rejectConfirmation(
      'confirmation-1',
      comment: 'Please clarify this record',
    );

    expect(apiClient.lastPostPath, '/confirmations/confirmation-1/reject');
    expect(apiClient.lastPostData?['comment'], 'Please clarify this record');
  });
}
