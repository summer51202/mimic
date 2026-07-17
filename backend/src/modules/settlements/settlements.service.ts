import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExpenseType,
  FundStatus,
  MemberStatus,
  Prisma,
  SettlementStatus,
  SettlementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lockGroupMutation } from '../prisma/group-mutation-lock';
import { CompleteSettlementDto } from './dto/complete-settlement.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';

interface MemberPosition {
  userId: string;
  positionMinor: number;
}

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettlementSuggestion(fundId: string) {
    const fund = await this.prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        contributions: true,
        expenses: {
          include: {
            payers: true,
            splits: true,
          },
        },
        settlements: true,
      },
    });

    if (!fund) {
      return {
        fund_id: fundId,
        currency: 'TWD',
        period_start: this.currentMonthStart(),
        period_end: this.currentMonthEnd(),
        suggestions: [],
      };
    }

    const positions = this.calculatePositions({
      memberIds: fund.group.members.map((member) => member.userId),
      contributions: fund.contributions,
      expenses: fund.expenses,
      settlements: fund.settlements,
    });
    const normalizedPositions = this.normalizeAgainstEqualFundShare(positions);

    return {
      fund_id: fund.id,
      currency: fund.currency,
      period_start: this.currentMonthStart(),
      period_end: this.currentMonthEnd(),
      suggestions: this.buildSuggestions(normalizedPositions),
    };
  }

  async createSettlement(
    fundId: string,
    actorUserId: string,
    dto: CreateSettlementDto,
  ) {
    if (dto.from_user_id === dto.to_user_id) {
      throw new BadRequestException('INVALID_SETTLEMENT_USERS');
    }
    const fund = await this.requireActiveFund(fundId);

    return this.prisma.$transaction(async (tx) => {
      await lockGroupMutation(tx, fund.groupId);
      await this.requireActiveMembers(tx, fund.groupId, actorUserId, [dto.from_user_id, dto.to_user_id]);
      return tx.settlement.create({
        data: {
          fundId,
          fromUserId: dto.from_user_id,
          toUserId: dto.to_user_id,
          amountMinor: BigInt(dto.amount_minor),
          periodStart: dto.period_start ? this.toUtcDate(dto.period_start) : null,
          periodEnd: dto.period_end ? this.toUtcDate(dto.period_end) : null,
          status: SettlementStatus.PENDING,
          settlementType: this.mapSettlementType(dto.settlement_type ?? 'manual'),
          note: dto.note,
          createdById: actorUserId,
        },
      });
    });
  }

  private async requireActiveFund(fundId: string) {
    const fund = await this.prisma.fund.findFirst({
      where: { id: fundId, status: FundStatus.ACTIVE },
      select: { id: true, groupId: true },
    });
    if (!fund) throw new NotFoundException('FUND_NOT_FOUND');
    return fund;
  }

  private async requireActiveMembers(tx: Prisma.TransactionClient, groupId: string, actorUserId: string, participantIds: string[]) {
    const userIds = [...new Set([actorUserId, ...participantIds])];
    const members = await tx.groupMember.findMany({
      where: { groupId, userId: { in: userIds }, status: MemberStatus.ACTIVE },
      select: { userId: true },
    });
    const activeIds = new Set(members.map((member) => member.userId));
    if (!activeIds.has(actorUserId)) throw new ForbiddenException('GROUP_ACCESS_DENIED');
    if (participantIds.some((userId) => !activeIds.has(userId))) throw new NotFoundException('MEMBER_NOT_FOUND');
  }

  listSettlements(fundId: string, take = 20) {
    return this.prisma.settlement.findMany({
      where: { fundId },
      orderBy: [{ createdAt: 'desc' }],
      take,
    });
  }

  getSettlement(settlementId: string) {
    return this.prisma.settlement.findUnique({
      where: { id: settlementId },
    });
  }

  completeSettlement(settlementId: string, dto: CompleteSettlementDto) {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        select: { fund: { select: { groupId: true } } },
      });
      if (!settlement) {
        throw new NotFoundException('SETTLEMENT_NOT_FOUND');
      }

      await lockGroupMutation(tx, settlement.fund.groupId);

      const lockedSettlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        select: { status: true },
      });
      if (!lockedSettlement) {
        throw new NotFoundException('SETTLEMENT_NOT_FOUND');
      }
      if (lockedSettlement.status !== SettlementStatus.PENDING) {
        throw new ConflictException('SETTLEMENT_NOT_PENDING');
      }

      return tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.COMPLETED,
          completedAt: dto.completed_at ? new Date(dto.completed_at) : new Date(),
        },
      });
    });
  }

  cancelSettlement(settlementId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        select: { fund: { select: { groupId: true } } },
      });
      if (!settlement) {
        throw new NotFoundException('SETTLEMENT_NOT_FOUND');
      }

      await lockGroupMutation(tx, settlement.fund.groupId);

      const lockedSettlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        select: { status: true },
      });
      if (!lockedSettlement) {
        throw new NotFoundException('SETTLEMENT_NOT_FOUND');
      }
      if (lockedSettlement.status !== SettlementStatus.PENDING) {
        throw new ConflictException('SETTLEMENT_NOT_PENDING');
      }

      return tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.CANCELED,
          canceledAt: new Date(),
        },
      });
    });
  }

  private calculatePositions(input: {
    memberIds: string[];
    contributions: Array<{
      contributorUserId: string;
      amountMinor: bigint;
    }>;
    expenses: Array<{
      expenseType: ExpenseType;
      amountMinor: bigint;
      payers: Array<{ payerUserId: string; amountMinor: bigint }>;
      splits: Array<{ userId: string; allocatedAmountMinor: bigint }>;
    }>;
    settlements: Array<{
      fromUserId: string;
      toUserId: string;
      amountMinor: bigint;
      status: SettlementStatus;
    }>;
  }): MemberPosition[] {
    const positionByUser = new Map<string, number>();
    input.memberIds.forEach((userId) => positionByUser.set(userId, 0));

    const addPosition = (userId: string, amount: number) => {
      positionByUser.set(userId, (positionByUser.get(userId) ?? 0) + amount);
    };

    input.contributions.forEach((contribution) => {
      addPosition(contribution.contributorUserId, Number(contribution.amountMinor));
    });

    input.expenses.forEach((expense) => {
      const sign = expense.expenseType === ExpenseType.REFUND ? -1 : 1;

      expense.payers.forEach((payer) => {
        addPosition(payer.payerUserId, Number(payer.amountMinor) * sign);
      });
      expense.splits.forEach((split) => {
        addPosition(split.userId, -Number(split.allocatedAmountMinor) * sign);
      });
    });

    input.settlements
      .filter((settlement) => settlement.status === SettlementStatus.COMPLETED)
      .forEach((settlement) => {
        addPosition(settlement.fromUserId, -Number(settlement.amountMinor));
        addPosition(settlement.toUserId, Number(settlement.amountMinor));
      });

    return Array.from(positionByUser.entries()).map(([userId, positionMinor]) => ({
      userId,
      positionMinor,
    }));
  }

  private buildSuggestions(positions: MemberPosition[]) {
    const creditors = positions
      .filter((position) => position.positionMinor > 0)
      .sort((a, b) => b.positionMinor - a.positionMinor);
    const debtors = positions
      .filter((position) => position.positionMinor < 0)
      .map((position) => ({
        userId: position.userId,
        debtMinor: -position.positionMinor,
      }))
      .sort((a, b) => b.debtMinor - a.debtMinor);
    const suggestions: Array<{
      from_user_id: string;
      to_user_id: string;
      amount_minor: number;
    }> = [];

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = Math.min(debtor.debtMinor, creditor.positionMinor);

      if (amount > 0) {
        suggestions.push({
          from_user_id: debtor.userId,
          to_user_id: creditor.userId,
          amount_minor: amount,
        });
      }

      debtor.debtMinor -= amount;
      creditor.positionMinor -= amount;

      if (debtor.debtMinor === 0) {
        debtorIndex += 1;
      }
      if (creditor.positionMinor === 0) {
        creditorIndex += 1;
      }
    }

    return suggestions;
  }

  private normalizeAgainstEqualFundShare(
    positions: MemberPosition[],
  ): MemberPosition[] {
    if (positions.length === 0) {
      return [];
    }

    const totalPosition = positions.reduce(
      (sum, position) => sum + position.positionMinor,
      0,
    );
    const baseTargetShare = Math.floor(totalPosition / positions.length);
    let remainingRemainder = totalPosition - baseTargetShare * positions.length;
    let normalizedTotal = 0;

    return positions.map((position, index) => {
      const targetShare =
        baseTargetShare + (remainingRemainder > 0 ? 1 : 0);
      if (remainingRemainder > 0) {
        remainingRemainder -= 1;
      }

      const isLast = index === positions.length - 1;
      const normalizedPosition = isLast
        ? -normalizedTotal
        : position.positionMinor - targetShare;

      normalizedTotal += normalizedPosition;

      return {
        userId: position.userId,
        positionMinor: normalizedPosition,
      };
    });
  }

  private mapSettlementType(type: 'manual' | 'scheduled') {
    return type === 'scheduled' ? SettlementType.SCHEDULED : SettlementType.MANUAL;
  }

  private toUtcDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private currentMonthStart() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
  }

  private currentMonthEnd() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);
  }
}
