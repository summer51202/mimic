import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class _RecordingApiClient
    implements
        PairFundApiClient,
        PairFundPatchApiClient,
        PairFundDeleteApiClient {
  final getPaths = <String>[];
  String? patchPath;
  Map<String, dynamic>? patchData;
  String? deletePath;
  String? postPath;

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
          'current_user_id': 'user-1',
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
  }) async {
    postPath = path;
    return <String, dynamic>{'data': <String, dynamic>{}};
  }

  @override
  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, dynamic>? data,
  }) async {
    deletePath = path;
    return <String, dynamic>{'data': <String, dynamic>{}};
  }

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

  test('demo repository keeps role changes and removed history in memory',
      () async {
    final repository = DemoGroupRepository();

    await repository.updateMemberRole('group-demo', 'demo-member', 'OWNER');
    expect(
      (await repository.fetchGroup('group-demo'))
          .members
          .singleWhere((member) => member.id == 'demo-member')
          .role,
      'owner',
    );

    await repository.removeMember('group-demo', 'demo-member');
    expect(
      (await repository.fetchGroup('group-demo'))
          .members
          .where((member) => member.id == 'demo-member'),
      isEmpty,
    );
  });

  test('demo leave does not implicitly promote the remaining member', () async {
    final repository = DemoGroupRepository();

    await repository.leaveGroup('group-demo');
    final detail = await repository.fetchGroup('group-demo');

    expect(detail.members.single.id, 'demo-member');
    expect(detail.members.single.role, 'member');
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
    expect(detail.currentUserId, 'user-1');
    expect(detail.members.single.displayName, 'Edward');
    expect(detail.funds.single.name, 'Date Fund');
    expect(detail.funds.single.balanceLabel, 'TWD 6,400');
  });

  test('updates the exact member role with lower-case PATCH data', () async {
    final api = _RecordingApiClient();

    await RemoteGroupRepository(api)
        .updateMemberRole('group-1', 'user-2', 'OWNER');

    expect(api.patchPath, '/groups/group-1/members/user-2');
    expect(api.patchData, {'role': 'owner'});
  });

  test('removes the exact member with DELETE', () async {
    final api = _RecordingApiClient();

    await RemoteGroupRepository(api).removeMember('group-1', 'user-2');

    expect(api.deletePath, '/groups/group-1/members/user-2');
  });

  test('leaves the exact group with POST', () async {
    final api = _RecordingApiClient();

    await RemoteGroupRepository(api).leaveGroup('group-1');

    expect(api.postPath, '/groups/group-1/leave');
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
