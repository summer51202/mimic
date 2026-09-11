import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExpenseRecordsService } from '../expense-records/expense-records.service';
import { ExpenseProjection } from '../expense-records/expense-records.types';
import { MemberAmount, SharedEffect, validateSharedExpense } from './shared-accounting';

export const sharedInclude = { tags: true, sharedPayers: true, sharedAllocations: true } as const;
export type SharedRecord = Prisma.ExpenseRecordGetPayload<{ include: typeof sharedInclude }>;
export interface AmountRow { user_id: string; amount_minor: string }
export interface SharedExpenseProjection extends ExpenseProjection { payers: AmountRow[]; allocations: AmountRow[] }
export interface SharedMutationResult { record: SharedExpenseProjection; change_minor: string; position_changes: AmountRow[] }
export function wireAmounts(rows: readonly MemberAmount[]): AmountRow[] {
  return [...rows].sort((a, b) => a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
    .map(row => ({ user_id: row.userId, amount_minor: row.amountMinor.toString() }));
}
export function sharedEffect(record: SharedRecord): SharedEffect {
  return { amountMinor: record.amountMinor, payers: record.sharedPayers, allocations: record.sharedAllocations };
}
export function projectShared(record: SharedRecord, currency: string, records: ExpenseRecordsService): SharedExpenseProjection {
  try { validateSharedExpense(sharedEffect(record)); } catch { throw new InternalServerErrorException('SHARED_FACTS_INVALID'); }
  return { ...records.project(record, currency), payers: wireAmounts(record.sharedPayers), allocations: wireAmounts(record.sharedAllocations) };
}
