import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settlements/data/settlement_repository.dart';
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
  test('remote settlement repository maps suggestion summary and history',
      () async {
    final repository = RemoteSettlementRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/funds/fund-1/settlement-suggestion': <String, dynamic>{
            'data': <String, dynamic>{
              'currency': 'TWD',
              'period_start': '2026-03-01',
              'period_end': '2026-03-31',
              'suggestions': <Map<String, dynamic>>[
                <String, dynamic>{
                  'from_user_id': 'partner-user',
                  'to_user_id': 'edward-user',
                  'amount_minor': 800,
                },
              ],
            },
          },
          '/funds/fund-1/settlements': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'settlement-previous',
                'status': 'completed',
                'amount_minor': 800,
                'period_start': '2026-02-01',
                'period_end': '2026-02-28',
              },
            ],
          },
        },
      ),
    );

    final summary = await repository.fetchSettlementSummary('fund-1');

    expect(summary.periodLabel, 'Coverage: 2026-03-01 to 2026-03-31');
    expect(summary.currentSettlementId, 'settlement-previous');
    expect(summary.lockMessage, 'This period becomes locked after completion');
    expect(summary.suggestions.length, 1);
    expect(summary.suggestions.first.fromUser, 'partner-user');
    expect(summary.suggestions.first.toUser, 'edward-user');
    expect(summary.suggestions.first.amountLabel, 'TWD 8.00');
    expect(summary.history.length, 1);
    expect(summary.history.first.title, 'completed - TWD 8.00');
    expect(summary.history.first.subtitle, '2026-02-01 to 2026-02-28');
  });
}
