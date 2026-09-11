import { RecordStatus } from '@prisma/client';
export interface ExpenseProjection {
  id: string; space_id: string; amount_minor: string; currency: string; occurred_on: string;
  title: string; note: string | null; category_id: string; tag_ids: string[]; status: RecordStatus;
  version: number; created_by: string; updated_by: string; created_at: string; updated_at: string;
}
export interface ExpenseMutationResult { record: ExpenseProjection; change_minor: string }
export interface ExpenseWriteResult { record: ExpenseProjection; before: ExpenseProjection | null; delta: bigint; changed: boolean }
export interface ExpenseFields { amountMinor: bigint; occurredOn: Date; title: string; note: string | null; categoryId: string; tagIds: string[] }
export interface PersonalMonth {
  space_id: string; mode: 'PERSONAL_EXPENSES'; currency: string; month: string; space_version: number;
  spending_minor: string; categories: Array<{ category_id: string; spending_minor: string }>;
  items: ExpenseProjection[]; next_cursor: string | null;
}
