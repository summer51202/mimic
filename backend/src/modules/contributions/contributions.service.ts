import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributionType, FundStatus, MemberStatus, Prisma, RecordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lockGroupMutation } from '../prisma/group-mutation-lock';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ActivityQueryDto } from '../../common/dto/activity-query.dto';

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createContribution(
    fundId: string,
    actorUserId: string,
    dto: CreateContributionDto,
  ) {
    const fund = await this.requireActiveFund(fundId);

    return this.prisma.$transaction(async (tx) => {
      await lockGroupMutation(tx, fund.groupId);
      await this.requireActiveMembers(
        tx,
        fund.groupId,
        actorUserId,
        [dto.contributor_user_id],
      );

      return tx.contribution.create({
        data: {
          fundId,
          contributorUserId: dto.contributor_user_id,
          amountMinor: BigInt(dto.amount_minor),
          contributionType: this.mapContributionType(dto.contribution_type),
          occurredOn: this.toUtcDate(dto.occurred_on),
          note: dto.note,
          createdById: actorUserId,
          updatedById: actorUserId,
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
    const activeIds = new Set(members.map((member: { userId: string }) => member.userId));
    if (!activeIds.has(actorUserId)) throw new ForbiddenException('GROUP_ACCESS_DENIED');
    if (participantIds.some((userId) => !activeIds.has(userId))) throw new NotFoundException('MEMBER_NOT_FOUND');
  }

  listContributions(fundId: string, query: ActivityQueryDto = new ActivityQueryDto()) {
    const direction = query.sort === 'occurred_on_asc' ? 'asc' : 'desc';
    return this.prisma.contribution.findMany({
      where: {
        fundId,
        status: RecordStatus.ACTIVE,
      },
      orderBy: [{ occurredOn: direction }, { id: direction }],
      skip: (query.page - 1) * query.page_size,
      take: query.page_size,
    });
  }

  private mapContributionType(type: CreateContributionDto['contribution_type']) {
    const contributionTypes: Record<
      CreateContributionDto['contribution_type'],
      ContributionType
    > = {
      regular: ContributionType.REGULAR,
      one_time: ContributionType.ONE_TIME,
      adjustment: ContributionType.ADJUSTMENT,
      correction: ContributionType.CORRECTION,
    };

    return contributionTypes[type];
  }

  private toUtcDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }
}
