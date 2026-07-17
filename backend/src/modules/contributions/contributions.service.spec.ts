import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ContributionType, FundStatus, MemberStatus, RecordStatus } from '@prisma/client';
import { ContributionsService } from './contributions.service';

describe('ContributionsService', () => {
  it('locks the group and validates active actor and contributor before writing', async () => {
    const order: string[] = [];
    const tx = {
      $executeRaw: jest.fn().mockImplementation(() => { order.push('lock'); }),
      groupMember: {
        findMany: jest.fn().mockImplementation(() => {
          order.push('members');
          return [{ userId: 'user-1' }, { userId: 'user-2' }];
        }),
      },
      contribution: {
        create: jest.fn().mockImplementation(() => {
          order.push('write');
          return { id: 'contribution-1' };
        }),
      },
    };
    const prisma = {
      fund: {
        findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ContributionsService(prisma as never);

    await service.createContribution('fund-1', 'user-1', {
      contributor_user_id: 'user-2', amount_minor: 5000,
      contribution_type: 'one_time', occurred_on: '2026-04-13',
    });

    expect(prisma.fund.findFirst).toHaveBeenCalledWith({
      where: { id: 'fund-1', status: FundStatus.ACTIVE },
      select: { id: true, groupId: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.groupMember.findMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1', userId: { in: ['user-1', 'user-2'] }, status: MemberStatus.ACTIVE },
      select: { userId: true },
    });
    expect(order).toEqual(['lock', 'members', 'write']);
  });

  it.each([
    ['actor', [], ForbiddenException, 'GROUP_ACCESS_DENIED'],
    ['contributor', [{ userId: 'user-1' }], NotFoundException, 'MEMBER_NOT_FOUND'],
  ])('rejects an inactive %s before writing', async (_label, members, error, message) => {
    const tx = {
      $executeRaw: jest.fn(),
      groupMember: { findMany: jest.fn().mockResolvedValue(members) },
      contribution: { create: jest.fn() },
    };
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ContributionsService(prisma as never);

    await expect(service.createContribution('fund-1', 'user-1', {
      contributor_user_id: 'user-2', amount_minor: 5000,
      contribution_type: 'one_time', occurred_on: '2026-04-13',
    })).rejects.toEqual(new error(message));
    expect(tx.contribution.create).not.toHaveBeenCalled();
  });
  it('creates an active contribution for a fund and actor', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      groupMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]) },
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
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ContributionsService(prisma as never);

    const result = await service.createContribution('fund-1', 'user-1', {
      contributor_user_id: 'user-2',
      amount_minor: 5000,
      contribution_type: 'one_time',
      occurred_on: '2026-04-13',
      note: 'April deposit',
    });

    expect(tx.contribution.create).toHaveBeenCalledWith({
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
