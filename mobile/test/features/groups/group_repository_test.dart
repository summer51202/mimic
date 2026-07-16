import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class _RecordingApiClient implements PairFundApiClient, PairFundPatchApiClient {
  final getPaths = <String>[];
  String? patchPath;
  Map<String, dynamic>? patchData;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    getPaths.add(path);
    return <String, dynamic>{
      '/groups/group-1': {
        'data': {
          'id': 'group-1',
          'name': 'Our Home',
          'group_type': 'couple',
          'default_currency': 'TWD',
          'role': 'owner',
        },
      },
      '/groups/group-1/members': {
        'data': [
          {
            'user_id': 'user-1',
            'display_name': 'Edward',
            'role': 'owner',
            'status': 'active',
          },
        ],
      },
      '/groups/group-1/funds': {
        'data': [
          {
            'id': 'fund-1',
            'name': 'Date Fund',
            'currency': 'TWD',
            'balance_minor': 6400,
          },
        ],
      },
    }[path]!;
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    patchPath = path;
    patchData = data;
    return {
      'data': {
        'id': 'group-1',
        'name': '${data?['name']}',
        'group_type': 'couple',
        'default_currency': 'TWD',
      },
    };
  }
}

void main() {
  test('demo repository keeps a renamed group name', () async {
    final repository = DemoGroupRepository();

    await repository.renameGroup('group-demo', 'Renamed Demo');
    final detail = await repository.fetchGroup('group-demo');

    expect(detail.name, 'Renamed Demo');
  });

  test('fetches and maps detail members and funds for the exact group',
      () async {
    final api = _RecordingApiClient();
    final detail = await RemoteGroupRepository(api).fetchGroup('group-1');

    expect(api.getPaths, <String>[
      '/groups/group-1',
      '/groups/group-1/members',
      '/groups/group-1/funds',
    ]);
    expect(detail.name, 'Our Home');
    expect(detail.role, 'owner');
    expect(detail.members.single.displayName, 'Edward');
    expect(detail.funds.single.name, 'Date Fund');
    expect(detail.funds.single.balanceLabel, 'TWD 6,400');
  });

  test('renames the exact group with PATCH', () async {
    final api = _RecordingApiClient();
    final group = await RemoteGroupRepository(api).renameGroup(
      'group-1',
      'Renamed Home',
    );

    expect(api.patchPath, '/groups/group-1');
    expect(api.patchData, {'name': 'Renamed Home'});
    expect(group.name, 'Renamed Home');
  });
}
