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
} = {}) => ({
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
});

describe('FundsService', () => {
  it('rejects fund creation when the actor is not an active group member', async () => {
    const prisma = createPrisma({ member: null });
    const service = new FundsService(prisma as never);

    await expect(
      service.createFund('group-1', 'outsider', {
        name: 'Date Fund',
        currency: 'TWD',
      }),
    ).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));

    expect(prisma.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
      select: { id: true },
    });
    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'outsider',
        status: MemberStatus.ACTIVE,
      },
      select: { userId: true },
    });
    expect(prisma.fund.create).not.toHaveBeenCalled();
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
