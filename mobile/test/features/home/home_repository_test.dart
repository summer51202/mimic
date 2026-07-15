import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/home/data/home_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class FakeApiClient implements PairFundApiClient {
  FakeApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;

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
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for POST $path');
    }
    return response;
  }
}

void main() {
  test('remote home repository combines me groups and funds into summary', () async {
    final repository = RemoteHomeRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/me': <String, dynamic>{
            'data': <String, dynamic>{
              'id': 'user-1',
              'display_name': 'Edward',
            },
          },
          '/groups': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'group-1',
                'name': 'Pair',
              },
            ],
          },
          '/groups/group-1/funds': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'fund-1',
                'name': 'Date Fund',
                'currency': 'TWD',
                'balance_minor': 6400,
              },
              <String, dynamic>{
                'id': 'fund-2',
                'name': 'Trip Fund',
                'currency': 'TWD',
                'balance_minor': 3600,
              },
            ],
          },
        },
      ),
    );

    final summary = await repository.fetchSummary();

    expect(summary.displayName, 'Edward');
    expect(summary.totalBalanceLabel, 'TWD 10,000');
    expect(summary.activeFunds.length, 2);
    expect(summary.activeFunds.first.name, 'Date Fund');
  });
}
