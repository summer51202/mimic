export interface MemberPositionReadModel {
  userId: string;
  displayName: string;
  membershipStatus: string;
  positionMinor: number;
}

export interface PeriodTotals {
  netChangeMinor: number;
  contributionMinor: number;
  expenseMinor: number;
  memberPositions: MemberPositionReadModel[];
}

export interface FundSummaryReadModel {
  fund: {
    id: string;
    groupId: string;
    name: string;
    currency: string;
    status: string;
    cashBalanceMinor: number;
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
