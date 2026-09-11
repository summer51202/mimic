import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Caller must hold the space mutation lock for the entire financial write.
export async function requireSharedPeriodOpen(tx: Prisma.TransactionClient, spaceId: string, dates: Date[]): Promise<void> {
  const lock = await tx.sharedSettlementBatch.findFirst({ where: { spaceId, status: { in: ['PENDING', 'COMPLETED'] },
    OR: dates.map(date => ({ periodStart: { lte: date }, periodEnd: { gte: date } })) } });
  if (lock) throw new ConflictException(lock.status === 'COMPLETED' ? 'SHARED_PERIOD_PERMANENT_LOCK' : 'SHARED_PERIOD_TEMPORARY_LOCK');
}
