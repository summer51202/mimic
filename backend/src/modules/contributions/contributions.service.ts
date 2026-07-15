import { Injectable } from '@nestjs/common';
import { ContributionType, RecordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  createContribution(
    fundId: string,
    actorUserId: string,
    dto: CreateContributionDto,
  ) {
    return this.prisma.contribution.create({
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
  }

  listContributions(fundId: string) {
    return this.prisma.contribution.findMany({
      where: {
        fundId,
        status: RecordStatus.ACTIVE,
      },
      orderBy: [{ occurredOn: 'desc' }, { createdAt: 'desc' }],
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
