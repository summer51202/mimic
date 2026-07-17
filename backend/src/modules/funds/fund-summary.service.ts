import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  FundStatus,
  GroupStatus,
  MemberStatus,
  Prisma,
  RecordStatus,
  SettlementStatus,
} from '@prisma/client';
import {
  AccountingCalculatorInput,
  calculateMemberPositions,
  expenseDirection,
} from '../accounting/accounting-calculator';
import { PrismaService } from '../prisma/prisma.service';
import {
  FundSummaryReadModel,
  GroupDashboardReadModel,
  MemberPositionReadModel,
  PeriodTotals,
} from './fund-summary.types';

const summarySelect = Prisma.validator<Prisma.FundSelect>()({
  id: true,
  groupId: true,
  name: true,
  currency: true,
  status: true,
  group: {
    select: {
      members: {
        select: {
          userId: true,
          status: true,
          user: { select: { displayName: true } },
        },
      },
    },
  },
  contributions: {
    where: { status: RecordStatus.ACTIVE },
    select: {
      contributorUserId: true,
      amountMinor: true,
      occurredOn: true,
      status: true,
    },
  },
  expenses: {
    where: { status: RecordStatus.ACTIVE },
    select: {
      expenseType: true,
      amountMinor: true,
      occurredOn: true,
      status: true,
      payers: { select: { payerUserId: true, amountMinor: true } },
      splits: { select: { userId: true, allocatedAmountMinor: true } },
    },
  },
  settlements: {
    where: { status: SettlementStatus.COMPLETED },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      amountMinor: true,
      status: true,
      periodEnd: true,
      completedAt: true,
      createdAt: true,
    },
  },
});

type SummaryFund = Prisma.FundGetPayload<{ select: typeof summarySelect }>;

const groupDashboardSelect = Prisma.validator<Prisma.GroupSelect>()({
  id: true,
  name: true,
  defaultCurrency: true,
  status: true,
  members: summarySelect.group.select.members,
  funds: {
    where: { status: FundStatus.ACTIVE },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      groupId: true,
      name: true,
      currency: true,
      status: true,
      contributions: summarySelect.contributions,
      expenses: summarySelect.expenses,
      settlements: summarySelect.settlements,
    },
  },
});

const groupAuthorizationSelect = Prisma.validator<Prisma.GroupSelect>()({
  id: true,
  members: {
    where: { status: MemberStatus.ACTIVE },
    select: { userId: true },
  },
});

type DashboardGroup = Prisma.GroupGetPayload<{
  select: typeof groupDashboardSelect;
}>;

