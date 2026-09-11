import { Prisma } from '@prisma/client';
import { SharedEffect } from '../shared-expenses/shared-accounting';
import { wireAmounts } from '../shared-expenses/shared-expense-records';

export const batchInclude = { transfers: { orderBy: { id: 'asc' as const } } } as const;
export type SharedBatch = Prisma.SharedSettlementBatchGetPayload<{ include: typeof batchInclude }>;
export const correctionInclude = { payers: true, allocations: true } as const;
export type Correction = Prisma.SharedCorrectionGetPayload<{ include: typeof correctionInclude }>;
export function correctionEffect(row: Correction): SharedEffect {
  const convert = (rows: typeof row.payers) => rows.map(item => ({ userId: item.userId, amountMinor: BigInt(item.amountMinor.toFixed(0)) }));
  return { amountMinor: BigInt(row.amountMinor.toFixed(0)), payers: convert(row.payers), allocations: convert(row.allocations) };
}
export function projectCorrection(row: Correction) {
  const effect = correctionEffect(row);
  return { id: row.id, space_id: row.spaceId, source_expense_id: row.sourceExpenseId, source_transfer_id: row.sourceTransferId,
    revision: row.revision, occurred_on: row.occurredOn.toISOString().slice(0, 10), reason: row.reason,
    amount_minor: row.amountMinor.toFixed(0), target_amount_minor: row.targetAmountMinor.toFixed(0),
    payers: wireAmounts(effect.payers), allocations: wireAmounts(effect.allocations), created_by: row.createdById, created_at: row.createdAt.toISOString() };
}
export function projectBatch(batch: SharedBatch) {
  return { id: batch.id, space_id: batch.spaceId, period_start: batch.periodStart.toISOString().slice(0, 10), period_end: batch.periodEnd.toISOString().slice(0, 10),
    status: batch.status, version: batch.version, snapshot: batch.snapshot, created_by: batch.createdById, created_at: batch.createdAt.toISOString(),
    completed_by: batch.completedById, completed_at: batch.completedAt?.toISOString() ?? null,
    canceled_by: batch.canceledById, canceled_at: batch.canceledAt?.toISOString() ?? null,
    transfers: batch.transfers.map(row => ({ id: row.id, from_user_id: row.fromUserId, to_user_id: row.toUserId,
      amount_minor: row.amountMinor.toFixed(0), status: row.status, version: row.version,
      sent_by: row.sentById, sent_at: row.sentAt?.toISOString() ?? null, received_by: row.receivedById, received_at: row.receivedAt?.toISOString() ?? null })) };
}
