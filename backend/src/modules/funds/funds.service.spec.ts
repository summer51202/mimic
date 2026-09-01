import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FundStatus, GroupStatus, MemberStatus } from '@prisma/client';
import { FundsService } from './funds.service';

const createPrisma = ({
  group = { id: 'group-1', status: GroupStatus.ACTIVE },
  member = { userId: 'actor' },
  fund = null,
}: {
  group?: { id: string; status: GroupStatus } | null;
  member?: { userId: string } | null;
  fund?: { id: string; groupId: string } | null;
} = {}) => {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(0),
    group: { findFirst: jest.fn().mockResolvedValue(group) },
    groupMember: { findFirst: jest.fn().mockResolvedValue(member) },
    fund: {
      create: jest.fn().mockResolvedValue({
        id: 'fund-1',
        groupId: 'group-1',
        name: 'Date Fund',
        currency: 'TWD',
        status: FundStatus.ACTIVE,
      }),
    },
  };
  const root = {
    group: { findFirst: jest.fn().mockResolvedValue(group) },
    groupMember: { findFirst: jest.fn().mockResolvedValue(member) },
    fund: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'fund-1',
          groupId: 'group-1',
          name: 'Date Fund',
          currency: 'TWD',
          status: FundStatus.ACTIVE,
          contributions: [],
          expenses: [],
        },
      ]),
      findFirst: jest
        .fn()
        .mockResolvedValue(fund ? { groupId: fund.groupId } : null),
      findUnique: jest.fn().mockResolvedValue(fund),
    },
  };
  return {
    ...root,
    $transaction: jest.fn((callback) => callback(tx)),
    tx,
  };
};

describe('FundsService', () => {
  it('locks and revalidates the active group membership before creating a fund', async () => {
    const prisma = createPrisma();
    const service = new FundsService(prisma as never);

    await service.createFund('group-1', 'actor', {
      name: 'Date Fund',
      currency: 'TWD',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.tx.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
      select: { id: true },
    });
    expect(prisma.tx.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'actor',
        status: MemberStatus.ACTIVE,
      },
      select: { userId: true },
    });
    expect(prisma.tx.fund.create).toHaveBeenCalledWith({
      data: {
        groupId: 'group-1',
        name: 'Date Fund',
        currency: 'TWD',
        createdById: 'actor',
      },
    });
    expect(prisma.tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.tx.group.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('rejects fund creation when the group is archived after waiting for the lock', async () => {
    const prisma = createPrisma({ group: null });
    const service = new FundsService(prisma as never);

    await expect(
      service.createFund('group-1', 'actor', {
        name: 'Date Fund',
        currency: 'TWD',
      }),
    ).rejects.toEqual(new NotFoundException('GROUP_NOT_FOUND'));

    expect(prisma.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.tx.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
      select: { id: true },
    });
    expect(prisma.tx.groupMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.tx.fund.create).not.toHaveBeenCalled();
  });

  it('rejects fund creation when the actor is not an active group member', async () => {
    const prisma = createPrisma({ member: null });
    const service = new FundsService(prisma as never);

    await expect(
      service.createFund('group-1', 'outsider', {
        name: 'Date Fund',
        currency: 'TWD',
      }),
    ).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));

    expect(prisma.tx.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
      select: { id: true },
    });
    expect(prisma.tx.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'outsider',
        status: MemberStatus.ACTIVE,
      },
      select: { userId: true },
    });
    expect(prisma.tx.fund.create).not.toHaveBeenCalled();
  });

  it('lets an active member list active funds in their group', async () => {
    const prisma = createPrisma();
    const service = new FundsService(prisma as never);

    const funds = await service.listFunds('group-1', 'actor');

    expect(funds).toHaveLength(1);
    expect(prisma.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
      select: { id: true },
    });
    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'actor',
        status: MemberStatus.ACTIVE,
      },
      select: { userId: true },
    });
    expect(prisma.fund.findMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1', status: FundStatus.ACTIVE },
      include: { contributions: true, expenses: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('returns GROUP_NOT_FOUND before membership checks for inactive or missing groups', async () => {
    const prisma = createPrisma({ group: null });
    const service = new FundsService(prisma as never);

    await expect(service.listFunds('group-1', 'actor')).rejects.toEqual(
      new NotFoundException('GROUP_NOT_FOUND'),
    );

    expect(prisma.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
      select: { id: true },
    });
    expect(prisma.groupMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.fund.findMany).not.toHaveBeenCalled();
  });

  it('guards legacy fund detail through the owning group membership', async () => {
    const prisma = createPrisma({
      fund: { id: 'fund-1', groupId: 'group-1' },
      member: null,
    });
    const service = new FundsService(prisma as never);

    await expect(service.getFundDetail('fund-1', 'outsider')).rejects.toEqual(
      new ForbiddenException('GROUP_ACCESS_DENIED'),
    );

    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'outsider',
        status: MemberStatus.ACTIVE,
      },
      select: { userId: true },
    });
  });
});
