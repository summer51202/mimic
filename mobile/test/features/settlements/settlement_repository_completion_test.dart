import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settlements/data/settlement_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class RecordingApiClient implements PairFundApiClient {
  RecordingApiClient(this._responses);

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
  test('remote settlement repository completes settlement with completed_at', () async {
    final apiClient = RecordingApiClient(
      <String, Map<String, dynamic>>{
        '/settlements/settlement-1/complete': <String, dynamic>{
          'data': <String, dynamic>{
            'id': 'settlement-1',
            'status': 'completed',
          },
        },
      },
    );
    final repository = RemoteSettlementRepository(apiClient);

    await repository.completeSettlement('settlement-1');

    expect(apiClient.lastPostPath, '/settlements/settlement-1/complete');
    expect(apiClient.lastPostData?['completed_at'], isA<String>());
  });
}
