import { z } from 'zod';
import { expenseRecordSchema } from './personal-expense-contracts';

const uuid = z.string().uuid();
const iso = z.iso.datetime({ offset: true });
const version = z.number().int().positive().safe();
const unsigned = z.string().regex(/^(0|[1-9]\d*)$/);
const positive = z.string().regex(/^[1-9]\d*$/);
const signed = z.string().regex(/^(0|-?[1-9]\d*)$/);

export const pooledSummarySchema = z.object({
  book_balance_minor: signed,
  pending_reimbursement_minor: unsigned,
  available_balance_minor: signed,
  sent_awaiting_receipt_minor: unsigned,
  shortfall_minor: unsigned,
}).strict().superRefine((value, ctx) => {
  const book = BigInt(value.book_balance_minor);
  const pending = BigInt(value.pending_reimbursement_minor);
  const available = BigInt(value.available_balance_minor);
  if (available !== book - pending) ctx.addIssue({ code: 'custom', message: 'POOLED_SUMMARY_INVALID' });
  const zero = BigInt(0);
  if (BigInt(value.shortfall_minor) !== (available < zero ? -available : zero)) {
    ctx.addIssue({ code: 'custom', message: 'POOLED_SHORTFALL_INVALID' });
  }
});

const occurrenceSchema = z.object({
  id: uuid, commitment_id: uuid, participant_user_id: uuid, due_on: z.iso.date(), amount_minor: positive,
  status: z.enum(['EXPECTED', 'CONFIRMED', 'SKIPPED', 'CANCELED']),
  timing: z.enum(['UPCOMING', 'DUE', 'OVERDUE']).nullable(), version,
  confirmed_by: uuid.nullable(), confirmed_at: iso.nullable(),
  skipped_by: uuid.nullable(), skipped_at: iso.nullable(),
  canceled_by: uuid.nullable(), canceled_at: iso.nullable(),
}).strict().superRefine((value, ctx) => {
  const confirmed = value.confirmed_by !== null && value.confirmed_at !== null;
  const skipped = value.skipped_by !== null && value.skipped_at !== null;
  const canceled = value.canceled_by !== null && value.canceled_at !== null;
  const valid = value.status === 'EXPECTED' ? value.timing !== null && !confirmed && !skipped && !canceled
    : value.status === 'CONFIRMED' ? value.timing === null && confirmed && value.confirmed_by === value.participant_user_id && !skipped && !canceled
      : value.status === 'SKIPPED' ? value.timing === null && skipped && value.skipped_by === value.participant_user_id && !confirmed && !canceled
        : value.timing === null && canceled && !confirmed && !skipped;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'POOLED_OCCURRENCE_FACTS_INVALID' });
});

export const pooledCommitmentSchema = z.object({
  id: uuid, space_id: uuid, name: z.string().min(1).max(100), cadence: z.enum(['WEEKLY', 'MONTHLY']),
  interval: z.number().int().positive().safe(), starts_on: z.iso.date(), ends_on: z.iso.date().nullable(),
  generated_through: z.iso.date(), status: z.enum(['ACTIVE', 'CANCELED']), version,
  assignments: z.array(z.object({ user_id: uuid, amount_minor: positive }).strict()).min(1),
  occurrences: z.array(occurrenceSchema),
}).strict();

export const pooledReimbursementSchema = z.object({
  id: uuid, expense_id: uuid, participant_user_id: uuid, amount_minor: positive,
  status: z.enum(['AWAITING_PAYMENT', 'SENT', 'COMPLETED']), version,
  sent_by: uuid.nullable(), sent_at: iso.nullable(), received_by: uuid.nullable(), received_at: iso.nullable(),
}).strict().superRefine((value, ctx) => {
  const sent = value.sent_by !== null && value.sent_at !== null;
  const received = value.received_by !== null && value.received_at !== null;
  const valid = value.status === 'AWAITING_PAYMENT' ? !sent && !received
    : value.status === 'SENT' ? sent && !received
      : sent && received && value.received_by === value.participant_user_id;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'POOLED_REIMBURSEMENT_FACTS_INVALID' });
});

