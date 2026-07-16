import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/home/data/home_repository.dart';
import 'package:pairfund_mobile/features/home/data/remote/home_remote_mapper.dart';
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
    final summary = await DemoHomeRepository().fetchSummary();

    expect(summary.groupId, 'group-demo');
  });

  test('remote home repository returns null groupId when there are no groups',
      () async {
    final repository = RemoteHomeRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/me': <String, dynamic>{
            'data': <String, dynamic>{'display_name': 'Edward'},
          },
          '/groups': <String, dynamic>{
            'data': <Map<String, dynamic>>[],
          },
        },
      ),
    );

    final summary = await repository.fetchSummary();

    expect(summary.groupId, isNull);
  });

  test('remote home repository combines me groups and funds into summary',
      () async {
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
    expect(summary.groupId, 'group-1');
    expect(summary.totalBalanceLabel, 'TWD 10,000');
    expect(summary.activeFunds.length, 2);
    expect(summary.activeFunds.first.name, 'Date Fund');
  });

  test('remote home repository selects the first group id', () async {
    final repository = RemoteHomeRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/me': <String, dynamic>{
            'data': <String, dynamic>{'display_name': 'Edward'},
          },
          '/groups': <String, dynamic>{
            'data': <Map<String, dynamic>>[
              <String, dynamic>{'id': 'first/group'},
              <String, dynamic>{'id': 'second-group'},
            ],
          },
          '/groups/first/group/funds': <String, dynamic>{
            'data': <Map<String, dynamic>>[],
          },
        },
      ),
    );

    final summary = await repository.fetchSummary();

    expect(summary.groupId, 'first/group');
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
