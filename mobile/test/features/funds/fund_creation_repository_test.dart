import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/funds/data/fund_creation_repository.dart';
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
  test('remote fund creation repository posts to first available group', () async {
    final apiClient = RecordingApiClient(
      <String, Map<String, dynamic>>{
        '/groups': <String, dynamic>{
          'data': <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'group-1',
              'name': 'Pair',
            },
          ],
        },
        '/groups/group-1/funds': <String, dynamic>{
          'data': <String, dynamic>{
            'id': 'fund-1',
            'name': 'Trip Fund',
            'currency': 'TWD',
            'status': 'active',
          },
        },
      },
    );
    final repository = RemoteFundCreationRepository(apiClient);

    final result = await repository.createFund(
      const CreateFundDraft(
        name: 'Trip Fund',
        currency: 'TWD',
      ),
    );

    expect(apiClient.lastPostPath, '/groups/group-1/funds');
    expect(apiClient.lastPostData?['name'], 'Trip Fund');
    expect(result.id, 'fund-1');
    expect(result.name, 'Trip Fund');
  });
}
