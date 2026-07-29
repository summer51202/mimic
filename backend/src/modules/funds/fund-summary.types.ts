export type MinorUnit = number;

export interface MemberPositionReadModel {
  userId: string;
  displayName: string;
  membershipStatus: string;
  positionMinor: MinorUnit;
}

export interface PeriodTotals {
  netChangeMinor: MinorUnit;
  contributionMinor: MinorUnit;
  expenseMinor: MinorUnit;
  memberPositions: MemberPositionReadModel[];
}

export interface FundSummaryReadModel {
  fund: {
    id: string;
    groupId: string;
    name: string;
    currency: string;
    status: string;
    cashBalanceMinor: MinorUnit;
  };
  currentPeriod: {
    periodStart: string | null;
    periodEnd: string | null;
    lastCompletedSettlementId: string | null;
    lastCompletedPeriodEnd: string | null;
  };
  current: PeriodTotals;
  allTime: PeriodTotals;
}

export interface CurrencyDashboardReadModel {
  currency: string;
  cashBalanceMinor: MinorUnit;
  current: PeriodTotals;
  allTime: PeriodTotals;
  funds: Array<{
    fundId: string;
    name: string;
    cashBalanceMinor: MinorUnit;
    currentNetChangeMinor: MinorUnit;
    periodStart: string | null;
    periodEnd: string | null;
  }>;
}

export interface GroupDashboardReadModel {
  group: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
  currencies: CurrencyDashboardReadModel[];
}
