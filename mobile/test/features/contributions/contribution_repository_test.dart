import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/contributions/data/contribution_repository.dart';
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
  test('remote contribution repository posts contribution payload', () async {
    final apiClient = FakeApiClient(
      <String, Map<String, dynamic>>{
        '/funds/fund-1/contributions': <String, dynamic>{
          'data': <String, dynamic>{
            'id': 'contribution-1',
            'status': 'active',
          },
        },
      },
    );
    final repository = RemoteContributionRepository(apiClient);

    await repository.createContribution(
      const ContributionDraftPayload(
        fundId: 'fund-1',
        contributorUserId: 'user-a',
        amountText: '1000',
        contributionType: 'one_time',
        occurredOn: '2026-04-11',
        note: 'April top up',
      ),
    );

    expect(apiClient.lastPostPath, '/funds/fund-1/contributions');
    expect(apiClient.lastPostData?['contributor_user_id'], 'user-a');
    expect(apiClient.lastPostData?['amount_minor'], 1000);
    expect(apiClient.lastPostData?['note'], 'April top up');
  });
}
