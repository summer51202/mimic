import { describe, expect, it } from 'vitest';
import {
  pooledCommitmentSchema,
  pooledExpenseMutationSchema,
  pooledReturnPlanSchema,
  pooledSummarySchema,
  pooledWorkspaceSchema,
} from './pooled-finance-contracts';

const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const at = '2026-09-12T01:00:00.000Z';

describe('pooled finance wire contracts', () => {
  const occurrence = { id: a, commitment_id: b, participant_user_id: a, due_on: '2026-09-12', amount_minor: '9007199254740993',
    status: 'CONFIRMED', timing: null, version: 2, confirmed_by: a, confirmed_at: at,
    skipped_by: null, skipped_at: null, canceled_by: null, canceled_at: null };
  const commitment = { id: b, space_id: a, name: '每月投入', cadence: 'MONTHLY', interval: 1,
    starts_on: '2026-09-12', ends_on: null, generated_through: '2027-09-12', status: 'ACTIVE', version: 1,
    assignments: [{ user_id: a, amount_minor: '9007199254740993' }], occurrences: [occurrence] };

  it('preserves exact money and rejects floats, negative zero, malformed and unknown fields', () => {
    expect(pooledCommitmentSchema.parse(commitment).assignments[0].amount_minor).toBe('9007199254740993');
    expect(pooledSummarySchema.parse({ book_balance_minor: '-9007199254740993', pending_reimbursement_minor: '0',
      available_balance_minor: '-9007199254740993', sent_awaiting_receipt_minor: '0', shortfall_minor: '9007199254740993' }).shortfall_minor)
      .toBe('9007199254740993');
    expect(() => pooledCommitmentSchema.parse({ ...commitment, leaked: true })).toThrow();
    expect(() => pooledCommitmentSchema.parse({ ...commitment, assignments: [{ user_id: a, amount_minor: '1.5' }] })).toThrow();
    expect(() => pooledSummarySchema.parse({ book_balance_minor: '-0', pending_reimbursement_minor: '0',
      available_balance_minor: '0', sent_awaiting_receipt_minor: '0', shortfall_minor: '0' })).toThrow();
  });

  it('requires derived timing and actor facts to agree with terminal occurrence state', () => {
    expect(() => pooledCommitmentSchema.parse({ ...commitment, occurrences: [{ ...occurrence, timing: 'OVERDUE' }] })).toThrow();
    expect(() => pooledCommitmentSchema.parse({ ...commitment, occurrences: [{ ...occurrence, confirmed_by: null }] })).toThrow();
  });

  it('parses both pooled expense sources and reimbursement lifecycle facts', () => {
    const record = { id: a, space_id: b, amount_minor: '300', currency: 'TWD', occurred_on: '2026-09-12', title: '代墊', note: null,
      category_id: a, tag_ids: [], status: 'ACTIVE', version: 1, created_by: a, updated_by: a, created_at: at, updated_at: at };
    const reimbursement = { id: b, expense_id: a, participant_user_id: a, amount_minor: '300', status: 'SENT', version: 2,
      sent_by: a, sent_at: at, received_by: null, received_at: null };
    expect(() => pooledExpenseMutationSchema.parse({ record, payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: a,
      reimbursement: { ...reimbursement, leaked: true }, summary: { book_balance_minor: '0', pending_reimbursement_minor: '0', available_balance_minor: '0',
        sent_awaiting_receipt_minor: '300', shortfall_minor: '0' } })).toThrow();
    expect(pooledExpenseMutationSchema.parse({ record, payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: a,
      reimbursement, summary: { book_balance_minor: '0', pending_reimbursement_minor: '0', available_balance_minor: '0',
        sent_awaiting_receipt_minor: '300', shortfall_minor: '0' } }).reimbursement?.status).toBe('SENT');
  });

  it('validates explicit return states and a strict complete workspace', () => {
    const item = { id: a, plan_id: b, recipient_user_id: a, amount_minor: '10', status: 'AWAITING_PAYMENT', version: 1,
      sent_by: null, sent_at: null, received_by: null, received_at: null };
    const plan = { id: b, space_id: a, status: 'ACTIVE', version: 1, created_by: a, created_at: at, returns: [item] };
    expect(pooledReturnPlanSchema.parse(plan)).toEqual(plan);
    expect(() => pooledWorkspaceSchema.parse({ summary: { book_balance_minor: '10', pending_reimbursement_minor: '0', available_balance_minor: '10',
      sent_awaiting_receipt_minor: 0, shortfall_minor: '0' }, commitments: [], expenses: [], corrections: [], return_plan: null })).toThrow();
  });
});
