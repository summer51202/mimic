import { Injectable } from '@nestjs/common';
import { FundStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFundDto } from './dto/create-fund.dto';

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  createFund(groupId: string, userId: string, dto: CreateFundDto) {
    return this.prisma.fund.create({
      data: {
        groupId,
        name: dto.name,
        currency: dto.currency,
        createdById: userId,
      },
    });
  }

  listFunds(groupId: string) {
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

  async getFundDetail(fundId: string) {
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
}
