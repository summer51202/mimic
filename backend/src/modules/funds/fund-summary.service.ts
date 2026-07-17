import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FundStatus,
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
  MemberPositionReadModel,
  PeriodTotals,
} from './fund-summary.types';

const summaryInclude = Prisma.validator<Prisma.FundInclude>()({
  group: {
    include: {
      members: { include: { user: { select: { displayName: true } } } },
    },
  },
  contributions: true,
  expenses: { include: { payers: true, splits: true } },
  settlements: true,
});

type SummaryFund = Prisma.FundGetPayload<{ include: typeof summaryInclude }>;

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

  private async getFundSummaryInTransaction(
    tx: Prisma.TransactionClient,
    fundId: string,
    actorUserId: string,
  ): Promise<FundSummaryReadModel> {
    const fund = await tx.fund.findFirst({
      where: { id: fundId, status: FundStatus.ACTIVE },
      include: summaryInclude,
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
      .sort(
        (left, right) =>
          right.periodEnd!.getTime() - left.periodEnd!.getTime(),
      );
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
      fund.settlements,
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

  private buildTotals(
    fund: SummaryFund,
    contributions: SummaryFund['contributions'],
    expenses: SummaryFund['expenses'],
    settlements: SummaryFund['settlements'],
    activeMembersOnly: boolean,
  ): PeriodTotals {
    const contributionMinor = contributions.reduce(
      (sum, item) => sum + Number(item.amountMinor),
      0,
    );
    const expenseMinor = expenses.reduce(
      (sum, item) =>
        sum + Number(item.amountMinor) * expenseDirection(item.expenseType),
      0,
    );
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
      netChangeMinor: contributionMinor - expenseMinor,
      contributionMinor,
      expenseMinor,
      memberPositions,
    };
  }
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
