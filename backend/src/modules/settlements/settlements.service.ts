import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FundStatus,
  MemberStatus,
  Prisma,
  SettlementStatus,
  SettlementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lockGroupMutation } from '../prisma/group-mutation-lock';
import {
  buildSettlementSuggestions,
  calculateMemberPositions,
  normalizeAgainstEqualFundShare,
} from '../accounting/accounting-calculator';
import { CompleteSettlementDto } from './dto/complete-settlement.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettlementSuggestion(fundId: string, actorUserId: string) {
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

    await this.requireActiveGroupMember(this.prisma, fund.group.id, actorUserId);

    const positions = calculateMemberPositions({
      memberIds: fund.group.members.map((member) => member.userId),
      contributions: fund.contributions,
      expenses: fund.expenses,
      settlements: fund.settlements,
    });
    const normalizedPositions = normalizeAgainstEqualFundShare(positions);

    return {
      fund_id: fund.id,
      currency: fund.currency,
      period_start: this.currentMonthStart(),
      period_end: this.currentMonthEnd(),
      suggestions: buildSettlementSuggestions(normalizedPositions).map((suggestion) => ({
        ...suggestion,
        amount_minor: suggestion.amount_minor.toString(),
      })),
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
    const periodStart = dto.period_start ? this.toUtcDate(dto.period_start) : null;
    const periodEnd = dto.period_end ? this.toUtcDate(dto.period_end) : null;
    if (periodStart && periodEnd && periodStart > periodEnd) {
      throw new BadRequestException('INVALID_SETTLEMENT_PERIOD');
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
          periodStart,
          periodEnd,
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

  private async requireActiveGroupMember(
    client: Prisma.TransactionClient | PrismaService,
    groupId: string,
    actorUserId: string,
  ) {
    const member = await client.groupMember.findFirst({
      where: { groupId, userId: actorUserId, status: MemberStatus.ACTIVE },
      select: { userId: true },
    });
    if (!member) throw new ForbiddenException('GROUP_ACCESS_DENIED');
  }

  async listSettlements(fundId: string, actorUserId: string, take = 20) {
    const fund = await this.requireActiveFund(fundId);
    await this.requireActiveGroupMember(this.prisma, fund.groupId, actorUserId);

    return this.prisma.settlement.findMany({
      where: { fundId },
      orderBy: [{ createdAt: 'desc' }],
      take,
    });
  }

  async getSettlement(settlementId: string, actorUserId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { fund: { select: { groupId: true } } },
    });
    if (!settlement) {
      throw new NotFoundException('SETTLEMENT_NOT_FOUND');
    }
    await this.requireActiveGroupMember(this.prisma, settlement.fund.groupId, actorUserId);
    return settlement;
  }

  completeSettlement(settlementId: string, actorUserId: string, dto: CompleteSettlementDto) {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        select: { fund: { select: { groupId: true } } },
      });
      if (!settlement) {
        throw new NotFoundException('SETTLEMENT_NOT_FOUND');
      }

      await lockGroupMutation(tx, settlement.fund.groupId);
      await this.requireActiveGroupMember(tx, settlement.fund.groupId, actorUserId);

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

  cancelSettlement(settlementId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        select: { fund: { select: { groupId: true } } },
      });
      if (!settlement) {
        throw new NotFoundException('SETTLEMENT_NOT_FOUND');
      }

      await lockGroupMutation(tx, settlement.fund.groupId);
      await this.requireActiveGroupMember(tx, settlement.fund.groupId, actorUserId);

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
