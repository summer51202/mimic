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
      displayName: '${data['display_name'] ?? 'mimic'}',
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
  const GroupMemberDto({
    required this.userId,
    required this.displayName,
    required this.role,
    required this.status,
  });

  final String userId;
  final String displayName;
  final String role;
  final String status;

  factory GroupMemberDto.fromJson(Map<String, dynamic> data) {
    return GroupMemberDto(
      userId: '${data['user_id'] ?? ''}',
      displayName: '${data['display_name'] ?? 'Unknown member'}',
      role: '${data['role'] ?? 'member'}',
      status: '${data['status'] ?? 'active'}',
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
      balanceMinor: _minorUnit(data, 'balance_minor', missingAsZero: true),
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

int _minorUnit(Map<String, dynamic> json, String key,
    {bool missingAsZero = false}) {
  if (!json.containsKey(key) && missingAsZero) return 0;
  final value = json[key];
  if (value is int) return value;
  if (value is num && value.isFinite && value % 1 == 0) return value.toInt();
  if (value is String) {
    final parsed = int.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('$key must be a base-10 integer minor-unit value');
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
