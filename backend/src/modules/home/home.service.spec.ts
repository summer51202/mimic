import { HomeService } from './home.service';

it('projects the latest created expense beyond the recent activity window without per-expense queries', async () => {
  const day = (value: number) => new Date(Date.UTC(2026, 10, value));
  const space = { id: 'personal', name: 'Daily', mode: 'PERSONAL_EXPENSES', currency: 'TWD', status: 'ACTIVE' };
  const row = (id: string, occurredOn: Date, createdAt: Date) => ({
    id, spaceId: space.id, occurredOn, createdAt, title: id, amountMinor: 1n, categoryId: 'food', category: { name: 'Food' },
  });
  const expenses = [row('recent', day(12), day(12)), row('previous', day(11), day(11)), row('earlier', day(10), day(10)),
    row('backfilled-a', day(1), day(13)), row('backfilled-b', day(1), day(13))];
  const financialSpace = { findMany: jest.fn().mockResolvedValueOnce([space]).mockResolvedValueOnce([]) };
  const expenseRecord = { findMany: jest.fn().mockResolvedValue(expenses) };
  const user = { findUnique: jest.fn().mockResolvedValue({ locale: 'en' }) };
  const empty = { findMany: jest.fn().mockResolvedValue([]) };
  const tx = { user, financialSpace, expenseRecord, personalExpenseReference: empty, sharedSettlementBatch: empty,
    pooledContributionOccurrence: empty, pooledReimbursement: empty, sharedSettlementTransfer: empty };
  const prisma = { $transaction: (work: (client: unknown) => unknown) => work(tx) };
  const service = new HomeService(prisma as never, { today: () => day(13) } as never);

  const { cards } = await service.home('actor-id');
  expect(cards[0]).toMatchObject({ latest_recorded: { id: 'backfilled-b', recorded_at: day(13).toISOString() },
    recent_activity: expenses.slice(0, 3).map((expense) => expect.objectContaining({ id: expense.id })) });
  expect(expenseRecord.findMany).toHaveBeenCalledTimes(1);
  expect(empty.findMany).toHaveBeenCalledTimes(6);
  expect(user.findUnique).toHaveBeenCalledTimes(1);
});

describe('HomeService task privacy query', () => {
  it('only projects tasks from currently usable financial spaces', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const occurrenceFindMany = jest.fn().mockResolvedValue([]);
    const tx = new Proxy({}, { get: (_target, key) => ({ findMany: key === 'financialSpace' ? findMany
      : key === 'pooledContributionOccurrence' ? occurrenceFindMany : jest.fn().mockResolvedValue([]) }) });
    const prisma = { $transaction: (work: (client: unknown) => unknown) => work(tx) };
    const spaces = { today: () => new Date('2026-09-12T00:00:00.000Z') };
    const service = new HomeService(prisma as never, spaces as never);

    await service.tasks('actor-id');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ['ACTIVE', 'CLOSING'] } }) }));
    expect(occurrenceFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      commitment: expect.objectContaining({ status: 'ACTIVE' }),
    }) }));
  });
});
