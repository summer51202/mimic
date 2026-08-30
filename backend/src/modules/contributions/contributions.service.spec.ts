import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
      settlement: {
        findFirst: jest.fn().mockImplementation(() => {
          order.push('period');
          return null;
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
    expect(order).toEqual(['lock', 'members', 'period', 'write']);
  });

  it.each([
    ['actor', [], ForbiddenException, 'GROUP_ACCESS_DENIED'],
    ['contributor', [{ userId: 'user-1' }], NotFoundException, 'MEMBER_NOT_FOUND'],
  ])('rejects an inactive %s before writing', async (_label, members, error, message) => {
    const tx = {
      $executeRaw: jest.fn(),
      groupMember: { findMany: jest.fn().mockResolvedValue(members) },
      settlement: { findFirst: jest.fn().mockResolvedValue(null) },
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
    expect(tx.settlement.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a correction in a completed settlement period before writing', async () => {
    const order: string[] = [];
    const tx = {
      $executeRaw: jest.fn().mockImplementation(() => { order.push('lock'); }),
      groupMember: {
        findMany: jest.fn().mockImplementation(() => {
          order.push('members');
          return [{ userId: 'user-1' }, { userId: 'user-2' }];
        }),
      },
      settlement: {
        findFirst: jest.fn().mockImplementation(() => {
          order.push('period');
          return { id: 'settlement-1' };
        }),
      },
      contribution: { create: jest.fn() },
    };
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ContributionsService(prisma as never);

    await expect(service.createContribution('fund-1', 'user-1', {
      contributor_user_id: 'user-2', amount_minor: 5000,
      contribution_type: 'correction', occurred_on: '2026-08-30',
    })).rejects.toEqual(new ConflictException('LOCKED_PERIOD'));

    expect(order).toEqual(['lock', 'members', 'period']);
    expect(tx.contribution.create).not.toHaveBeenCalled();
  });

  it('creates an active contribution for a fund and actor', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      groupMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]) },
      settlement: { findFirst: jest.fn().mockResolvedValue(null) },
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
      fund: {
        findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      },
      contribution: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ContributionsService(prisma as never);

    await service.listContributions('fund-1', 'user-1', { page: 2, page_size: 3, sort: 'occurred_on_asc' });

    expect(prisma.fund.findFirst).toHaveBeenCalledWith({
      where: { id: 'fund-1', status: FundStatus.ACTIVE },
      select: { id: true, groupId: true },
    });
    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: { groupId: 'group-1', userId: 'user-1', status: MemberStatus.ACTIVE },
      select: { userId: true },
    });

    expect(prisma.contribution.findMany).toHaveBeenCalledWith({
      where: {
        fundId: 'fund-1',
        status: RecordStatus.ACTIVE,
      },
      orderBy: [{ occurredOn: 'asc' }, { id: 'asc' }],
      skip: 3,
      take: 3,
    });
  });

  it('rejects contribution list reads when the actor is not an active group member', async () => {
    const prisma = {
      fund: {
        findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      contribution: {
        findMany: jest.fn(),
      },
    };
    const service = new ContributionsService(prisma as never);

    await expect(
      service.listContributions('fund-1', 'outsider', { page: 1, page_size: 50, sort: 'occurred_on_desc' }),
    ).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));
    expect(prisma.contribution.findMany).not.toHaveBeenCalled();
  });

  it('returns FUND_NOT_FOUND before checking membership for missing contribution funds', async () => {
    const prisma = {
      fund: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      groupMember: {
        findFirst: jest.fn(),
      },
      contribution: {
        findMany: jest.fn(),
      },
    };
    const service = new ContributionsService(prisma as never);

    await expect(
      service.listContributions('missing-fund', 'user-1'),
    ).rejects.toEqual(new NotFoundException('FUND_NOT_FOUND'));
    expect(prisma.groupMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.contribution.findMany).not.toHaveBeenCalled();
  });
});
