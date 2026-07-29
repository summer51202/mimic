import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FundStatus, GroupStatus, MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFundDto } from './dto/create-fund.dto';

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFund(groupId: string, userId: string, dto: CreateFundDto) {
    await this.assertActiveGroupMember(groupId, userId);
    return this.prisma.fund.create({
      data: {
        groupId,
        name: dto.name,
        currency: dto.currency,
        createdById: userId,
      },
    });
  }

  async listFunds(groupId: string, userId: string) {
    await this.assertActiveGroupMember(groupId, userId);
    return this.prisma.fund.findMany({
      where: {
        groupId,
        status: FundStatus.ACTIVE,
      },
      include: {
        contributions: true,
        expenses: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getFundDetail(fundId: string, userId: string) {
    const fundAccess = await this.prisma.fund.findFirst({
      where: { id: fundId, status: FundStatus.ACTIVE },
      select: { groupId: true },
    });

    if (!fundAccess) {
      return null;
    }

    await this.assertActiveGroupMember(fundAccess.groupId, userId);

    const fund = await this.prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        contributions: true,
        expenses: true,
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!fund) {
      return null;
    }

    return fund;
  }

  private async assertActiveGroupMember(groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, status: GroupStatus.ACTIVE },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    const member = await this.prisma.groupMember.findFirst({
      where: { groupId, userId, status: MemberStatus.ACTIVE },
      select: { userId: true },
    });

    if (!member) {
      throw new ForbiddenException('GROUP_ACCESS_DENIED');
    }
  }
}
