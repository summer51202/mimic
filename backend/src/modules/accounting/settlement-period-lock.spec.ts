import { ConflictException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { assertFundPeriodUnlocked } from './settlement-period-lock';

describe('assertFundPeriodUnlocked', () => {
  const occurredOn = new Date('2026-08-30T00:00:00.000Z');

  it('rejects a date covered by a completed settlement inclusive range', async () => {
    const tx = {
      settlement: {
        findFirst: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
      },
    };

    await expect(
      assertFundPeriodUnlocked(tx as never, 'fund-1', occurredOn),
    ).rejects.toEqual(new ConflictException('LOCKED_PERIOD'));

    expect(tx.settlement.findFirst).toHaveBeenCalledWith({
      where: {
        fundId: 'fund-1',
        status: SettlementStatus.COMPLETED,
        periodStart: { lte: occurredOn },
        periodEnd: { gte: occurredOn },
      },
      select: { id: true },
    });
  });

  it('allows a date when no bounded completed settlement covers it', async () => {
    const tx = {
      settlement: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    await expect(
      assertFundPeriodUnlocked(tx as never, 'fund-1', occurredOn),
    ).resolves.toBeUndefined();
  });
});
