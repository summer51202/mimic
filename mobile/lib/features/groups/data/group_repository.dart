import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';
import '../../../shared/utils/currency_formatter.dart';
import 'group_summary.dart';

class GroupFundSummary {
  const GroupFundSummary({
    required this.id,
    required this.name,
    required this.balanceLabel,
  });

  final String id;
  final String name;
  final String balanceLabel;
}

class GroupDetail {
  const GroupDetail({
    required this.id,
    required this.name,
    required this.groupType,
    required this.defaultCurrency,
    required this.role,
    this.currentUserId = '',
    required this.members,
    required this.funds,
  });

  final String id;
  final String name;
  final String groupType;
  final String defaultCurrency;
  final String role;
  final String currentUserId;
  final List<GroupMemberSummary> members;
  final List<GroupFundSummary> funds;
}

class RenamedGroup {
  const RenamedGroup({required this.id, required this.name});

  final String id;
  final String name;
}

abstract class GroupRepository {
  Future<GroupDetail> fetchGroup(String groupId);

  Future<RenamedGroup> renameGroup(String groupId, String name);

  Future<void> updateMemberRole(String groupId, String userId, String role);

  Future<void> removeMember(String groupId, String userId);

  Future<void> leaveGroup(String groupId);
}

class DemoGroupRepository implements GroupRepository {
  String _name = 'Demo group';
  static const _currentUserId = 'demo-owner';
  final List<GroupMemberSummary> _members = const <GroupMemberSummary>[
    GroupMemberSummary(
      id: 'demo-owner',
      displayName: 'Edward',
      role: 'owner',
    ),
    GroupMemberSummary(
      id: 'demo-member',
      displayName: 'Alex',
      role: 'member',
    ),
  ].toList();
  final Set<String> _inactiveMemberIds = <String>{};

  @override
  Future<GroupDetail> fetchGroup(String groupId) async {
    return GroupDetail(
      id: groupId,
      name: _name,
      groupType: 'couple',
      defaultCurrency: 'TWD',
      role: 'owner',
      currentUserId: _currentUserId,
      members: _members
          .where((member) => !_inactiveMemberIds.contains(member.id))
          .toList(growable: false),
      funds: const <GroupFundSummary>[],
    );
  }

  @override
  Future<RenamedGroup> renameGroup(String groupId, String name) async {
    _name = name;
    return RenamedGroup(id: groupId, name: name);
  }

  @override
  Future<void> updateMemberRole(
    String groupId,
    String userId,
    String role,
  ) async {
    final index = _members.indexWhere(
      (member) => member.id == userId && !_inactiveMemberIds.contains(userId),
    );
    if (index == -1) return;
    final member = _members[index];
    _members[index] = GroupMemberSummary(
      id: member.id,
      displayName: member.displayName,
      role: role.toLowerCase(),
    );
  }

  @override
  Future<void> removeMember(String groupId, String userId) async {
    _inactiveMemberIds.add(userId);
  }

  @override
  Future<void> leaveGroup(String groupId) async {
    _inactiveMemberIds.add(_currentUserId);
  }
}

class RemoteGroupRepository implements GroupRepository {
  RemoteGroupRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<GroupDetail> fetchGroup(String groupId) async {
    final detailResponse = await _apiClient.get('/groups/$groupId');
    final membersResponse = await _apiClient.get('/groups/$groupId/members');
    final fundsResponse = await _apiClient.get('/groups/$groupId/funds');
    final detail = readDataEnvelope(detailResponse);
    final members = readDataListEnvelope(membersResponse);
    final funds = readDataListEnvelope(fundsResponse);

    return GroupDetail(
      id: '${detail['id'] ?? groupId}',
      name: '${detail['name'] ?? 'Unnamed group'}',
      groupType: '${detail['group_type'] ?? 'group'}',
      defaultCurrency: '${detail['default_currency'] ?? 'TWD'}',
      role: '${detail['role'] ?? 'member'}',
      currentUserId: '${detail['current_user_id'] ?? ''}',
      members: members
          .map(
            (member) => GroupMemberSummary(
              id: '${member['user_id'] ?? ''}',
              displayName: '${member['display_name'] ?? 'Unknown member'}',
              role: '${member['role'] ?? 'member'}',
            ),
          )
          .toList(),
      funds: funds
          .map(
            (fund) => GroupFundSummary(
              id: '${fund['id'] ?? ''}',
              name: '${fund['name'] ?? 'Unnamed fund'}',
              balanceLabel: formatMinorCurrency(
                (fund['balance_minor'] as num?)?.toInt() ?? 0,
                currency: '${fund['currency'] ?? 'TWD'}',
              ),
            ),
          )
          .toList(),
    );
  }

  @override
  Future<RenamedGroup> renameGroup(String groupId, String name) async {
    final patchClient = _apiClient as PairFundPatchApiClient;
    final response = await patchClient.patch(
      '/groups/$groupId',
      data: <String, dynamic>{'name': name},
    );
    final data = readDataEnvelope(response);
    return RenamedGroup(
      id: '${data['id'] ?? groupId}',
      name: '${data['name'] ?? name}',
    );
  }

  @override
  Future<void> updateMemberRole(
    String groupId,
    String userId,
    String role,
  ) async {
    final patchClient = _apiClient as PairFundPatchApiClient;
    await patchClient.patch(
      '/groups/$groupId/members/$userId',
      data: <String, dynamic>{'role': role.toLowerCase()},
    );
  }

  @override
  Future<void> removeMember(String groupId, String userId) async {
    final deleteClient = _apiClient as PairFundDeleteApiClient;
    await deleteClient.delete('/groups/$groupId/members/$userId');
  }

  @override
  Future<void> leaveGroup(String groupId) async {
    await _apiClient.post('/groups/$groupId/leave');
  }
}

final groupRepositoryProvider = Provider<GroupRepository>((Ref ref) {
  if (ref.watch(apiModeProvider) == AppApiMode.remote) {
    return RemoteGroupRepository(ref.watch(pairFundApiClientProvider));
  }
  return DemoGroupRepository();
});
