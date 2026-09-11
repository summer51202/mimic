import { describe, expect, it } from 'vitest';
import {
  sharedBatchSchema,
  sharedExpenseMutationSchema,
  sharedExpensePageSchema,
  sharedSummarySchema,
} from './shared-finance-contracts';

const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const expense = {
  id: a, space_id: b, amount_minor: '9007199254740993', currency: 'TWD', occurred_on: '2026-09-11',
  title: '共同採買', note: null, category_id: a, tag_ids: [], status: 'ACTIVE', version: 1,
  created_by: a, updated_by: a, created_at: '2026-09-11T01:00:00.000Z', updated_at: '2026-09-11T01:00:00.000Z',
  payers: [{ user_id: a, amount_minor: '9007199254740993' }],
  allocations: [{ user_id: b, amount_minor: '9007199254740993' }],
};

describe('shared finance wire contracts', () => {
  it('keeps every monetary value as an exact canonical string', () => {
    expect(sharedExpenseMutationSchema.parse({
      record: expense, change_minor: '9007199254740993',
      position_changes: [{ user_id: a, amount_minor: '9007199254740993' }, { user_id: b, amount_minor: '-9007199254740993' }],
    }).record.amount_minor).toBe('9007199254740993');
    expect(sharedSummarySchema.parse({ space_id: b, mode: 'SHARED_EXPENSES', currency: 'TWD', space_version: 2,
      spending_minor: '9007199254740993', positions: [{ user_id: b, amount_minor: '-9007199254740993' }] }).positions[0].amount_minor)
      .toBe('-9007199254740993');
    expect(() => sharedExpensePageSchema.parse({ space_id: b, space_version: 2, items: [{ ...expense, amount_minor: 3 }], next_cursor: null })).toThrow();
    expect(() => sharedSummarySchema.parse({ space_id: b, mode: 'SHARED_EXPENSES', currency: 'TWD', space_version: 2,
      spending_minor: '-0', positions: [] })).toThrow();
  });

  it('parses a strict batch snapshot and rejects unknown fields', () => {
    const batch = {
      id: a, space_id: b, period_start: '2026-09-01', period_end: '2026-09-11', status: 'PENDING', version: 1,
      snapshot: { expenses: [expense], corrections: [], positions: [{ user_id: a, amount_minor: '1' }, { user_id: b, amount_minor: '-1' }] },
      created_by: a, created_at: '2026-09-11T01:00:00.000Z', completed_by: null, completed_at: null,
      canceled_by: null, canceled_at: null,
      transfers: [{ id: b, from_user_id: b, to_user_id: a, amount_minor: '1', status: 'AWAITING_PAYMENT', version: 1,
        sent_by: null, sent_at: null, received_by: null, received_at: null }],
    };
    expect(sharedBatchSchema.parse(batch).snapshot.expenses).toHaveLength(1);
    expect(() => sharedBatchSchema.parse({ ...batch, leaked: true })).toThrow();
  });

  it('requires confirmation facts to agree with transfer state', () => {
    const base = { id: b, from_user_id: b, to_user_id: a, amount_minor: '1', version: 1,
      sent_by: null, sent_at: null, received_by: null, received_at: null };
    const envelope = { id: a, space_id: b, period_start: '2026-09-01', period_end: '2026-09-11', status: 'PENDING', version: 1,
      snapshot: { expenses: [], corrections: [], positions: [] }, created_by: a, created_at: '2026-09-11T01:00:00.000Z',
      completed_by: null, completed_at: null, canceled_by: null, canceled_at: null };
    expect(() => sharedBatchSchema.parse({ ...envelope, transfers: [{ ...base, status: 'SENT' }] })).toThrow();
    expect(() => sharedBatchSchema.parse({ ...envelope, transfers: [{ ...base, status: 'AWAITING_PAYMENT', sent_by: a }] })).toThrow();
  });
});
