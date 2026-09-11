import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readSharedFinancials } from '../shared-expenses/shared-financial-read';

// The caller authorizes the actor and holds the group-to-space mutation lock.
export async function requireSharedLifecycleReady(tx: Prisma.TransactionClient, spaceId: string, userId?: string): Promise<void> {
  const pending = await tx.sharedSettlementBatch.findFirst({ where: { spaceId, status: 'PENDING',
    ...(userId ? { transfers: { some: { status: { not: 'COMPLETED' }, OR: [{ fromUserId: userId }, { toUserId: userId }] } } } : {}) }, select: { id: true } });
  if (pending) throw new ConflictException('SHARED_BATCH_PENDING');
  const { positions } = await readSharedFinancials(tx, spaceId);
  if (positions.some(row => (!userId || row.userId === userId) && row.amountMinor !== 0n)) throw new ConflictException('SHARED_UNSETTLED_POSITION');
  const completed = await tx.sharedSettlementBatch.findFirst({ where: { spaceId, status: 'COMPLETED' }, orderBy: { periodEnd: 'desc' }, select: { periodEnd: true } });
  // Completed batches cover consecutive periods; canceled batches never advance coverage.
  const dates = completed ? { occurredOn: { gt: completed.periodEnd } } : {};
  const expense = await tx.expenseRecord.findFirst({ where: { spaceId, status: 'ACTIVE', ...dates,
    ...(userId ? { OR: [{ sharedPayers: { some: { userId, amountMinor: { not: 0n } } } },
      { sharedAllocations: { some: { userId, amountMinor: { not: 0n } } } }] } : {}) }, select: { id: true } });
  if (expense) throw new ConflictException('SHARED_UNSETTLED_RECORDS');
  const correction = await tx.sharedCorrection.findFirst({ where: { spaceId, ...dates,
    ...(userId ? { OR: [{ payers: { some: { userId, amountMinor: { not: '0' } } } },
      { allocations: { some: { userId, amountMinor: { not: '0' } } } }] } : {}) }, select: { id: true } });
  if (correction) throw new ConflictException('SHARED_UNSETTLED_RECORDS');
}