@Injectable()
export class FundSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  getFundSummary(
    fundId: string,
    actorUserId: string,
  ): Promise<FundSummaryReadModel> {
    return this.prisma.$transaction(
      (tx) => this.getFundSummaryInTransaction(tx, fundId, actorUserId),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  getGroupDashboard(
    groupId: string,
    actorUserId: string,
  ): Promise<GroupDashboardReadModel> {
    return this.prisma.$transaction(
      async (tx) => {
        const authorization = await tx.group.findFirst({
          where: { id: groupId, status: GroupStatus.ACTIVE },
          select: {
            ...groupAuthorizationSelect,
            members: {
              ...groupAuthorizationSelect.members,
              where: {
                status: MemberStatus.ACTIVE,
                userId: actorUserId,
              },
            },
          },
        });
        if (!authorization) throw new NotFoundException('GROUP_NOT_FOUND');
        if (
          !authorization.members.some(
            (member) => member.userId === actorUserId,
          )
        ) {
          throw new ForbiddenException('GROUP_ACCESS_DENIED');
        }
        const group = await tx.group.findUnique({
          where: { id: groupId },
          select: groupDashboardSelect,
        });
        if (!group) throw new NotFoundException('GROUP_NOT_FOUND');
        return this.mapGroupDashboard(group);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private async getFundSummaryInTransaction(
    tx: Prisma.TransactionClient,
    fundId: string,
    actorUserId: string,
  ): Promise<FundSummaryReadModel> {
    const fund = await tx.fund.findFirst({
      where: { id: fundId, status: FundStatus.ACTIVE },
      select: summarySelect,
    });
    if (!fund) {
      throw new NotFoundException('FUND_NOT_FOUND');
    }

    const actor = fund.group.members.find(
      (member) =>
        member.userId === actorUserId && member.status === MemberStatus.ACTIVE,
    );
    if (!actor) {
      throw new ForbiddenException('GROUP_ACCESS_DENIED');
    }

    return this.mapSummary(fund);
  }

  private mapSummary(fund: SummaryFund): FundSummaryReadModel {
    const today = startOfUtcDay(new Date());
    const completedWithPeriod = fund.settlements
      .filter(
        (settlement) =>
          settlement.status === SettlementStatus.COMPLETED &&
          settlement.periodEnd !== null,
      )
      .sort(compareCompletedSettlementsLatestFirst);
    const latestCompleted = completedWithPeriod[0] ?? null;
    const firstTransaction = earliestDate([
      ...fund.contributions
        .filter((item) => item.status === RecordStatus.ACTIVE)
        .map((item) => item.occurredOn),
      ...fund.expenses
        .filter((item) => item.status === RecordStatus.ACTIVE)
        .map((item) => item.occurredOn),
      ...fund.settlements
        .map(settlementDate)
        .filter((value): value is Date => value !== null),
    ]);
    const candidateStart = latestCompleted?.periodEnd
      ? addUtcDays(latestCompleted.periodEnd, 1)
      : firstTransaction;
    const hasCurrentPeriod =
      candidateStart !== null && candidateStart.getTime() <= today.getTime();
    const periodStart = hasCurrentPeriod ? candidateStart : null;
    const periodEnd = hasCurrentPeriod ? today : null;

    const activeContributions = fund.contributions.filter(
      (item) => item.status === RecordStatus.ACTIVE,
    );
    const activeExpenses = fund.expenses.filter(
      (item) => item.status === RecordStatus.ACTIVE,
    );
    const currentContributions = periodStart
      ? activeContributions.filter((item) =>
          withinInclusive(item.occurredOn, periodStart, periodEnd!),
        )
      : [];
    const currentExpenses = periodStart
      ? activeExpenses.filter((item) =>
          withinInclusive(item.occurredOn, periodStart, periodEnd!),
        )
      : [];
    const currentSettlements = periodStart
      ? fund.settlements.filter((item) => {
          const date = settlementDate(item);
          return date !== null && withinInclusive(date, periodStart, periodEnd!);
        })
      : [];

    const allTime = this.buildTotals(
      fund,
      activeContributions,
      activeExpenses,
      fund.settlements.filter(
        (item) => item.status === SettlementStatus.COMPLETED,
      ),
      false,
    );
    const current = this.buildTotals(
      fund,
      currentContributions,
      currentExpenses,
      currentSettlements,
      true,
    );

    return {
      fund: {
        id: fund.id,
        groupId: fund.groupId,
        name: fund.name,
        currency: fund.currency,
        status: fund.status.toLowerCase(),
        cashBalanceMinor: allTime.netChangeMinor,
      },
      currentPeriod: {
        periodStart: formatDate(periodStart),
        periodEnd: formatDate(periodEnd),
        lastCompletedSettlementId: latestCompleted?.id ?? null,
        lastCompletedPeriodEnd: formatDate(latestCompleted?.periodEnd ?? null),
      },
      current,
      allTime,
    };
  }

  private mapGroupDashboard(group: DashboardGroup): GroupDashboardReadModel {
    const summaries = group.funds.map((fund) =>
      this.mapSummary({ ...fund, group: { members: group.members } }),
    );
    const byCurrency = new Map<string, FundSummaryReadModel[]>();
    summaries.forEach((summary) => {
      const items = byCurrency.get(summary.fund.currency) ?? [];
      items.push(summary);
      byCurrency.set(summary.fund.currency, items);
    });

    const currencies = [...byCurrency.entries()]
      .sort(([left], [right]) => {
        if (left === group.defaultCurrency) return -1;
        if (right === group.defaultCurrency) return 1;
        return compareCodePoint(left, right);
      })
      .map(([currency, items]) => ({
        currency,
        cashBalanceMinor: sumWithBigInt(items.map((item) => item.fund.cashBalanceMinor)),
        current: aggregatePeriodTotals(
          items.map((item) => item.current),
          group.members,
        ),
        allTime: aggregatePeriodTotals(
          items.map((item) => item.allTime),
          group.members,
        ),
        funds: items
          .map((item) => ({
            fundId: item.fund.id,
            name: item.fund.name,
            cashBalanceMinor: item.fund.cashBalanceMinor,
            currentNetChangeMinor: item.current.netChangeMinor,
            periodStart: item.currentPeriod.periodStart,
            periodEnd: item.currentPeriod.periodEnd,
          }))
          .sort(
            (left, right) =>
              compareCodePoint(left.name, right.name) ||
              compareCodePoint(left.fundId, right.fundId),
          ),
      }));

    return {
      group: {
        id: group.id,
        name: group.name,
        defaultCurrency: group.defaultCurrency,
      },
      currencies,
    };
  }

  private buildTotals(
    fund: SummaryFund,
    contributions: SummaryFund['contributions'],
    expenses: SummaryFund['expenses'],
    settlements: SummaryFund['settlements'],
    activeMembersOnly: boolean,
  ): PeriodTotals {
    assertAccountingAmountsAreSafe(
      fund,
      contributions,
      expenses,
      settlements,
    );
    const contributionMinor = contributions.reduce(
      (sum, item) => safeAdd(sum, safeBigIntToNumber(item.amountMinor)),
      0,
    );
    const expenseMinor = expenses.reduce((sum, item) => {
      const signedAmount =
        safeBigIntToNumber(item.amountMinor) *
        expenseDirection(item.expenseType);
      return safeAdd(sum, signedAmount);
    }, 0);
    const input: AccountingCalculatorInput = {
      memberIds: fund.group.members.map((member) => member.userId),
      contributions,
      expenses,
      settlements,
    };
    const positionByUser = new Map(
      calculateMemberPositions(input).map((item) => [item.userId, item.positionMinor]),
    );
    const memberPositions: MemberPositionReadModel[] = fund.group.members
      .filter((member) => {
        if (member.status === MemberStatus.ACTIVE) return true;
        return !activeMembersOnly && (positionByUser.get(member.userId) ?? 0) !== 0;
      })
      .map((member) => ({
        userId: member.userId,
        displayName: member.user.displayName,
        membershipStatus: member.status.toLowerCase(),
        positionMinor: positionByUser.get(member.userId) ?? 0,
      }));

    return {
      netChangeMinor: safeAdd(contributionMinor, -expenseMinor),
      contributionMinor,
      expenseMinor,
      memberPositions,
    };
  }
}

function assertAccountingAmountsAreSafe(
  fund: SummaryFund,
  contributions: SummaryFund['contributions'],
  expenses: SummaryFund['expenses'],
  settlements: SummaryFund['settlements'],
): void {
  const positionByUser = new Map<string, number>();
  fund.group.members.forEach((member) => positionByUser.set(member.userId, 0));
  const addPosition = (userId: string, amount: number) => {
    positionByUser.set(
      userId,
      safeAdd(positionByUser.get(userId) ?? 0, amount),
    );
  };

  contributions
    .filter((item) => item.status === RecordStatus.ACTIVE)
    .forEach((item) => {
      addPosition(item.contributorUserId, safeBigIntToNumber(item.amountMinor));
    });
  expenses
    .filter((item) => item.status === RecordStatus.ACTIVE)
    .forEach((item) => {
      safeBigIntToNumber(item.amountMinor);
      const direction = expenseDirection(item.expenseType);
      item.payers.forEach((payer) => {
        addPosition(
          payer.payerUserId,
          safeBigIntToNumber(payer.amountMinor) * direction,
        );
      });
      item.splits.forEach((split) => {
        addPosition(
          split.userId,
          -safeBigIntToNumber(split.allocatedAmountMinor) * direction,
        );
      });
    });
  settlements
    .filter((item) => item.status === SettlementStatus.COMPLETED)
    .forEach((item) => {
      const amount = safeBigIntToNumber(item.amountMinor);
      addPosition(item.fromUserId, -amount);
      addPosition(item.toUserId, amount);
    });
}

function safeBigIntToNumber(value: bigint): number {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) {
    throw new InternalServerErrorException('MONEY_AMOUNT_OUT_OF_RANGE');
  }
  return converted;
}

function safeAdd(left: number, right: number): number {
  const result = left + right;
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    !Number.isSafeInteger(result)
  ) {
    throw new InternalServerErrorException('MONEY_AMOUNT_OUT_OF_RANGE');
  }
  return result;
}

function sumWithBigInt(values: number[]): number {
  const result = values.reduce((sum, value) => sum + BigInt(value), 0n);
  return safeBigIntToNumber(result);
}

function aggregatePeriodTotals(
  totals: PeriodTotals[],
  members: SummaryFund['group']['members'],
): PeriodTotals {
  const positionTotals = new Map<string, bigint>();
  const positionDetails = new Map<string, MemberPositionReadModel>();
  totals.forEach((item) => {
    item.memberPositions.forEach((position) => {
      positionDetails.set(position.userId, position);
      positionTotals.set(
        position.userId,
        (positionTotals.get(position.userId) ?? 0n) +
          BigInt(position.positionMinor),
      );
    });
  });
  members
    .filter((member) => member.status === MemberStatus.ACTIVE)
    .forEach((member) => {
      positionDetails.set(member.userId, {
        userId: member.userId,
        displayName: member.user.displayName,
        membershipStatus: member.status.toLowerCase(),
        positionMinor: 0,
      });
      if (!positionTotals.has(member.userId)) positionTotals.set(member.userId, 0n);
    });
  const memberPositions = [...positionTotals.entries()]
    .filter(([userId, position]) => {
      const member = members.find((item) => item.userId === userId);
      return member?.status === MemberStatus.ACTIVE || position !== 0n;
    })
    .map(([userId, position]) => ({
      ...positionDetails.get(userId)!,
      positionMinor: safeBigIntToNumber(position),
    }))
    .sort(
      (left, right) =>
        compareCodePoint(left.displayName, right.displayName) ||
        compareCodePoint(left.userId, right.userId),
    );
  return {
    netChangeMinor: sumWithBigInt(totals.map((item) => item.netChangeMinor)),
    contributionMinor: sumWithBigInt(totals.map((item) => item.contributionMinor)),
    expenseMinor: sumWithBigInt(totals.map((item) => item.expenseMinor)),
    memberPositions,
  };
}

function compareCodePoint(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareCompletedSettlementsLatestFirst(
  left: SummaryFund['settlements'][number],
  right: SummaryFund['settlements'][number],
): number {
  return (
    compareNullableDatesDescending(left.periodEnd, right.periodEnd) ||
    compareNullableDatesDescending(left.completedAt, right.completedAt) ||
    compareNullableDatesDescending(left.createdAt, right.createdAt) ||
    right.id.localeCompare(left.id)
  );
}

function compareNullableDatesDescending(
  left: Date | null,
  right: Date | null,
): number {
  return (
    (right?.getTime() ?? Number.NEGATIVE_INFINITY) -
    (left?.getTime() ?? Number.NEGATIVE_INFINITY)
  );
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number): Date {
  const result = startOfUtcDay(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function earliestDate(values: Date[]): Date | null {
  if (values.length === 0) return null;
  return startOfUtcDay(new Date(Math.min(...values.map((value) => value.getTime()))));
}

function withinInclusive(value: Date, start: Date, end: Date): boolean {
  const timestamp = startOfUtcDay(value).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function settlementDate(
  settlement: SummaryFund['settlements'][number],
): Date | null {
  if (settlement.status !== SettlementStatus.COMPLETED) return null;
  return settlement.periodEnd ?? settlement.completedAt ?? settlement.createdAt;
}

function formatDate(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null;
}
