enum ActivityKind {
  expense,
  correction,
  contribution,
  settlement,
}

class ActivityTimelineItem {
  const ActivityTimelineItem({
    required this.id,
    required this.kind,
    required this.title,
    required this.subtitle,
    required this.amountLabel,
    required this.occurredOn,
    this.statusLabel,
  });

  final String id;
  final ActivityKind kind;
  final String title;
  final String subtitle;
  final String amountLabel;
  final String occurredOn;
  final String? statusLabel;
}

class ActivityTimeline {
  const ActivityTimeline({
    required this.items,
  });

  final List<ActivityTimelineItem> items;
}

class ActivityExpenseDto {
  const ActivityExpenseDto({
    required this.id,
    required this.title,
    required this.occurredOn,
    required this.amountMinor,
    required this.expenseType,
  });

  final String id;
  final String title;
  final String occurredOn;
  final int amountMinor;
  final String expenseType;

  factory ActivityExpenseDto.fromJson(Map<String, dynamic> json) {
    return ActivityExpenseDto(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Expense',
      occurredOn: json['occurred_on'] as String? ?? '',
      amountMinor: json['amount_minor'] as int? ?? 0,
      expenseType: json['expense_type'] as String? ?? 'fund_expense',
    );
  }
}

class ActivityContributionDto {
  const ActivityContributionDto({
    required this.id,
    required this.occurredOn,
    required this.amountMinor,
    required this.contributionType,
  });

  final String id;
  final String occurredOn;
  final int amountMinor;
  final String contributionType;

  factory ActivityContributionDto.fromJson(Map<String, dynamic> json) {
    return ActivityContributionDto(
      id: json['id'] as String? ?? '',
      occurredOn: json['occurred_on'] as String? ?? '',
      amountMinor: json['amount_minor'] as int? ?? 0,
      contributionType: json['contribution_type'] as String? ?? 'one_time',
    );
  }
}

class ActivitySettlementDto {
  const ActivitySettlementDto({
    required this.id,
    required this.status,
    required this.amountMinor,
    required this.periodStart,
    required this.periodEnd,
    required this.createdAt,
  });

  final String id;
  final String status;
  final int amountMinor;
  final String periodStart;
  final String periodEnd;
  final String createdAt;

  factory ActivitySettlementDto.fromJson(Map<String, dynamic> json) {
    return ActivitySettlementDto(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      amountMinor: json['amount_minor'] as int? ?? 0,
      periodStart: json['period_start'] as String? ?? '',
      periodEnd: json['period_end'] as String? ?? '',
      createdAt: json['created_at'] as String? ?? '',
    );
  }
}

ActivityTimelineItem mapExpenseActivityItem(
  ActivityExpenseDto dto, {
  required String amountLabel,
}) {
  final isCorrection = dto.expenseType == 'correction';

  return ActivityTimelineItem(
    id: dto.id,
    kind: isCorrection ? ActivityKind.correction : ActivityKind.expense,
    title: dto.title,
    subtitle: isCorrection ? 'Correction entry' : 'Expense',
    amountLabel: amountLabel,
    occurredOn: dto.occurredOn,
    statusLabel: isCorrection ? 'correction' : null,
  );
}

ActivityTimelineItem mapContributionActivityItem(
  ActivityContributionDto dto, {
  required String amountLabel,
}) {
  return ActivityTimelineItem(
    id: dto.id,
    kind: ActivityKind.contribution,
    title: 'Contribution',
    subtitle: dto.contributionType.replaceAll('_', ' '),
    amountLabel: amountLabel,
    occurredOn: dto.occurredOn,
  );
}

ActivityTimelineItem mapSettlementActivityItem(
  ActivitySettlementDto dto, {
  required String amountLabel,
}) {
  final occurredOn = dto.periodEnd.isNotEmpty ? dto.periodEnd : dto.createdAt;

  return ActivityTimelineItem(
    id: dto.id,
    kind: ActivityKind.settlement,
    title: 'Settlement',
    subtitle: '${dto.periodStart} to ${dto.periodEnd}',
    amountLabel: amountLabel,
    occurredOn: occurredOn,
    statusLabel: dto.status,
  );
}
