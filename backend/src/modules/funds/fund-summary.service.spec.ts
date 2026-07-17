import {
  ExpenseType,
  FundStatus,
  MemberStatus,
  RecordStatus,
  SettlementStatus,
} from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FundSummaryService } from './fund-summary.service';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

const makeFund = (overrides: Record<string, unknown> = {}) => ({
  id: 'fund-1',
  groupId: 'group-1',
  name: 'Household',
  currency: 'TWD',
  status: FundStatus.ACTIVE,
  group: {
    members: [
      { userId: 'actor', status: MemberStatus.ACTIVE, user: { displayName: 'Alex' } },
      { userId: 'former', status: MemberStatus.REMOVED, user: { displayName: 'Former' } },
    ],
  },
  contributions: [],
  expenses: [],
  settlements: [],
  ...overrides,
});

const makeService = (fund: ReturnType<typeof makeFund> | null) => {
  const tx = { fund: { findFirst: jest.fn().mockResolvedValue(fund) } };
  const prisma = {
    $transaction: jest.fn((callback, options) => callback(tx, options)),
  };
  return { service: new FundSummaryService(prisma as never), prisma, tx };
};

describe('FundSummaryService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(day('2026-07-17')));
  afterEach(() => jest.useRealTimers());

  it('starts current period one UTC day after the latest completed settlement', async () => {
    const { service } = makeService(makeFund({
      settlements: [
        { id: 'old', fromUserId: 'actor', toUserId: 'former', amountMinor: 10n, status: SettlementStatus.COMPLETED, periodEnd: day('2026-06-10'), completedAt: day('2026-06-10'), createdAt: day('2026-06-10') },
        { id: 'latest', fromUserId: 'actor', toUserId: 'former', amountMinor: 20n, status: SettlementStatus.COMPLETED, periodEnd: day('2026-06-30'), completedAt: day('2026-06-30'), createdAt: day('2026-06-30') },
      ],
    }));

    const result = await service.getFundSummary('fund-1', 'actor');

    expect(result.currentPeriod).toEqual({
      periodStart: '2026-07-01', periodEnd: '2026-07-17',
      lastCompletedSettlementId: 'latest', lastCompletedPeriodEnd: '2026-06-30',
    });
  });

  it('falls back to the first transaction and ignores pending or canceled boundaries', async () => {
    const { service } = makeService(makeFund({
      contributions: [{ contributorUserId: 'actor', amountMinor: 100n, occurredOn: day('2026-05-03'), status: RecordStatus.ACTIVE }],
      expenses: [{ expenseType: ExpenseType.FUND_EXPENSE, amountMinor: 40n, occurredOn: day('2026-05-01'), status: RecordStatus.ACTIVE, payers: [], splits: [] }],
      settlements: [
        { id: 'pending', fromUserId: 'actor', toUserId: 'former', amountMinor: 10n, status: SettlementStatus.PENDING, periodEnd: day('2026-06-30'), completedAt: null, createdAt: day('2026-04-01') },
        { id: 'canceled', fromUserId: 'actor', toUserId: 'former', amountMinor: 10n, status: SettlementStatus.CANCELED, periodEnd: day('2026-07-01'), completedAt: null, createdAt: day('2026-04-02') },
      ],
    }));

    const result = await service.getFundSummary('fund-1', 'actor');
    expect(result.currentPeriod.periodStart).toBe('2026-05-01');
  });

  it('uses a completed settlement date as the fallback first transaction', async () => {
    const { service } = makeService(makeFund({
      settlements: [
        { id: 'completed', fromUserId: 'actor', toUserId: 'former', amountMinor: 10n, status: SettlementStatus.COMPLETED, periodEnd: null, completedAt: day('2026-05-04'), createdAt: day('2026-05-01') },
      ],
    }));

    const result = await service.getFundSummary('fund-1', 'actor');

    expect(result.currentPeriod.periodStart).toBe('2026-05-04');
  });

  it('returns an empty current period when settlement is completed through today', async () => {
    const { service } = makeService(makeFund({ settlements: [
      { id: 'today', fromUserId: 'actor', toUserId: 'former', amountMinor: 10n, status: SettlementStatus.COMPLETED, periodEnd: day('2026-07-17'), completedAt: day('2026-07-17'), createdAt: day('2026-07-17') },
    ] }));
    const result = await service.getFundSummary('fund-1', 'actor');
    expect(result.currentPeriod.periodStart).toBeNull();
    expect(result.currentPeriod.periodEnd).toBeNull();
    expect(result.current.netChangeMinor).toBe(0);
  });

  it('returns stable zero totals and null dates for a fund without transactions', async () => {
    const { service } = makeService(makeFund());
    const result = await service.getFundSummary('fund-1', 'actor');
    expect(result.currentPeriod.periodStart).toBeNull();
    expect(result.currentPeriod.periodEnd).toBeNull();
    expect(result.fund.cashBalanceMinor).toBe(0);
    expect(result.current).toMatchObject({ netChangeMinor: 0, contributionMinor: 0, expenseMinor: 0 });
    expect(result.allTime).toMatchObject({ netChangeMinor: 0, contributionMinor: 0, expenseMinor: 0 });
  });

  it('keeps all-time cash separate from current net change and settlements affect only positions', async () => {
    const { service } = makeService(makeFund({
      contributions: [
        { contributorUserId: 'actor', amountMinor: 1000n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE },
        { contributorUserId: 'actor', amountMinor: 300n, occurredOn: day('2026-07-05'), status: RecordStatus.ACTIVE },
      ],
      expenses: [
        { expenseType: ExpenseType.FUND_EXPENSE, amountMinor: 200n, occurredOn: day('2026-06-02'), status: RecordStatus.ACTIVE, payers: [{ payerUserId: 'actor', amountMinor: 200n }], splits: [{ userId: 'former', allocatedAmountMinor: 200n }] },
        { expenseType: ExpenseType.REFUND, amountMinor: 50n, occurredOn: day('2026-07-06'), status: RecordStatus.ACTIVE, payers: [{ payerUserId: 'actor', amountMinor: 50n }], splits: [{ userId: 'former', allocatedAmountMinor: 50n }] },
      ],
      settlements: [{ id: 'closed', fromUserId: 'former', toUserId: 'actor', amountMinor: 100n, status: SettlementStatus.COMPLETED, periodEnd: day('2026-06-30'), completedAt: day('2026-06-30'), createdAt: day('2026-06-30') }],
    }));
    const result = await service.getFundSummary('fund-1', 'actor');
    expect(result.fund.cashBalanceMinor).toBe(1150);
    expect(result.allTime.netChangeMinor).toBe(1150);
    expect(result.current).toMatchObject({ contributionMinor: 300, expenseMinor: -50, netChangeMinor: 350 });
    expect(result.allTime.memberPositions).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'former', membershipStatus: 'removed', positionMinor: -250 }),
    ]));
  });

  it('uses a repeatable-read callback transaction and enforces access', async () => {
    const missing = makeService(null);
    await expect(missing.service.getFundSummary('fund-1', 'actor')).rejects.toEqual(new NotFoundException('FUND_NOT_FOUND'));

    const denied = makeService(makeFund({ group: { members: [] } }));
    await expect(denied.service.getFundSummary('fund-1', 'actor')).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));

    expect(denied.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
  });
});
