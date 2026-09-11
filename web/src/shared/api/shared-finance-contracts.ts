import { z } from 'zod';
import { currencySchema } from './domain-contracts';
import { expenseRecordSchema } from './personal-expense-contracts';

const uuid = z.string().uuid();
const iso = z.iso.datetime({ offset: true });
const safeVersion = z.number().int().positive().safe();
const canonicalUnsigned = z.string().regex(/^(0|[1-9]\d*)$/);
const canonicalPositive = z.string().regex(/^[1-9]\d*$/);
const canonicalSigned = z.string().regex(/^(0|-?[1-9]\d*)$/);
const amountRowSchema = z.object({ user_id: uuid, amount_minor: canonicalUnsigned }).strict();
const signedAmountRowSchema = z.object({ user_id: uuid, amount_minor: canonicalSigned }).strict();

export const sharedParticipantSchema = z.object({
  id: uuid, user_id: uuid, display_name: z.string().min(1), role: z.enum(['MANAGER', 'PARTICIPANT']),
  effective_from: z.iso.date(), effective_to: z.iso.date().nullable(),
}).strict();

export const sharedExpenseSchema = expenseRecordSchema.extend({
  payers: z.array(amountRowSchema).min(1).max(16), allocations: z.array(amountRowSchema).min(1).max(16),
}).strict();

export const sharedExpenseMutationSchema = z.object({
  record: sharedExpenseSchema, change_minor: canonicalSigned,
  position_changes: z.array(signedAmountRowSchema),
}).strict();

export const sharedExpensePageSchema = z.object({
  space_id: uuid, space_version: safeVersion, items: z.array(sharedExpenseSchema), next_cursor: uuid.nullable(),
}).strict();

export const sharedSummarySchema = z.object({
  space_id: uuid, mode: z.literal('SHARED_EXPENSES'), currency: currencySchema, space_version: safeVersion,
  spending_minor: canonicalSigned, positions: z.array(signedAmountRowSchema),
}).strict();

export const sharedCorrectionSchema = z.object({
  id: uuid, space_id: uuid, source_expense_id: uuid.nullable(), source_transfer_id: uuid.nullable(),
  revision: z.number().int().nonnegative().safe(), occurred_on: z.iso.date(), reason: z.string().min(1).max(2000),
  amount_minor: canonicalSigned, target_amount_minor: canonicalUnsigned,
  payers: z.array(signedAmountRowSchema).max(16), allocations: z.array(signedAmountRowSchema).max(16),
  created_by: uuid, created_at: iso,
}).strict().superRefine((value, ctx) => {
  if ((value.source_expense_id === null) === (value.source_transfer_id === null)) {
    ctx.addIssue({ code: 'custom', message: 'SHARED_CORRECTION_SOURCE_INVALID' });
  }
});

const sharedTransferSchema = z.object({
  id: uuid, from_user_id: uuid, to_user_id: uuid, amount_minor: canonicalPositive,
  status: z.enum(['AWAITING_PAYMENT', 'SENT', 'COMPLETED']), version: safeVersion,
  sent_by: uuid.nullable(), sent_at: iso.nullable(), received_by: uuid.nullable(), received_at: iso.nullable(),
}).strict().superRefine((value, ctx) => {
  if ((value.sent_by === null) !== (value.sent_at === null) || (value.received_by === null) !== (value.received_at === null)) {
    ctx.addIssue({ code: 'custom', message: 'SHARED_TRANSFER_FACTS_INVALID' });
    return;
  }
  const hasSent = value.sent_by !== null && value.sent_at !== null;
  const hasReceived = value.received_by !== null && value.received_at !== null;
  const valid = value.status === 'AWAITING_PAYMENT' ? !hasSent && !hasReceived
    : value.status === 'SENT' ? hasSent && !hasReceived : hasSent && hasReceived;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'SHARED_TRANSFER_FACTS_INVALID' });
});

const batchSnapshotSchema = z.object({
  expenses: z.array(sharedExpenseSchema), corrections: z.array(sharedCorrectionSchema),
  positions: z.array(signedAmountRowSchema),
}).strict();

export const sharedBatchSchema = z.object({
  id: uuid, space_id: uuid, period_start: z.iso.date(), period_end: z.iso.date(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELED']), version: safeVersion,
  snapshot: batchSnapshotSchema, created_by: uuid, created_at: iso,
  completed_by: uuid.nullable(), completed_at: iso.nullable(), canceled_by: uuid.nullable(), canceled_at: iso.nullable(),
  transfers: z.array(sharedTransferSchema),
}).strict().superRefine((value, ctx) => {
  const completed = value.completed_by !== null && value.completed_at !== null;
  const canceled = value.canceled_by !== null && value.canceled_at !== null;
  const valid = value.status === 'PENDING' ? !completed && !canceled
    : value.status === 'COMPLETED' ? completed && !canceled : canceled && !completed;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'SHARED_BATCH_FACTS_INVALID' });
});

export const sharedBatchPageSchema = z.object({ items: z.array(sharedBatchSchema), next_cursor: uuid.nullable() }).strict();
export const sharedCorrectionPageSchema = z.object({ items: z.array(sharedCorrectionSchema), next_cursor: uuid.nullable() }).strict();

export type SharedParticipant = z.infer<typeof sharedParticipantSchema>;
export type SharedExpense = z.infer<typeof sharedExpenseSchema>;
export type SharedExpenseMutation = z.infer<typeof sharedExpenseMutationSchema>;
export type SharedExpensePage = z.infer<typeof sharedExpensePageSchema>;
export type SharedSummary = z.infer<typeof sharedSummarySchema>;
export type SharedCorrection = z.infer<typeof sharedCorrectionSchema>;
export type SharedBatch = z.infer<typeof sharedBatchSchema>;
export type SharedTransfer = SharedBatch['transfers'][number];
