import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/funds/data/fund_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class FakeApiClient implements PairFundApiClient {
  FakeApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;
  final List<String> paths = <String>[];

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    paths.add(path);
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
  test('remote fund repository maps summary read model and preview activity',
      () async {
    final client = FakeApiClient(<String, Map<String, dynamic>>{
      '/funds/fund-1/summary': <String, dynamic>{
        'data': <String, dynamic>{
          'fund': <String, dynamic>{
            'id': 'fund-1',
            'name': 'Date Fund',
            'currency': 'TWD',
            'cash_balance_minor': 6400,
          },
          'current_period': <String, dynamic>{
            'period_start': '2026-04-01T00:00:00.000Z',
            'period_end': '2026-04-30T00:00:00.000Z',
            'last_completed_settlement_id': 'settlement-1',
            'last_completed_period_end': '2026-03-31T00:00:00.000Z',
          },
          'current': <String, dynamic>{
            'net_change_minor': 720,
            'expense_minor': 1280,
            'contribution_minor': 2000,
            'member_positions': <Map<String, dynamic>>[
              <String, dynamic>{
                'user_id': 'user-1',
                'display_name': 'Edward',
                'membership_status': 'active',
                'position_minor': 800,
              },
            ],
          },
          'all_time': <String, dynamic>{
            'net_change_minor': 6400,
            'expense_minor': 3600,
            'contribution_minor': 10000,
            'member_positions': <Map<String, dynamic>>[
              <String, dynamic>{
                'user_id': 'user-2',
                'display_name': 'Partner',
                'membership_status': 'removed',
                'position_minor': -800
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
    });
    final repository = RemoteFundRepository(client);

    final detail = await repository.fetchFundDetail('fund-1');

    expect(detail.fundId, 'fund-1');
    expect(detail.fundName, 'Date Fund');
    expect(detail.currency, 'TWD');
    expect(detail.cashBalanceMinor, 6400);
    expect(detail.current.expenseMinor, 1280);
    expect(detail.allTime.contributionMinor, 10000);
    expect(detail.current.memberPositions.single.displayName, 'Edward');
    expect(detail.allTime.memberPositions.single.membershipStatus, 'removed');
    expect(detail.lastCompletedSettlementId, 'settlement-1');
    expect(detail.periodStart, DateTime.utc(2026, 4));
    expect(detail.recentActivity.length, 2);
    expect(detail.recentActivity.first.title, 'Dinner');
    expect(detail.recentActivity.last.title, 'Contribution');
    expect(client.paths, <String>[
      '/funds/fund-1/summary',
      '/funds/fund-1/expenses',
      '/funds/fund-1/contributions'
    ]);
  });
}
