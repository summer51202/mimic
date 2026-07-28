import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/home/data/group_dashboard.dart';
import 'package:pairfund_mobile/features/home/data/home_repository.dart';
import 'package:pairfund_mobile/features/home/data/remote/group_dashboard_remote_mapper.dart';
import 'package:pairfund_mobile/features/home/data/remote/home_remote_mapper.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class FakeApiClient implements PairFundApiClient {
  FakeApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;
  final List<String> getPaths = <String>[];

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    getPaths.add(path);
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
  test('dashboard models defensively copy every list', () {
    final members = <DashboardMemberPosition>[
      const DashboardMemberPosition(
        userId: 'user-1',
        displayName: 'Edward',
        membershipStatus: 'active',
        positionMinor: 100,
      ),
    ];
    final totals = DashboardPeriodTotals(
      netChangeMinor: 100,
      contributionMinor: 100,
      expenseMinor: 0,
      memberPositions: members,
    );
    final funds = <DashboardFundCard>[
      const DashboardFundCard(
        fundId: 'fund-1',
        name: 'Daily',
        cashBalanceMinor: 100,
        currentNetChangeMinor: 100,
        periodStart: null,
        periodEnd: null,
      ),
    ];
    final currency = CurrencyDashboard(
      currency: 'TWD',
      cashBalanceMinor: 100,
      current: totals,
      allTime: totals,
      funds: funds,
    );
    final currencies = <CurrencyDashboard>[currency];
    final dashboard = GroupDashboard(
      groupId: 'group-1',
      groupName: 'Pair',
      defaultCurrency: 'TWD',
      currencies: currencies,
    );

    members.clear();
    funds.clear();
    currencies.clear();

    expect(totals.memberPositions, hasLength(1));
    expect(currency.funds, hasLength(1));
    expect(dashboard.currencies, hasLength(1));
    expect(() => totals.memberPositions.add(totals.memberPositions.single),
        throwsUnsupportedError);
    expect(() => currency.funds.add(currency.funds.single),
        throwsUnsupportedError);
    expect(() => dashboard.currencies.add(currency), throwsUnsupportedError);
  });

  group('group dashboard mapper', () {
    test('maps currencies, nullable periods, former members, and zero defaults',
        () {
      final dashboard = mapGroupDashboardResponse(<String, dynamic>{
        'data': <String, dynamic>{
          'group': <String, dynamic>{
            'id': 'group-1',
            'name': 'Pair',
            'default_currency': 'TWD',
          },
          'currencies': <dynamic>[
            _currencyJson('TWD',
                cashBalanceMinor: 111,
                currentNetChangeMinor: 11,
                allTimeNetChangeMinor: 101,
                memberStatus: 'removed',
                positionMinor: 7),
            _currencyJson('USD',
                cashBalanceMinor: 222,
                currentNetChangeMinor: 22,
                allTimeNetChangeMinor: 202,
                positionMinor: -9,
                periodStart: '2026-07-01T00:00:00.000Z'),
          ],
        },
      });

      expect(dashboard.groupId, 'group-1');
      expect(dashboard.currencies.map((item) => item.currency), ['TWD', 'USD']);
      expect(dashboard.currencies.first.cashBalanceMinor, 111);
      expect(dashboard.currencies.first.current.netChangeMinor, 11);
      expect(dashboard.currencies.first.current.contributionMinor, 11);
      expect(dashboard.currencies.first.current.expenseMinor, 0);
      expect(dashboard.currencies.first.allTime.netChangeMinor, 101);
      expect(dashboard.currencies.first.allTime.contributionMinor, 101);
      expect(dashboard.currencies.first.allTime.expenseMinor, 0);
      expect(
          dashboard
              .currencies.first.current.memberPositions.single.positionMinor,
          7);
      expect(dashboard.currencies.last.cashBalanceMinor, 222);
      expect(dashboard.currencies.last.current.netChangeMinor, 22);
      expect(dashboard.currencies.last.current.contributionMinor, 22);
      expect(dashboard.currencies.last.current.expenseMinor, 0);
      expect(dashboard.currencies.last.allTime.netChangeMinor, 202);
      expect(dashboard.currencies.last.allTime.contributionMinor, 202);
      expect(dashboard.currencies.last.allTime.expenseMinor, 0);
      expect(
          dashboard
              .currencies.last.current.memberPositions.single.positionMinor,
          -9);
      expect(dashboard.currencies.first.funds.single.periodStart, isNull);
      expect(dashboard.currencies.last.funds.single.periodStart?.isUtc, isTrue);
      expect(
          dashboard
              .currencies.first.current.memberPositions.single.membershipStatus,
          'removed');
      expect(() => dashboard.currencies.add(dashboard.currencies.first),
          throwsUnsupportedError);
      expect(() => dashboard.currencies.first.funds.clear(),
          throwsUnsupportedError);
    });

    test('rejects missing or empty required values and wrong numeric types',
        () {
      for (final mutation in <void Function(Map<String, dynamic>)>[
        (data) => (data['group'] as Map<String, dynamic>).remove('id'),
        (data) => (data['group'] as Map<String, dynamic>)['id'] = '',
        (data) => ((data['currencies'] as List).first
            as Map<String, dynamic>)['currency'] = '',
        (data) => ((data['currencies'] as List).first
            as Map<String, dynamic>)['cash_balance_minor'] = '10',
      ]) {
        final data = <String, dynamic>{
          'group': <String, dynamic>{
            'id': 'g',
            'name': 'Pair',
            'default_currency': 'TWD'
          },
          'currencies': <dynamic>[_currencyJson('TWD')],
        };
        mutation(data);
        expect(() => mapGroupDashboardResponse(<String, dynamic>{'data': data}),
            throwsFormatException);
      }
    });

    test('rejects invalid dates', () {
      expect(
        () => mapGroupDashboardResponse(<String, dynamic>{
          'data': <String, dynamic>{
            'group': <String, dynamic>{
              'id': 'g',
              'name': 'Pair',
              'default_currency': 'TWD'
            },
            'currencies': <dynamic>[
              _currencyJson('TWD', periodStart: 'not-a-date')
            ],
          },
        }),
        throwsFormatException,
      );
    });
  });
  test('HomeSummary exposes nullable groupId', () {
    const summary = HomeSummary(
      groupId: 'group-1',
      displayName: 'Edward',
      totalBalanceLabel: 'TWD 0',
      activeFunds: <FundSummary>[],
      recentActivities: <ActivityPreview>[],
      pendingTasksCount: 0,
    );

    expect(summary.groupId, 'group-1');
  });

  test('demo home repository uses the demo group id', () async {
    final groups = await DemoHomeRepository().fetchGroups();
    final summary = await DemoHomeRepository().fetchSummary(
      groupId: groups.single.id,
    );

    expect(summary.groupId, 'group-demo');
    expect(groups.single.name, 'Demo group');
  });

  test('remote home repository returns null groupId when there are no groups',
      () async {
    final repository = RemoteHomeRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/me': <String, dynamic>{
            'data': <String, dynamic>{'display_name': 'Edward'},
          },
        },
      ),
    );

    final summary = await repository.fetchSummary(groupId: null);

    expect(summary.groupId, isNull);
  });

  test('remote home repository combines me groups and dashboard into summary',
      () async {
    final apiClient = FakeApiClient(
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
              'group_type': 'couple',
            },
            <String, dynamic>{
              'id': 'group-2',
              'name': 'Trip',
              'group_type': 'group',
            },
          ],
        },
        '/groups/group-1/members': <String, dynamic>{
          'data': <Map<String, dynamic>>[
            <String, dynamic>{
              'user_id': 'user-1',
              'role': 'owner',
            },
          ],
        },
        '/groups/group-2/members': <String, dynamic>{
          'data': <Map<String, dynamic>>[
            <String, dynamic>{
              'user_id': 'user-1',
              'display_name': 'Edward',
              'role': 'member',
              'status': 'active',
            },
            <String, dynamic>{
              'user_id': 'user-2',
              'display_name': 'Alice',
              'role': 'owner',
              'status': 'active',
            },
          ],
        },
        '/groups/group-2/dashboard': <String, dynamic>{
          'data': <String, dynamic>{
            'group': <String, dynamic>{
              'id': 'group-2',
              'name': 'Trip',
              'default_currency': 'TWD'
            },
            'currencies': <dynamic>[
              _currencyJson('TWD',
                  cashBalanceMinor: 10000,
                  currentNetChangeMinor: 1200,
                  allTimeNetChangeMinor: 9800,
                  positionMinor: 600,
                  includeSecondFund: true),
              _currencyJson('USD',
                  cashBalanceMinor: 2500,
                  currentNetChangeMinor: -300,
                  allTimeNetChangeMinor: 2200,
                  positionMinor: -150),
            ],
          }
        },
      },
    );
    final repository = RemoteHomeRepository(apiClient);

    final groups = await repository.fetchGroups();
    final summary = await repository.fetchSummary(groupId: 'group-2');

    expect(summary.displayName, 'Edward');
    expect(summary.groupId, 'group-2');
    expect(summary.totalBalanceLabel, 'TWD 100.00');
    expect(summary.activeFunds.length, 2);
    expect(summary.activeFunds.first.name, 'Date Fund');
    expect(summary.dashboard!.currencies, hasLength(2));
    expect(summary.dashboard!.currencies[0].cashBalanceMinor, 10000);
    expect(summary.dashboard!.currencies[0].current.netChangeMinor, 1200);
    expect(summary.dashboard!.currencies[0].current.contributionMinor, 1200);
    expect(summary.dashboard!.currencies[0].current.expenseMinor, 0);
    expect(summary.dashboard!.currencies[0].allTime.netChangeMinor, 9800);
    expect(
        summary.dashboard!.currencies[0].current.memberPositions.single
            .positionMinor,
        600);
    expect(summary.dashboard!.currencies[1].cashBalanceMinor, 2500);
    expect(summary.dashboard!.currencies[1].current.netChangeMinor, -300);
    expect(summary.dashboard!.currencies[1].current.contributionMinor, 0);
    expect(summary.dashboard!.currencies[1].current.expenseMinor, 300);
    expect(summary.dashboard!.currencies[1].allTime.netChangeMinor, 2200);
    expect(
        summary.dashboard!.currencies[1].current.memberPositions.single
            .positionMinor,
        -150);
    expect(
      groups,
      contains(
        const GroupSummary(
          id: 'group-2',
          name: 'Trip',
          groupType: 'group',
          memberCount: 2,
          role: 'member',
          members: <GroupMemberSummary>[
            GroupMemberSummary(
              id: 'user-1',
              displayName: 'Edward',
              role: 'member',
            ),
            GroupMemberSummary(
              id: 'user-2',
              displayName: 'Alice',
              role: 'owner',
            ),
          ],
        ),
      ),
    );
    expect(apiClient.getPaths.where((path) => path == '/me'), hasLength(2));
    expect(
        apiClient.getPaths.where((path) => path == '/groups/group-2/dashboard'),
        hasLength(1));
    expect(apiClient.getPaths, isNot(contains('/groups/group-2/funds')));
    expect(
        apiClient.getPaths.where((path) => path.contains('/summary')), isEmpty);
    expect(groups.last.members.map((member) => member.displayName),
        <String>['Edward', 'Alice']);
  });

  test('remote home repository loads an explicitly selected group id',
      () async {
    final apiClient = FakeApiClient(
      <String, Map<String, dynamic>>{
        '/me': <String, dynamic>{
          'data': <String, dynamic>{'display_name': 'Edward'},
        },
        '/groups/second-group/dashboard': <String, dynamic>{
          'data': <String, dynamic>{
            'group': <String, dynamic>{
              'id': 'second-group',
              'name': 'Second',
              'default_currency': 'TWD'
            },
            'currencies': <dynamic>[],
          }
        },
      },
    );
    final repository = RemoteHomeRepository(
      apiClient,
    );

    final summary = await repository.fetchSummary(groupId: 'second-group');

    expect(summary.groupId, 'second-group');
    expect(apiClient.getPaths, contains('/groups/second-group/dashboard'));
  });

  test('remote home repository forwards API errors', () async {
    final repository =
        RemoteHomeRepository(FakeApiClient(<String, Map<String, dynamic>>{
      '/me': <String, dynamic>{
        'data': <String, dynamic>{'id': 'u', 'display_name': 'Edward'}
      },
    }));
    expect(() => repository.fetchSummary(groupId: 'missing'), throwsStateError);
  });

  test('remote mapper requires nullable groupId and maps it through', () {
    final withGroup = mapRemoteHomeSummary(
      groupId: 'group-1',
      user: const MeDto(displayName: 'Edward'),
      totalBalanceLabel: 'TWD 0',
      activeFunds: const <FundSummary>[],
    );
    final withoutGroup = mapRemoteHomeSummary(
      groupId: null,
      user: const MeDto(displayName: 'Edward'),
      totalBalanceLabel: 'TWD 0',
      activeFunds: const <FundSummary>[],
    );

    expect(withGroup.groupId, 'group-1');
    expect(withoutGroup.groupId, isNull);
  });

  test('remote user fallback uses visible mimic brand copy', () {
    final user = MeDto.fromJson(const <String, dynamic>{});

    expect(user.displayName, 'mimic');
  });
}