export const pooledExpenseSchema = z.object({
  record: expenseRecordSchema,
  payment_source: z.enum(['FUND_PAID', 'PARTICIPANT_ADVANCED']),
  advanced_by_user_id: uuid.nullable(), reimbursement: pooledReimbursementSchema.nullable(),
}).strict().superRefine((value, ctx) => {
  const valid = value.payment_source === 'FUND_PAID'
    ? value.advanced_by_user_id === null && value.reimbursement === null
    : value.advanced_by_user_id !== null && value.reimbursement?.participant_user_id === value.advanced_by_user_id;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'POOLED_PAYMENT_SOURCE_INVALID' });
});

export const pooledExpenseMutationSchema = pooledExpenseSchema.extend({ summary: pooledSummarySchema }).strict();

export const pooledCorrectionSchema = z.object({
  id: uuid, space_id: uuid, source_kind: z.enum(['EXPENSE', 'REIMBURSEMENT', 'RETURN', 'CONTRIBUTION']),
  source_id: uuid, amount_minor: signed, occurred_on: z.iso.date(), reason: z.string().min(1).max(2000),
  created_by: uuid, created_at: iso,
}).strict();

export const pooledReturnSchema = z.object({
  id: uuid, plan_id: uuid, recipient_user_id: uuid, amount_minor: positive,
  status: z.enum(['AWAITING_PAYMENT', 'SENT', 'COMPLETED']), version,
  sent_by: uuid.nullable(), sent_at: iso.nullable(), received_by: uuid.nullable(), received_at: iso.nullable(),
}).strict().superRefine((value, ctx) => {
  const sent = value.sent_by !== null && value.sent_at !== null;
  const received = value.received_by !== null && value.received_at !== null;
  const valid = value.status === 'AWAITING_PAYMENT' ? !sent && !received
    : value.status === 'SENT' ? sent && !received
      : sent && received && value.received_by === value.recipient_user_id;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'POOLED_RETURN_FACTS_INVALID' });
});

export const pooledReturnPlanSchema = z.object({
  id: uuid, space_id: uuid, status: z.enum(['ACTIVE', 'COMPLETED']), version,
  created_by: uuid, created_at: iso, returns: z.array(pooledReturnSchema).min(1),
}).strict().superRefine((value, ctx) => {
  const complete = value.returns.every((item) => item.status === 'COMPLETED');
  if ((value.status === 'COMPLETED') !== complete) ctx.addIssue({ code: 'custom', message: 'POOLED_RETURN_PLAN_FACTS_INVALID' });
});

export const pooledWorkspaceSchema = z.object({
  summary: pooledSummarySchema,
  commitments: z.array(pooledCommitmentSchema),
  expenses: z.array(pooledExpenseSchema),
  corrections: z.array(pooledCorrectionSchema),
  return_plan: pooledReturnPlanSchema.nullable(),
}).strict();

export const pooledOccurrenceMutationSchema = z.object({
  occurrence: occurrenceSchema,
  contribution: z.object({ id: uuid, occurrence_id: uuid, participant_user_id: uuid, amount_minor: positive,
    confirmed_by: uuid, confirmed_at: iso }).strict().nullable(),
  summary: pooledSummarySchema,
}).strict();

export const pooledReimbursementMutationSchema = z.object({ reimbursement: pooledReimbursementSchema, summary: pooledSummarySchema }).strict();
export const pooledCorrectionMutationSchema = z.object({ correction: pooledCorrectionSchema, summary: pooledSummarySchema }).strict();
export const pooledReturnMutationSchema = z.object({ plan: pooledReturnPlanSchema, summary: pooledSummarySchema }).strict();

export type PooledCommitment = z.infer<typeof pooledCommitmentSchema>;
export type PooledExpense = z.infer<typeof pooledExpenseSchema>;
export type PooledSummary = z.infer<typeof pooledSummarySchema>;
export type PooledReturnPlan = z.infer<typeof pooledReturnPlanSchema>;
export type PooledWorkspace = z.infer<typeof pooledWorkspaceSchema>;
