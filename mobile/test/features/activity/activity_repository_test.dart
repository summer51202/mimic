import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/activity/data/activity_repository.dart';
import 'package:pairfund_mobile/features/activity/data/remote/activity_remote_mapper.dart';
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
  test('remote activity repository combines expenses contributions and settlements', () async {
    final repository = RemoteActivityRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/funds/fund-1/expenses': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'expense-1',
                'title': 'Dinner',
                'occurred_on': '2026-04-10',
                'amount_minor': 880,
                'expense_type': 'fund_expense',
              },
              <String, dynamic>{
                'id': 'expense-2',
                'title': 'Correction for March split',
                'occurred_on': '2026-04-09',
                'amount_minor': 200,
                'expense_type': 'correction',
              },
            ],
          },
          '/funds/fund-1/contributions': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'contribution-1',
                'occurred_on': '2026-04-08',
                'amount_minor': 1000,
                'contribution_type': 'one_time',
              },
            ],
          },
          '/funds/fund-1/settlements': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'settlement-1',
                'status': 'completed',
                'amount_minor': 800,
                'period_start': '2026-03-01',
                'period_end': '2026-03-31',
              },
            ],
          },
        },
      ),
    );

    final timeline = await repository.fetchActivity('fund-1');

    expect(timeline.items.length, 4);
    expect(timeline.items.first.id, 'expense-1');
    expect(timeline.items.first.kind, ActivityKind.expense);
    expect(timeline.items[1].kind, ActivityKind.correction);
    expect(timeline.items[2].kind, ActivityKind.contribution);
    expect(timeline.items.last.kind, ActivityKind.settlement);
  });
}
