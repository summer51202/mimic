import { ContributionType, RecordStatus } from '@prisma/client';
import { ContributionsService } from './contributions.service';

describe('ContributionsService', () => {
  it('creates an active contribution for a fund and actor', async () => {
    const prisma = {
      contribution: {
        create: jest.fn().mockResolvedValue({
          id: 'contribution-1',
          fundId: 'fund-1',
          contributorUserId: 'user-2',
          amountMinor: BigInt(5000),
          contributionType: ContributionType.ONE_TIME,
          note: 'April deposit',
          occurredOn: new Date('2026-04-13T00:00:00.000Z'),
          status: RecordStatus.ACTIVE,
        }),
      },
    };
    const service = new ContributionsService(prisma as never);

    const result = await service.createContribution('fund-1', 'user-1', {
      contributor_user_id: 'user-2',
      amount_minor: 5000,
      contribution_type: 'one_time',
      occurred_on: '2026-04-13',
      note: 'April deposit',
    });

    expect(prisma.contribution.create).toHaveBeenCalledWith({
      data: {
        fundId: 'fund-1',
        contributorUserId: 'user-2',
        amountMinor: BigInt(5000),
        contributionType: ContributionType.ONE_TIME,
        occurredOn: new Date('2026-04-13T00:00:00.000Z'),
        note: 'April deposit',
        createdById: 'user-1',
        updatedById: 'user-1',
      },
    });
    expect(result.id).toBe('contribution-1');
  });

  it('lists active fund contributions newest first', async () => {
    const prisma = {
      contribution: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ContributionsService(prisma as never);

    await service.listContributions('fund-1');

    expect(prisma.contribution.findMany).toHaveBeenCalledWith({
      where: {
        fundId: 'fund-1',
        status: RecordStatus.ACTIVE,
      },
      orderBy: [{ occurredOn: 'desc' }, { createdAt: 'desc' }],
    });
  });
});
