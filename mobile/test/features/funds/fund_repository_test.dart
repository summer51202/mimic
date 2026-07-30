import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/funds/data/fund_repository.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class Call {
  Call(this.path, this.query);
  final String path;
  final Map<String, dynamic>? query;
}

class FakeApiClient implements PairFundApiClient {
  FakeApiClient(this.responses, {this.error});
  final Map<String, Map<String, dynamic>> responses;
  final Object? error;
  final calls = <Call>[];
  @override
  Future<Map<String, dynamic>> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    calls.add(Call(path, queryParameters));
    if (error != null) throw error!;
    return responses[path]!;
  }

  @override
  Future<Map<String, dynamic>> post(String path,
          {Map<String, dynamic>? data,
          Map<String, dynamic>? queryParameters}) =>
      throw UnimplementedError();
}

Map<String, dynamic> summary(
        {Object? start = '2026-04-01',
        Object? end = '2026-04-30T12:00:00+08:00',
        Object? settled = '2026-03-31T00:00:00Z'}) =>
    {
      'data': {
        'fund': {
          'id': 'fund-1',
          'name': 'Date Fund',
          'currency': 'TWD',
          'cash_balance_minor': '6400'
        },
        'current_period': {
          'period_start': start,
          'period_end': end,
          'last_completed_settlement_id':
              settled == null ? null : 'settlement-1',
          'last_completed_period_end': settled
        },
        'current': {
          'net_change_minor': '720',
          'contribution_minor': '2000',
          'expense_minor': '1280',
          'member_positions': [
            {
              'user_id': 'u1',
              'display_name': 'Edward',
              'membership_status': 'active',
              'position_minor': '800'
            },
            {
              'user_id': 'u3',
              'display_name': 'Sam',
              'membership_status': 'active',
              'position_minor': '0'
            }
          ]
        },
        'all_time': {
          'net_change_minor': '6400',
          'contribution_minor': '10000',
          'expense_minor': '3600',
          'member_positions': [
            {
              'user_id': 'u2',
              'display_name': 'Partner',
              'membership_status': 'removed',
              'position_minor': '-800'
            }
          ]
        },
      }
    };
Map<String, dynamic> expenses() => {
      'data': [
        {'title': 'Dinner', 'occurred_on': '2026-04-01', 'amount_minor': 880}
      ]
    };
Map<String, dynamic> contributions() => {
      'data': [
        {'occurred_on': '2026-04-02T10:00:00Z', 'amount_minor': '1000'}
      ]
    };
FakeApiClient client(
        {Map<String, dynamic>? value,
        Object? error,
        Map<String, dynamic>? expense,
        Map<String, dynamic>? contribution}) =>
    FakeApiClient({
      '/funds/fund-1/summary': value ?? summary(),
      '/funds/fund-1/expenses': expense ?? expenses(),
      '/funds/fund-1/contributions': contribution ?? contributions()
    }, error: error);

