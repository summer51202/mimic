import { ConflictException } from '@nestjs/common';
import { Prisma, SettlementStatus } from '@prisma/client';

export async function assertFundPeriodUnlocked(
  tx: Prisma.TransactionClient,
  fundId: string,
  occurredOn: Date,
): Promise<void> {
  const lockedSettlement = await tx.settlement.findFirst({
    where: {
      fundId,
      status: SettlementStatus.COMPLETED,
      periodStart: { lte: occurredOn },
      periodEnd: { gte: occurredOn },
    },
    select: { id: true },
  });

  if (lockedSettlement) {
    throw new ConflictException('LOCKED_PERIOD');
  }
}
