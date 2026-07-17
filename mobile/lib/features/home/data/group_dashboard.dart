enum DashboardScope { current, allTime }

class GroupDashboard {
  GroupDashboard({
    required this.groupId,
    required this.groupName,
    required this.defaultCurrency,
    required List<CurrencyDashboard> currencies,
  }) : currencies = List.unmodifiable(currencies);

  final String groupId;
  final String groupName;
  final String defaultCurrency;
  final List<CurrencyDashboard> currencies;
}

class CurrencyDashboard {
  CurrencyDashboard({
    required this.currency,
    required this.cashBalanceMinor,
    required this.current,
    required this.allTime,
    required List<DashboardFundCard> funds,
  }) : funds = List.unmodifiable(funds);

  final String currency;
  final int cashBalanceMinor;
  final DashboardPeriodTotals current;
  final DashboardPeriodTotals allTime;
  final List<DashboardFundCard> funds;
}

class DashboardPeriodTotals {
  DashboardPeriodTotals({
    required this.netChangeMinor,
    required this.contributionMinor,
    required this.expenseMinor,
    required List<DashboardMemberPosition> memberPositions,
  }) : memberPositions = List.unmodifiable(memberPositions);

  final int netChangeMinor;
  final int contributionMinor;
  final int expenseMinor;
  final List<DashboardMemberPosition> memberPositions;
}

class DashboardMemberPosition {
  const DashboardMemberPosition({
    required this.userId,
    required this.displayName,
    required this.membershipStatus,
    required this.positionMinor,
  });

  final String userId;
  final String displayName;
  final String membershipStatus;
  final int positionMinor;
}

class DashboardFundCard {
  const DashboardFundCard({
    required this.fundId,
    required this.name,
    required this.cashBalanceMinor,
    required this.currentNetChangeMinor,
    required this.periodStart,
    required this.periodEnd,
  });

  final String fundId;
  final String name;
  final int cashBalanceMinor;
  final int currentNetChangeMinor;
  final DateTime? periodStart;
  final DateTime? periodEnd;
}
