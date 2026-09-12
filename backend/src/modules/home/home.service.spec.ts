import { HomeService } from './home.service';

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
