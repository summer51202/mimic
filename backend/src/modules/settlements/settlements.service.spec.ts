import {
  ExpenseType,
  RecordStatus,
  SettlementStatus,
  SettlementType,
} from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FundStatus, MemberStatus } from '@prisma/client';
import { SettlementsService } from './settlements.service';

describe('SettlementsService', () => {
  it('locks the group and validates actor, sender, and receiver before settlement write', async () => {
    const order: string[] = [];
    const tx = { $executeRaw: jest.fn().mockImplementation(() => { order.push('lock'); }),
      groupMember: { findMany: jest.fn().mockImplementation(() => { order.push('members'); return ['actor', 'from', 'to'].map((userId) => ({ userId })); }) },
      settlement: { create: jest.fn().mockImplementation(() => { order.push('write'); return { id: 'settlement-1' }; }) } };
    const prisma = { fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) }, $transaction: jest.fn((callback) => callback(tx)) };
    const service = new SettlementsService(prisma as never);
    await service.createSettlement('fund-1', 'actor', { from_user_id: 'from', to_user_id: 'to', amount_minor: 10, settlement_type: 'manual' });
    expect(prisma.fund.findFirst).toHaveBeenCalledWith({ where: { id: 'fund-1', status: FundStatus.ACTIVE }, select: { id: true, groupId: true } });
    expect(tx.groupMember.findMany).toHaveBeenCalledWith({ where: { groupId: 'group-1', userId: { in: ['actor', 'from', 'to'] }, status: MemberStatus.ACTIVE }, select: { userId: true } });
    expect(order).toEqual(['lock', 'members', 'write']);
  });

  it.each([
    [[], ForbiddenException, 'GROUP_ACCESS_DENIED'],
    [[{ userId: 'actor' }, { userId: 'from' }], NotFoundException, 'MEMBER_NOT_FOUND'],
  ])('rejects inactive settlement members before writing', async (members, error, message) => {
    const tx = { $executeRaw: jest.fn(), groupMember: { findMany: jest.fn().mockResolvedValue(members) }, settlement: { create: jest.fn() } };
    const prisma = { fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) }, $transaction: jest.fn((callback) => callback(tx)) };
    const service = new SettlementsService(prisma as never);
    await expect(service.createSettlement('fund-1', 'actor', { from_user_id: 'from', to_user_id: 'to', amount_minor: 10, settlement_type: 'manual' })).rejects.toEqual(new error(message));
    expect(tx.settlement.create).not.toHaveBeenCalled();
  });
  it('calculates settlement suggestions from member positions', async () => {
    const prisma = {
      fund: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'fund-1',
          currency: 'TWD',
          group: {
            members: [
              { userId: 'user-a', user: { displayName: 'A' } },
              { userId: 'user-b', user: { displayName: 'B' } },
            ],
          },
          contributions: [
            { contributorUserId: 'user-a', amountMinor: BigInt(1000) },
          ],
          expenses: [
            {
              expenseType: ExpenseType.FUND_EXPENSE,
              amountMinor: BigInt(600),
              payers: [{ payerUserId: 'user-a', amountMinor: BigInt(600) }],
              splits: [
                { userId: 'user-a', allocatedAmountMinor: BigInt(300) },
                { userId: 'user-b', allocatedAmountMinor: BigInt(300) },
              ],
            },
          ],
          settlements: [],
        }),
      },
    };
    const service = new SettlementsService(prisma as never);

    const suggestion = await service.getSettlementSuggestion('fund-1');

    expect(suggestion).toEqual({
      fund_id: 'fund-1',
      currency: 'TWD',
      period_start: expect.any(String),
      period_end: expect.any(String),
      suggestions: [
        {
          from_user_id: 'user-b',
          to_user_id: 'user-a',
          amount_minor: 800,
        },
      ],
    });
  });

  it('creates a pending manual settlement record', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      groupMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'owner-1' }, { userId: 'user-a' }, { userId: 'user-b' }]) },
      settlement: {
        create: jest.fn().mockResolvedValue({
          id: 'settlement-1',
          fundId: 'fund-1',
          fromUserId: 'user-b',
          toUserId: 'user-a',
          amountMinor: BigInt(650),
          periodStart: new Date('2026-04-01T00:00:00.000Z'),
          periodEnd: new Date('2026-04-30T00:00:00.000Z'),
          status: SettlementStatus.PENDING,
          settlementType: SettlementType.MANUAL,
          note: 'April settlement',
          completedAt: null,
          canceledAt: null,
        }),
      },
    };
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new SettlementsService(prisma as never);

    const settlement = await service.createSettlement('fund-1', 'owner-1', {
      from_user_id: 'user-b',
      to_user_id: 'user-a',
      amount_minor: 650,
      period_start: '2026-04-01',
      period_end: '2026-04-30',
      settlement_type: 'manual',
      note: 'April settlement',
    });

    expect(tx.settlement.create).toHaveBeenCalledWith({
      data: {
        fundId: 'fund-1',
        fromUserId: 'user-b',
        toUserId: 'user-a',
        amountMinor: BigInt(650),
        periodStart: new Date('2026-04-01T00:00:00.000Z'),
        periodEnd: new Date('2026-04-30T00:00:00.000Z'),
        status: SettlementStatus.PENDING,
        settlementType: SettlementType.MANUAL,
        note: 'April settlement',
        createdById: 'owner-1',
      },
    });
    expect(settlement.id).toBe('settlement-1');
  });

  it('rejects settlements where payer and receiver are the same user', async () => {
    const service = new SettlementsService({} as never);

    await expect(
      service.createSettlement('fund-1', 'owner-1', {
        from_user_id: 'user-a',
        to_user_id: 'user-a',
        amount_minor: 650,
        settlement_type: 'manual',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks pending settlements as completed with completed_at', async () => {
    const prisma = {
      settlement: {
        update: jest.fn().mockResolvedValue({
          id: 'settlement-1',
          status: SettlementStatus.COMPLETED,
          completedAt: new Date('2026-04-13T12:00:00.000Z'),
        }),
      },
    };
    const service = new SettlementsService(prisma as never);

    await service.completeSettlement('settlement-1', {
      completed_at: '2026-04-13T12:00:00.000Z',
    });

    expect(prisma.settlement.update).toHaveBeenCalledWith({
      where: { id: 'settlement-1' },
      data: {
        status: SettlementStatus.COMPLETED,
        completedAt: new Date('2026-04-13T12:00:00.000Z'),
      },
    });
  });

  it('lists fund settlements newest first', async () => {
    const prisma = {
      settlement: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new SettlementsService(prisma as never);

    await service.listSettlements('fund-1');

    expect(prisma.settlement.findMany).toHaveBeenCalledWith({
      where: { fundId: 'fund-1' },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
    });
  });
});
