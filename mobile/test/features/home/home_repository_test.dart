import 'package:flutter_test/flutter_test.dart';
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
            _currencyJson('TWD', memberStatus: 'removed'),
            _currencyJson('USD', periodStart: '2026-07-01T00:00:00.000Z'),
          ],
        },
      });

      expect(dashboard.groupId, 'group-1');
      expect(dashboard.currencies.map((item) => item.currency), ['TWD', 'USD']);
      expect(dashboard.currencies.first.current.netChangeMinor, 0);
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
                  cashBalanceMinor: 10000, includeSecondFund: true)
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
    expect(summary.totalBalanceLabel, 'TWD 10,000');
    expect(summary.activeFunds.length, 2);
    expect(summary.activeFunds.first.name, 'Date Fund');
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
}

Map<String, dynamic> _currencyJson(
  String currency, {
  int cashBalanceMinor = 0,
  String? periodStart,
  String memberStatus = 'active',
  bool includeSecondFund = false,
}) {
  return <String, dynamic>{
    'currency': currency,
    'cash_balance_minor': cashBalanceMinor,
    'current': <String, dynamic>{
      'member_positions': <dynamic>[
        <String, dynamic>{
          'user_id': 'user-1',
          'display_name': 'Edward',
          'membership_status': memberStatus,
          'position_minor': 0,
        },
      ],
    },
    'all_time': <String, dynamic>{},
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
