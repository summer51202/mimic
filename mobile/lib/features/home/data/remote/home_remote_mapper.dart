import '../home_repository.dart';

class MeDto {
  const MeDto({
    required this.displayName,
  });

  final String displayName;

  factory MeDto.fromJson(Map<String, dynamic> data) {
    return MeDto(
      displayName: '${data['display_name'] ?? 'PairFund'}',
    );
  }
}

class GroupDto {
  const GroupDto({
    required this.id,
  });

  final String id;

  factory GroupDto.fromJson(Map<String, dynamic> data) {
    return GroupDto(
      id: '${data['id'] ?? ''}',
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
  required MeDto user,
  required String totalBalanceLabel,
  required List<FundSummary> activeFunds,
}) {
  return HomeSummary(
    displayName: user.displayName,
    totalBalanceLabel: totalBalanceLabel,
    activeFunds: activeFunds,
    recentActivities: const <ActivityPreview>[],
    pendingTasksCount: 0,
  );
}
