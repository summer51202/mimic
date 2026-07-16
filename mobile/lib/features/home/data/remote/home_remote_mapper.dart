import '../home_repository.dart';

class MeDto {
  const MeDto({
    this.id = '',
    required this.displayName,
  });

  final String id;
  final String displayName;

  factory MeDto.fromJson(Map<String, dynamic> data) {
    return MeDto(
      id: '${data['id'] ?? ''}',
      displayName: '${data['display_name'] ?? 'PairFund'}',
    );
  }
}

class GroupDto {
  const GroupDto({
    required this.id,
    required this.name,
    required this.groupType,
  });

  final String id;
  final String name;
  final String groupType;

  factory GroupDto.fromJson(Map<String, dynamic> data) {
    return GroupDto(
      id: '${data['id'] ?? ''}',
      name: '${data['name'] ?? 'Unnamed group'}',
      groupType: '${data['group_type'] ?? 'group'}',
    );
  }
}

class GroupMemberDto {
  const GroupMemberDto({required this.userId, required this.role});

  final String userId;
  final String role;

  factory GroupMemberDto.fromJson(Map<String, dynamic> data) {
    return GroupMemberDto(
      userId: '${data['user_id'] ?? ''}',
      role: '${data['role'] ?? 'member'}',
    );
  }
}

class FundListItemDto {
  const FundListItemDto({
    required this.id,
    required this.name,
    required this.currency,
    required this.balanceMinor,
  });

  final String id;
  final String name;
  final String currency;
  final int balanceMinor;

  factory FundListItemDto.fromJson(Map<String, dynamic> data) {
    return FundListItemDto(
      id: '${data['id'] ?? ''}',
      name: '${data['name'] ?? 'Unnamed fund'}',
      currency: '${data['currency'] ?? 'TWD'}',
      balanceMinor: (data['balance_minor'] as num?)?.toInt() ?? 0,
    );
  }
}

FundSummary mapFundSummary(
  FundListItemDto dto, {
  required String balanceLabel,
}) {
  return FundSummary(
    id: dto.id,
    name: dto.name,
    balanceLabel: balanceLabel,
  );
}

HomeSummary mapRemoteHomeSummary({
  required String? groupId,
  required MeDto user,
  required String totalBalanceLabel,
  required List<FundSummary> activeFunds,
}) {
  return HomeSummary(
    groupId: groupId,
    displayName: user.displayName,
    totalBalanceLabel: totalBalanceLabel,
    activeFunds: activeFunds,
    recentActivities: const <ActivityPreview>[],
    pendingTasksCount: 0,
  );
}
