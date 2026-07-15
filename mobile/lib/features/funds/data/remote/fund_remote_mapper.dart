import '../fund_repository.dart';

class FundDetailDto {
  const FundDetailDto({
    required this.id,
    required this.name,
    required this.currency,
    required this.balanceMinor,
    required this.monthExpenseMinor,
    required this.monthContributionMinor,
    required this.memberPositions,
    required this.lockedPeriodLabel,
  });

  final String id;
  final String name;
  final String currency;
  final int balanceMinor;
  final int monthExpenseMinor;
  final int monthContributionMinor;
  final List<MemberPositionDto> memberPositions;
  final String lockedPeriodLabel;

  factory FundDetailDto.fromJson(Map<String, dynamic> data, {required String fallbackFundId}) {
    final fund = data['fund'] as Map<String, dynamic>? ?? data;
    final summary = data['summary'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final memberPositionsJson =
        (summary['member_positions'] as List?)?.whereType<Map<String, dynamic>>().toList() ??
            <Map<String, dynamic>>[];

    return FundDetailDto(
      id: '${fund['id'] ?? fallbackFundId}',
      name: '${fund['name'] ?? 'Fund'}',
      currency: '${fund['currency'] ?? 'TWD'}',
      balanceMinor:
          (summary['balance_minor'] as num?)?.toInt() ??
              (fund['balance_minor'] as num?)?.toInt() ??
              0,
      monthExpenseMinor: (summary['month_expense_minor'] as num?)?.toInt() ?? 0,
      monthContributionMinor:
          (summary['month_contribution_minor'] as num?)?.toInt() ?? 0,
      memberPositions: memberPositionsJson
          .map(MemberPositionDto.fromJson)
          .toList(),
      lockedPeriodLabel:
          '${summary['locked_period_label'] ?? 'Locked period not available yet'}',
    );
  }
}

class MemberPositionDto {
  const MemberPositionDto({
    required this.displayName,
    required this.positionMinor,
  });

  final String displayName;
  final int positionMinor;

  factory MemberPositionDto.fromJson(Map<String, dynamic> data) {
    return MemberPositionDto(
      displayName: '${data['display_name'] ?? data['user_id'] ?? 'Member'}',
      positionMinor: (data['position_minor'] as num?)?.toInt() ?? 0,
    );
  }
}

class FundActivityDto {
  const FundActivityDto({
    required this.title,
    required this.occurredOn,
    required this.amountMinor,
  });

  final String title;
  final String occurredOn;
  final int amountMinor;

  factory FundActivityDto.fromExpenseJson(Map<String, dynamic> data) {
    return FundActivityDto(
      title: '${data['title'] ?? 'Expense'}',
      occurredOn: '${data['occurred_on'] ?? ''}',
      amountMinor: (data['amount_minor'] as num?)?.toInt() ?? 0,
    );
  }

  factory FundActivityDto.fromContributionJson(Map<String, dynamic> data) {
    return FundActivityDto(
      title: 'Contribution',
      occurredOn: '${data['occurred_on'] ?? ''}',
      amountMinor: (data['amount_minor'] as num?)?.toInt() ?? 0,
    );
  }
}

MemberPositionSummary mapMemberPositionSummary(
  MemberPositionDto dto, {
  required String positionLabel,
}) {
  return MemberPositionSummary(
    name: dto.displayName,
    positionLabel: positionLabel,
  );
}

FundActivityItem mapFundActivityItem(
  FundActivityDto dto, {
  required String subtitle,
}) {
  return FundActivityItem(
    title: dto.title,
    subtitle: subtitle,
  );
}