void main() {
  test(
      'maps exact summary and raw activity while requesting only bounded sources',
      () async {
    final api = client();
    final detail = await RemoteFundRepository(api).fetchFundDetail('fund-1');
    expect((
      detail.fundId,
      detail.fundName,
      detail.currency,
      detail.cashBalanceMinor
    ), (
      'fund-1',
      'Date Fund',
      'TWD',
      6400
    ));
    expect((
      detail.current.netChangeMinor,
      detail.current.contributionMinor,
      detail.current.expenseMinor
    ), (
      720,
      2000,
      1280
    ));
    expect((
      detail.allTime.netChangeMinor,
      detail.allTime.contributionMinor,
      detail.allTime.expenseMinor
    ), (
      6400,
      10000,
      3600
    ));
    expect(detail.current.memberPositions.map((e) => e.membershipStatus),
        ['active', 'active']);
    expect(detail.allTime.memberPositions.single.membershipStatus, 'removed');
    expect(detail.periodStart, DateTime.utc(2026, 4, 1));
    expect(detail.periodEnd, DateTime.utc(2026, 4, 30, 4));
    expect(detail.lastCompletedSettlementId, 'settlement-1');
    expect(detail.lastCompletedPeriodEnd, DateTime.utc(2026, 3, 31));
    expect((
      detail.recentActivity.first.type,
      detail.recentActivity.first.title,
      detail.recentActivity.first.amountMinor,
      detail.recentActivity.first.occurredOn
    ), (
      FundActivityType.contribution,
      'Contribution',
      1000,
      DateTime.utc(2026, 4, 2, 10)
    ));
    expect((
      detail.recentActivity.last.type,
      detail.recentActivity.last.title,
      detail.recentActivity.last.amountMinor,
      detail.recentActivity.last.occurredOn
    ), (
      FundActivityType.expense,
      'Dinner',
      880,
      DateTime.utc(2026, 4, 1)
    ));
    expect(api.calls.map((e) => e.path), [
      '/funds/fund-1/summary',
      '/funds/fund-1/expenses',
      '/funds/fund-1/contributions'
    ]);
    expect(api.calls[1].query,
        {'page': 1, 'page_size': 3, 'sort': 'occurred_on_desc'});
    expect(api.calls[2].query,
        {'page': 1, 'page_size': 3, 'sort': 'occurred_on_desc'});
    expect(api.calls.where((e) => e.path == '/funds/fund-1'), isEmpty);
  });
  test('maps null periods and empty positions/activity', () async {
    final value = summary(start: null, end: null, settled: null);
    (value['data']['current'] as Map)['member_positions'] = [];
    (value['data']['all_time'] as Map)['member_positions'] = [];
    final d = await RemoteFundRepository(client(
        value: value,
        expense: {'data': []},
        contribution: {'data': []})).fetchFundDetail('fund-1');
    expect([
      d.periodStart,
      d.periodEnd,
      d.lastCompletedSettlementId,
      d.lastCompletedPeriodEnd
    ], [
      null,
      null,
      null,
      null
    ]);
    expect(d.recentActivity, isEmpty);
  });
  test('maps numeric and decimal string fund summaries identically', () async {
    final stringDetail =
        await RemoteFundRepository(client()).fetchFundDetail('fund-1');
    final numeric = summary();
    setPath(numeric, 'fund.cash_balance_minor', 6400);
    setPath(numeric, 'current.net_change_minor', 720);
    setPath(numeric, 'current.contribution_minor', 2000);
    setPath(numeric, 'current.expense_minor', 1280);
    setPathDeep(numeric, 'current.member.position_minor', 800);
    setPath(numeric, 'all_time.net_change_minor', 6400);
    setPath(numeric, 'all_time.contribution_minor', 10000);
    setPath(numeric, 'all_time.expense_minor', 3600);
    setPathDeep(numeric, 'all_time.member.position_minor', -800);

    final numericDetail = await RemoteFundRepository(client(value: numeric))
        .fetchFundDetail('fund-1');

    expect(numericDetail.cashBalanceMinor, stringDetail.cashBalanceMinor);
    expect(numericDetail.current.netChangeMinor,
        stringDetail.current.netChangeMinor);
    expect(numericDetail.current.memberPositions.first.positionMinor,
        stringDetail.current.memberPositions.first.positionMinor);
    expect(numericDetail.allTime.memberPositions.single.positionMinor,
        stringDetail.allTime.memberPositions.single.positionMinor);
  });
  test('merges newest activity across sources and keeps only three', () async {
    final detail = await RemoteFundRepository(client(
      expense: {
        'data': [
          {
            'title': 'Old expense',
            'occurred_on': '2026-04-01',
            'amount_minor': 100
          },
          {
            'title': 'Newest expense',
            'occurred_on': '2026-04-05',
            'amount_minor': 500
          },
          {
            'title': 'Middle expense',
            'occurred_on': '2026-04-03',
            'amount_minor': 300
          },
        ]
      },
      contribution: {
        'data': [
          {'occurred_on': '2026-04-06', 'amount_minor': 600},
          {'occurred_on': '2026-04-04', 'amount_minor': 400},
          {'occurred_on': '2026-04-02', 'amount_minor': 200},
        ]
      },
    )).fetchFundDetail('fund-1');
    expect(
        detail.recentActivity.map((item) => item.amountMinor), [600, 500, 400]);
  });
  final malformedObjects = <String, void Function(Map<String, dynamic>)>{
    'envelope data missing': (value) => value.remove('data'),
    'envelope data not object': (value) => value['data'] = 'bad',
    'fund missing': (value) => data(value).remove('fund'),
    'fund not object': (value) => replaceDataField(value, 'fund', 'bad'),
    'current_period missing': (value) => data(value).remove('current_period'),
    'current_period not object': (value) =>
        replaceDataField(value, 'current_period', 'bad'),
    'current missing': (value) => data(value).remove('current'),
    'current not object': (value) => replaceDataField(value, 'current', 'bad'),
    'all_time missing': (value) => data(value).remove('all_time'),
    'all_time not object': (value) =>
        replaceDataField(value, 'all_time', 'bad'),
    'current member_positions missing': (value) =>
        (data(value)['current'] as Map).remove('member_positions'),
    'current member_positions not list': (value) =>
        (data(value)['current'] as Map)['member_positions'] = 'bad',
    'all_time member_positions missing': (value) =>
        (data(value)['all_time'] as Map).remove('member_positions'),
    'all_time member_positions not list': (value) =>
        (data(value)['all_time'] as Map)['member_positions'] = 'bad',
    'current member item not object': (value) =>
        (data(value)['current'] as Map)['member_positions'] = [7],
    'current member position wrong type': (value) =>
        ((data(value)['current'] as Map)['member_positions'] as List)
            .first['position_minor'] = '8.5',
    'all_time member position wrong type': (value) =>
        ((data(value)['all_time'] as Map)['member_positions'] as List)
            .first['position_minor'] = '-8.5',
  };
  for (final entry in malformedObjects.entries) {
    test('rejects ${entry.key}', () async {
      final value = summary();
      entry.value(value);
      expect(
          () => RemoteFundRepository(client(value: value))
              .fetchFundDetail('fund-1'),
          throwsFormatException);
    });
  }
  test('accepts null and non-empty settlement id', () async {
    expect(
        (await RemoteFundRepository(client(value: summary(settled: null)))
                .fetchFundDetail('fund-1'))
            .lastCompletedSettlementId,
        isNull);
    expect(
        (await RemoteFundRepository(client()).fetchFundDetail('fund-1'))
            .lastCompletedSettlementId,
        'settlement-1');
  });
  for (final invalid in <Object>[7, '']) {
    test('rejects invalid settlement id $invalid', () async {
      final value = summary();
      (data(value)['current_period'] as Map)['last_completed_settlement_id'] =
          invalid;
      expect(
          () => RemoteFundRepository(client(value: value))
              .fetchFundDetail('fund-1'),
          throwsFormatException);
    });
  }
  for (final path in [
    'fund.id',
    'fund.name',
    'fund.currency',
    'current_period',
    'current',
    'all_time',
    'current.member_positions',
    'current.member.user_id',
    'current.member.display_name',
    'current.member.membership_status',
    'current.member.position_minor',
    'all_time.member_positions',
    'all_time.member.user_id',
    'all_time.member.display_name',
    'all_time.member.membership_status',
    'all_time.member.position_minor'
  ]) {
    test('rejects missing required $path', () async {
      final value = summary();
      removePath(value, path);
      expect(
          () => RemoteFundRepository(client(value: value))
              .fetchFundDetail('fund-1'),
          throwsFormatException);
    });
  }
  for (final path in [
    'fund.id',
    'fund.name',
    'fund.currency',
    'current.member.user_id',
    'current.member.display_name',
    'current.member.membership_status'
  ]) {
    test('rejects wrong required string $path', () async {
      final value = summary();
      setPathDeep(value, path, 7);
      expect(
          () => RemoteFundRepository(client(value: value))
              .fetchFundDetail('fund-1'),
          throwsFormatException);
    });
  }
  for (final path in [
    'fund.cash_balance_minor',
    'current.net_change_minor',
    'current.contribution_minor',
    'current.expense_minor',
    'all_time.net_change_minor',
    'all_time.contribution_minor',
    'all_time.expense_minor'
  ]) {
    test('rejects missing and wrong numeric $path', () async {
      final missing = summary();
      removePath(missing, path);
      expect(
          () => RemoteFundRepository(client(value: missing))
              .fetchFundDetail('fund-1'),
          throwsFormatException);
      final wrong = summary();
      setPath(wrong, path, '10.5');
      expect(
          () => RemoteFundRepository(client(value: wrong))
              .fetchFundDetail('fund-1'),
          throwsFormatException);
    });
  }
  test('accepts date-only and offset but rejects naive and invalid dates',
      () async {
    final d = await RemoteFundRepository(client()).fetchFundDetail('fund-1');
    expect(d.periodStart, DateTime.utc(2026, 4, 1));
    for (final date in ['2026-04-01T12:00:00', 'not-a-date']) {
      for (final field in ['start', 'end', 'settled']) {
        final value = field == 'start'
            ? summary(start: date)
            : field == 'end'
                ? summary(end: date)
                : summary(settled: date);
        expect(
            () => RemoteFundRepository(client(value: value))
                .fetchFundDetail('fund-1'),
            throwsFormatException);
      }
    }
  });
  test('requires activity date and amount with correct types', () async {
    for (final bad in [
      {'title': 'x', 'amount_minor': 1},
      {'title': 'x', 'occurred_on': '2026-01-01'},
      {'title': 'x', 'occurred_on': '2026-01-01', 'amount_minor': '1.5'},
      {'title': 'x', 'occurred_on': 'naive', 'amount_minor': 1}
    ]) {
      expect(
          () => RemoteFundRepository(client(expense: {
                'data': [bad]
              })).fetchFundDetail('fund-1'),
          throwsFormatException);
    }
  });
  test('requires a non-empty expense title', () async {
    for (final expense in [
      {'occurred_on': '2026-01-01', 'amount_minor': 1},
      {'title': 7, 'occurred_on': '2026-01-01', 'amount_minor': 1},
      {'title': '', 'occurred_on': '2026-01-01', 'amount_minor': 1},
    ]) {
      expect(
          () => RemoteFundRepository(client(expense: {
                'data': [expense]
              })).fetchFundDetail('fund-1'),
          throwsFormatException);
    }
  });
  test('forwards identical ApiException', () async {
    const error = ApiException(code: 'DENIED', message: 'no', statusCode: 403);
    try {
      await RemoteFundRepository(client(error: error))
          .fetchFundDetail('fund-1');
      fail('expected');
    } catch (e) {
      expect(identical(e, error), isTrue);
      expect((e as ApiException).code, 'DENIED');
      expect(e.statusCode, 403);
    }
  });
}

