import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/funds/data/fund_repository.dart';
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
  test('remote fund repository maps detail summary and recent activity', () async {
    final repository = RemoteFundRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/funds/fund-1': <String, dynamic>{
            'data': <String, dynamic>{
              'fund': <String, dynamic>{
                'id': 'fund-1',
                'name': 'Date Fund',
                'currency': 'TWD',
              },
              'summary': <String, dynamic>{
                'balance_minor': 6400,
                'month_expense_minor': 1280,
                'month_contribution_minor': 2000,
                'locked_period_label': 'Locked through 2026-03-31',
                'member_positions': <Map<String, dynamic>>[
                  <String, dynamic>{
                    'display_name': 'Edward',
                    'position_minor': 800,
                  },
                  <String, dynamic>{
                    'display_name': 'Partner',
                    'position_minor': -800,
                  },
                ],
              },
            },
          },
          '/funds/fund-1/expenses': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'title': 'Dinner',
                'occurred_on': '2026-04-01',
                'amount_minor': 880,
              },
            ],
          },
          '/funds/fund-1/contributions': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{
                'occurred_on': '2026-04-02',
                'amount_minor': 1000,
              },
            ],
          },
        },
      ),
    );

    final detail = await repository.fetchFundDetail('fund-1');

    expect(detail.fundId, 'fund-1');
    expect(detail.fundName, 'Date Fund');
    expect(detail.balanceLabel, 'TWD 6,400');
    expect(detail.monthExpenseLabel, 'TWD 1,280');
    expect(detail.monthContributionLabel, 'TWD 2,000');
    expect(detail.memberPositions.length, 2);
    expect(detail.memberPositions.first.name, 'Edward');
    expect(detail.memberPositions.first.positionLabel, 'TWD 800');
    expect(detail.lockedPeriodLabel, 'Locked through 2026-03-31');
    expect(detail.recentActivity.length, 2);
    expect(detail.recentActivity.first.title, 'Dinner');
    expect(detail.recentActivity.last.title, 'Contribution');
  });
}
