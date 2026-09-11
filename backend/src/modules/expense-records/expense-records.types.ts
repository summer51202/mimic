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
  view_version: string; spending_minor: string;
  categories: Array<{ category_id: string; category_name: string; spending_minor: string }>;
  items: PersonalMonthEntry[]; next_cursor: string | null;
}

export interface PersonalManualEntry extends ExpenseProjection {
  entry_type: 'MANUAL';
  category_name: string;
}

export interface PersonalReferenceEntry {
  entry_type: 'SHARED_REFERENCE'; id: string; space_id: string; source_space_id: string;
  source_expense_id: string; owner_user_id: string; amount_minor: string; currency: string;
  occurred_on: string; title: string; note: string | null; category_id: string;
  category_name: string; tag_ids: string[]; status: 'ACTIVE'; version: number;
  source_locked: boolean; created_at: string; updated_at: string;
}

export type PersonalMonthEntry = PersonalManualEntry | PersonalReferenceEntry;