Map data(Map<String, dynamic> root) => root['data'] as Map;
void replaceDataField(Map<String, dynamic> root, String field, Object value) {
  final loose = Map<dynamic, dynamic>.from(data(root));
  loose[field] = value;
  root['data'] = loose;
}

void removePath(Map<String, dynamic> root, String path) {
  final p = path.split('.');
  dynamic target = data(root);
  for (final key in p.take(p.length - 1)) {
    target = key == 'member'
        ? (target['member_positions'] as List).first
        : target[key];
  }
  if (p.last == 'member_positions') {
    target.remove('member_positions');
  } else if (target is Map) {
    target.remove(p.last);
  }
}

void setPath(Map<String, dynamic> root, String path, Object value) {
  final p = path.split('.');
  dynamic target = data(root);
  dynamic parent = root;
  dynamic parentKey = 'data';
  for (final key in p.take(p.length - 1)) {
    final loose = Map<dynamic, dynamic>.from(target as Map);
    parent[parentKey] = loose;
    parent = loose;
    parentKey = key;
    target = loose[key];
  }
  final loose = Map<dynamic, dynamic>.from(target as Map);
  loose[p.last] = value;
  parent[parentKey] = loose;
}

void setPathDeep(Map<String, dynamic> root, String path, Object value) {
  final p = path.split('.');
  dynamic target = data(root);
  dynamic parent = root;
  dynamic parentKey = 'data';
  for (final key in p.take(p.length - 1)) {
    if (key == 'member') {
      final members = List<dynamic>.from(target['member_positions'] as List);
      final looseMember = Map<dynamic, dynamic>.from(members.first as Map);
      members[0] = looseMember;
      target['member_positions'] = members;
      parent = members;
      parentKey = 0;
      target = looseMember;
    } else {
      final loose = Map<dynamic, dynamic>.from(target as Map);
      parent[parentKey] = loose;
      parent = loose;
      parentKey = key;
      target = loose[key];
    }
  }
  final loose = Map<dynamic, dynamic>.from(target as Map);
  loose[p.last] = value;
  parent[parentKey] = loose;
}
