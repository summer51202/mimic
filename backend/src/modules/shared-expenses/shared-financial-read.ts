import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { sharedPositions } from './shared-accounting';
import { correctionEffect, correctionInclude } from '../shared-settlements/shared-settlement-projection';

// Caller supplies one RepeatableRead snapshot or holds the space mutation lock.
export async function readSharedFinancials(tx: Prisma.TransactionClient, spaceId: string, end?: Date) {
  const dateFilter = end ? Prisma.sql`AND e.occurred_on <= ${end}::date` : Prisma.empty;
  const [totals] = await tx.$queryRaw<Array<{ amount: string; invalid: boolean }>>(Prisma.sql`
    SELECT COALESCE(SUM(e.amount_minor),0)::text AS amount,
    COALESCE(BOOL_OR(
      e.amount_minor <> COALESCE((SELECT SUM(p.amount_minor) FROM shared_expense_payers p WHERE p.expense_id=e.id),0)
      OR e.amount_minor <> COALESCE((SELECT SUM(a.amount_minor) FROM shared_expense_allocations a WHERE a.expense_id=e.id),0)
    ),false) AS invalid FROM expense_records e WHERE e.space_id=${spaceId}::uuid AND e.status='ACTIVE' ${dateFilter}`);
  if (totals.invalid) throw new InternalServerErrorException('SHARED_FACTS_INVALID');
  const payers = await tx.$queryRaw<Array<{ userId: string; amount: string }>>(Prisma.sql`
    SELECT p.user_id AS "userId", SUM(p.amount_minor)::text AS amount FROM shared_expense_payers p
    JOIN expense_records e ON e.id=p.expense_id WHERE e.space_id=${spaceId}::uuid AND e.status='ACTIVE' ${dateFilter} GROUP BY p.user_id`);
  const allocations = await tx.$queryRaw<Array<{ userId: string; amount: string }>>(Prisma.sql`
    SELECT a.user_id AS "userId", SUM(a.amount_minor)::text AS amount FROM shared_expense_allocations a
    JOIN expense_records e ON e.id=a.expense_id WHERE e.space_id=${spaceId}::uuid AND e.status='ACTIVE' ${dateFilter} GROUP BY a.user_id`);
  const convert = (rows: typeof payers) => rows.map(row => ({ userId: row.userId, amountMinor: BigInt(row.amount) }));
  const corrections = await tx.sharedCorrection.findMany({ where: { spaceId, ...(end ? { occurredOn: { lte: end } } : {}) }, include: correctionInclude });
  const transfers = await tx.sharedSettlementTransfer.findMany({ where: { status: 'COMPLETED', batch: { spaceId, ...(end ? { periodEnd: { lte: end } } : {}) } } });
  try {
    const effects = [{ amountMinor: BigInt(totals.amount), payers: convert(payers), allocations: convert(allocations) }, ...corrections.map(correctionEffect)];
    const positions = sharedPositions(effects, transfers.map(row => ({ fromUserId: row.fromUserId, toUserId: row.toUserId, amountMinor: BigInt(row.amountMinor.toFixed(0)), status: row.status })));
    return { spending: effects.reduce((sum, effect) => sum + effect.amountMinor, 0n), positions };
  } catch { throw new InternalServerErrorException('SHARED_FACTS_INVALID'); }
}
