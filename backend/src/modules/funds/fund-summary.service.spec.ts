import {
  ExpenseType,
  FundStatus,
  GroupStatus,
  MemberStatus,
  RecordStatus,
  SettlementStatus,
} from '@prisma/client';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

const makeGroup = (overrides: Record<string, unknown> = {}) => ({
  id: 'group-1',
  name: 'Our home',
  defaultCurrency: 'TWD',
  status: GroupStatus.ACTIVE,
  members: makeFund().group.members,
  funds: [],
  ...overrides,
});

const makeGroupService = (group: ReturnType<typeof makeGroup> | null) => {
  const tx = { group: { findFirst: jest.fn().mockResolvedValue(group) } };
  const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
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

  it('selects the latest completed settlement deterministically when period ends tie', async () => {
    const { service } = makeService(makeFund({
      settlements: [
        { id: 'settlement-a', fromUserId: 'actor', toUserId: 'former', amountMinor: 10n, status: SettlementStatus.COMPLETED, periodEnd: day('2026-06-30'), completedAt: day('2026-07-01'), createdAt: day('2026-06-30') },
        { id: 'settlement-b', fromUserId: 'actor', toUserId: 'former', amountMinor: 10n, status: SettlementStatus.COMPLETED, periodEnd: day('2026-06-30'), completedAt: day('2026-07-02'), createdAt: day('2026-06-30') },
      ],
    }));

    const result = await service.getFundSummary('fund-1', 'actor');

    expect(result.currentPeriod.lastCompletedSettlementId).toBe('settlement-b');
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

  it('keeps a LEFT member with a non-zero all-time position as read-only history', async () => {
    const { service } = makeService(makeFund({
      group: { members: [
        { userId: 'actor', status: MemberStatus.ACTIVE, user: { displayName: 'Alex' } },
        { userId: 'former', status: MemberStatus.LEFT, user: { displayName: 'Former' } },
      ] },
      contributions: [{ contributorUserId: 'former', amountMinor: 25n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE }],
    }));

    const result = await service.getFundSummary('fund-1', 'actor');

    expect(result.allTime.memberPositions).toContainEqual({
      userId: 'former', displayName: 'Former', membershipStatus: 'left', positionMinor: 25,
    });
    expect(result.current.memberPositions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'former' }),
    ]));
  });

  it('excludes deleted ledger records in Prisma and defensively ignores them', async () => {
    const { service, tx } = makeService(makeFund({
      contributions: [
        { contributorUserId: 'actor', amountMinor: 100n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE },
        { contributorUserId: 'actor', amountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n, occurredOn: day('2026-06-01'), status: RecordStatus.DELETED },
      ],
      expenses: [
        { expenseType: ExpenseType.FUND_EXPENSE, amountMinor: 40n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE, payers: [], splits: [] },
        { expenseType: ExpenseType.FUND_EXPENSE, amountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n, occurredOn: day('2026-06-01'), status: RecordStatus.DELETED, payers: [], splits: [] },
      ],
    }));

    const result = await service.getFundSummary('fund-1', 'actor');

    expect(result.allTime.netChangeMinor).toBe(60);
    expect(tx.fund.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'fund-1', status: FundStatus.ACTIVE },
      select: expect.objectContaining({
        contributions: expect.objectContaining({ where: { status: RecordStatus.ACTIVE } }),
        expenses: expect.objectContaining({ where: { status: RecordStatus.ACTIVE } }),
        settlements: expect.objectContaining({ where: { status: SettlementStatus.COMPLETED } }),
      }),
    }));
  });

  it.each([
    ['contribution', { contributions: [{ contributorUserId: 'actor', amountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE }] }],
    ['expense', { expenses: [{ expenseType: ExpenseType.FUND_EXPENSE, amountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE, payers: [], splits: [] }] }],
    ['payer', { expenses: [{ expenseType: ExpenseType.FUND_EXPENSE, amountMinor: 1n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE, payers: [{ payerUserId: 'actor', amountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n }], splits: [] }] }],
    ['split', { expenses: [{ expenseType: ExpenseType.FUND_EXPENSE, amountMinor: 1n, occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE, payers: [], splits: [{ userId: 'actor', allocatedAmountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n }] }] }],
    ['settlement', { settlements: [{ id: 'unsafe', fromUserId: 'actor', toUserId: 'former', amountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n, status: SettlementStatus.COMPLETED, periodEnd: day('2026-06-30'), completedAt: day('2026-06-30'), createdAt: day('2026-06-30') }] }],
  ])('rejects an unsafe Prisma bigint at the %s boundary', async (_label, override) => {
    const { service } = makeService(makeFund(override));

    await expect(service.getFundSummary('fund-1', 'actor')).rejects.toEqual(
      new InternalServerErrorException('MONEY_AMOUNT_OUT_OF_RANGE'),
    );
  });

  it('rejects a safe-input sum that overflows the safe integer range', async () => {
    const { service } = makeService(makeFund({ contributions: [
      { contributorUserId: 'actor', amountMinor: BigInt(Number.MAX_SAFE_INTEGER), occurredOn: day('2026-06-01'), status: RecordStatus.ACTIVE },
      { contributorUserId: 'actor', amountMinor: 1n, occurredOn: day('2026-06-02'), status: RecordStatus.ACTIVE },
    ] }));

    await expect(service.getFundSummary('fund-1', 'actor')).rejects.toEqual(
      new InternalServerErrorException('MONEY_AMOUNT_OUT_OF_RANGE'),
    );
  });

  it('uses a repeatable-read callback transaction and enforces access', async () => {
    const missing = makeService(null);
    await expect(missing.service.getFundSummary('fund-1', 'actor')).rejects.toEqual(new NotFoundException('FUND_NOT_FOUND'));

    const denied = makeService(makeFund({ group: { members: [] } }));
    await expect(denied.service.getFundSummary('fund-1', 'actor')).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));

    expect(denied.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
    expect(denied.tx.fund.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'fund-1', status: FundStatus.ACTIVE },
    }));
  });

  it('loads one group snapshot and aggregates funds only within their currency', async () => {
    const twdAlpha = makeFund({
      id: 'twd-a', name: 'Alpha', currency: 'TWD',
      contributions: [{ contributorUserId: 'actor', amountMinor: 100n, occurredOn: day('2026-07-01'), status: RecordStatus.ACTIVE }],
    });
    const twdBeta = makeFund({
      id: 'twd-b', name: 'Beta', currency: 'TWD',
      contributions: [{ contributorUserId: 'former', amountMinor: 50n, occurredOn: day('2026-07-02'), status: RecordStatus.ACTIVE }],
    });
    const usd = makeFund({
      id: 'usd-a', name: 'Dollar', currency: 'USD',
      contributions: [{ contributorUserId: 'actor', amountMinor: 7n, occurredOn: day('2026-07-03'), status: RecordStatus.ACTIVE }],
    });
    const { service, prisma, tx } = makeGroupService(makeGroup({ funds: [usd, twdBeta, twdAlpha] }));

    const result = await service.getGroupDashboard('group-1', 'actor');

    expect(result.group).toEqual({ id: 'group-1', name: 'Our home', defaultCurrency: 'TWD' });
    expect(result.currencies.map((section) => section.currency)).toEqual(['TWD', 'USD']);
    expect(result.currencies[0]).toMatchObject({
      cashBalanceMinor: 150,
      current: { netChangeMinor: 150, contributionMinor: 150, expenseMinor: 0 },
      allTime: { netChangeMinor: 150, contributionMinor: 150, expenseMinor: 0 },
      funds: [
        { fundId: 'twd-a', name: 'Alpha', cashBalanceMinor: 100, currentNetChangeMinor: 100, periodStart: '2026-07-01', periodEnd: '2026-07-17' },
        { fundId: 'twd-b', name: 'Beta', cashBalanceMinor: 50, currentNetChangeMinor: 50, periodStart: '2026-07-02', periodEnd: '2026-07-17' },
      ],
    });
    expect(result.currencies[0].allTime.memberPositions).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'actor', positionMinor: 100 }),
      expect.objectContaining({ userId: 'former', positionMinor: 50 }),
    ]));
    expect(result.currencies[1]).toMatchObject({ cashBalanceMinor: 7, allTime: { netChangeMinor: 7 } });
    expect(result.currencies[1].allTime.memberPositions).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'actor', positionMinor: 7 }),
    ]));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
    expect(tx.group.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.group.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
      select: expect.objectContaining({
        members: expect.any(Object),
        funds: expect.objectContaining({ where: { status: FundStatus.ACTIVE } }),
      }),
    }));
  });

  it('sorts default currency first, other currencies alphabetically, and fund name ties by id', async () => {
    const funds = [
      makeFund({ id: 'z-2', name: 'Same', currency: 'ZAR' }),
      makeFund({ id: 'eur', name: 'Euro', currency: 'EUR' }),
      makeFund({ id: 'z-1', name: 'Same', currency: 'ZAR' }),
      makeFund({ id: 'usd', name: 'Dollar', currency: 'USD' }),
    ];
    const { service } = makeGroupService(makeGroup({ defaultCurrency: 'USD', funds }));

    const result = await service.getGroupDashboard('group-1', 'actor');

    expect(result.currencies.map((item) => item.currency)).toEqual(['USD', 'EUR', 'ZAR']);
    expect(result.currencies[2].funds.map((item) => item.fundId)).toEqual(['z-1', 'z-2']);
  });

  it('returns group context with no currency sections when there are no active funds', async () => {
    const { service } = makeGroupService(makeGroup());
    const result = await service.getGroupDashboard('group-1', 'actor');
    expect(result).toEqual({
      group: { id: 'group-1', name: 'Our home', defaultCurrency: 'TWD' },
      currencies: [],
    });
  });

  it('rejects missing groups and inactive actors', async () => {
    const missing = makeGroupService(null);
    await expect(missing.service.getGroupDashboard('group-1', 'actor')).rejects.toEqual(
      new NotFoundException('GROUP_NOT_FOUND'),
    );
    const denied = makeGroupService(makeGroup({ members: [] }));
    await expect(denied.service.getGroupDashboard('group-1', 'actor')).rejects.toEqual(
      new ForbiddenException('GROUP_ACCESS_DENIED'),
    );
  });

  it('fails explicitly when same-currency aggregation exceeds the safe integer range', async () => {
    const funds = [
      makeFund({ id: 'large', contributions: [{ contributorUserId: 'actor', amountMinor: BigInt(Number.MAX_SAFE_INTEGER), occurredOn: day('2026-07-01'), status: RecordStatus.ACTIVE }] }),
      makeFund({ id: 'one', contributions: [{ contributorUserId: 'actor', amountMinor: 1n, occurredOn: day('2026-07-01'), status: RecordStatus.ACTIVE }] }),
    ];
    const { service } = makeGroupService(makeGroup({ funds }));
    await expect(service.getGroupDashboard('group-1', 'actor')).rejects.toEqual(
      new InternalServerErrorException('MONEY_AMOUNT_OUT_OF_RANGE'),
    );
  });
});
