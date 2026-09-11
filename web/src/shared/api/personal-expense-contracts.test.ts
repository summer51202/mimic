import { describe, expect, it } from 'vitest';
import { expenseRecordSchema, personalMonthSchema, personalReferenceMutationSchema } from './personal-expense-contracts';
const id = '00000000-0000-4000-8000-000000000001';
const record = { id, space_id: id, amount_minor: '9007199254740993', currency: 'TWD', occurred_on: '2026-09-11',
  title: 'Lunch', note: null, category_id: id, tag_ids: [], status: 'ACTIVE', version: 1,
  created_by: id, updated_by: id, created_at: '2026-09-11T00:00:00Z', updated_at: '2026-09-11T00:00:00Z' };
describe('personal expense contracts', () => {
  it('preserves large exact amount strings', () => { expect(expenseRecordSchema.parse(record)).toEqual(record); });
  it.each([{ amount_minor: 125 }, { amount_minor: '0' }, { amount_minor: '1.25' }, { balance_minor: '0' }, { payers: [] },
    { occurred_on: '2026-02-30' }, { note: 1 }, { version: 1.5 }])('rejects invalid record %j', value => {
    expect(expenseRecordSchema.safeParse({ ...record, ...value }).success).toBe(false);
  });
  const month = { space_id: id, mode: 'PERSONAL_EXPENSES', currency: 'TWD', month: '2026-09', space_version: 1,
    view_version: 'a'.repeat(64), spending_minor: '18446744073709551614', categories: [], items: [], next_cursor: null };
  it('permits aggregate sums beyond one record bound', () => { expect(personalMonthSchema.parse(month)).toEqual(month); });
  it.each([{ mode: 'SHARED_EXPENSES' }, { spending_minor: '-1' }, { spending_minor: 125 }, { balance_minor: '0' }, { month: '2026-13' }])('rejects mixed financial meanings %j', value => {
    expect(personalMonthSchema.safeParse({ ...month, ...value }).success).toBe(false);
  });
  it('accepts discriminated manual and private-reference month entries', () => {
    const reference = {
      entry_type: 'SHARED_REFERENCE', id, space_id: id, source_space_id: id, source_expense_id: id,
      owner_user_id: id, amount_minor: '0', currency: 'TWD', occurred_on: '2026-09-11', title: 'Shared lunch',
      note: 'private', category_id: id, category_name: 'Food', tag_ids: [], status: 'ACTIVE', version: 1,
      source_locked: true, created_at: '2026-09-11T00:00:00Z', updated_at: '2026-09-11T00:00:00Z',
    };
    const parsed = personalMonthSchema.parse({ ...month,
      categories: [{ category_id: id, category_name: 'Food', spending_minor: '0' }],
      items: [{ ...record, entry_type: 'MANUAL', category_name: 'Food' }, reference],
    });
    expect(parsed.items.map(item => item.entry_type)).toEqual(['MANUAL', 'SHARED_REFERENCE']);
    expect(personalReferenceMutationSchema.parse({ reference: {
      id, personal_space_id: id, source_expense_id: id, owner_user_id: id, note: null, tag_ids: [],
      status: 'ACTIVE', version: 1, created_at: '2026-09-11T00:00:00Z', updated_at: '2026-09-11T00:00:00Z',
    }, change_minor: '9007199254740993' }).change_minor).toBe('9007199254740993');
  });
  it.each([{ amount_minor: 1 }, { amount_minor: '1.5' }, { source_locked: 'yes' }, { entry_type: 'MANUAL' }])
    ('rejects malformed reference entry %j', value => {
      const reference = { entry_type: 'SHARED_REFERENCE', id, space_id: id, source_space_id: id,
        source_expense_id: id, owner_user_id: id, amount_minor: '1', currency: 'TWD', occurred_on: '2026-09-11',
        title: 'Shared lunch', note: null, category_id: id, category_name: 'Food', tag_ids: [], status: 'ACTIVE',
        version: 1, source_locked: false, created_at: '2026-09-11T00:00:00Z', updated_at: '2026-09-11T00:00:00Z' };
      expect(personalMonthSchema.safeParse({ ...month, items: [{ ...reference, ...value }] }).success).toBe(false);
    });
});