Map<String, dynamic> _currencyJson(
  String currency, {
  int cashBalanceMinor = 0,
  int currentNetChangeMinor = 0,
  int allTimeNetChangeMinor = 0,
  int positionMinor = 0,
  String? periodStart,
  String memberStatus = 'active',
  bool includeSecondFund = false,
}) {
  return <String, dynamic>{
    'currency': currency,
    'cash_balance_minor': cashBalanceMinor,
    'current': <String, dynamic>{
      'net_change_minor': currentNetChangeMinor,
      'contribution_minor':
          currentNetChangeMinor > 0 ? currentNetChangeMinor : 0,
      'expense_minor': currentNetChangeMinor < 0 ? -currentNetChangeMinor : 0,
      'member_positions': <dynamic>[
        <String, dynamic>{
          'user_id': 'user-1',
          'display_name': 'Edward',
          'membership_status': memberStatus,
          'position_minor': positionMinor,
        },
      ],
    },
    'all_time': <String, dynamic>{
      'net_change_minor': allTimeNetChangeMinor,
      'contribution_minor':
          allTimeNetChangeMinor > 0 ? allTimeNetChangeMinor : 0,
      'expense_minor': allTimeNetChangeMinor < 0 ? -allTimeNetChangeMinor : 0,
      'member_positions': <dynamic>[
        <String, dynamic>{
          'user_id': 'user-1',
          'display_name': 'Edward',
          'membership_status': memberStatus,
          'position_minor': positionMinor,
        },
      ],
    },
    'funds': <dynamic>[
      <String, dynamic>{
        'fund_id': 'fund-$currency',
        'name': currency == 'TWD' ? 'Date Fund' : '$currency Fund',
        'cash_balance_minor': cashBalanceMinor,
        'current_net_change_minor': 0,
        'period_start': periodStart,
        'period_end': null,
      },
      if (includeSecondFund)
        <String, dynamic>{
          'fund_id': 'fund-2',
          'name': 'Trip Fund',
          'cash_balance_minor': 3600,
          'current_net_change_minor': 0,
          'period_start': null,
          'period_end': null,
        },
    ],
  };
}
