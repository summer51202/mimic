import { z } from 'zod';
import { currencySchema } from './domain-contracts';

const uuid = z.string().uuid();
const iso = z.iso.datetime({ offset: true });
const signed = z.string().regex(/^(0|-?[1-9]\d*)$/);
const unsigned = z.string().regex(/^(0|[1-9]\d*)$/);
const status = z.enum(['ACTIVE', 'CLOSING', 'ARCHIVED']);
const activity = z.object({ id: uuid, title: z.string().min(1).max(200), occurred_on: z.iso.date(), amount_minor: unsigned }).strict();
const participant = { access: z.literal('PARTICIPANT'), id: uuid, name: z.string().min(1).max(100),
  currency: currencySchema, status, recent_activity: z.array(activity).max(3) };

const personalCard = z.object({ ...participant, mode: z.literal('PERSONAL_EXPENSES'), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  spending_minor: unsigned, recent_categories: z.array(z.object({ category_id: uuid, category_name: z.string().min(1), spending_minor: unsigned }).strict()).max(3) }).strict();
const sharedCard = z.object({ ...participant, mode: z.literal('SHARED_EXPENSES'), spending_minor: signed,
  current_user_position_minor: signed, pending_batch: z.object({ id: uuid, period_end: z.iso.date() }).strict().nullable() }).strict();
const pooledCard = z.object({ ...participant, mode: z.literal('POOLED_FUND'), book_balance_minor: signed,
  pending_reimbursement_minor: unsigned, available_balance_minor: signed, shortfall_minor: unsigned,
  next_occurrence: z.object({ id: uuid, due_on: z.iso.date(), amount_minor: unsigned,
    timing: z.enum(['UPCOMING', 'DUE', 'OVERDUE']) }).strict().nullable() }).strict();
const governanceCard = z.object({ access: z.literal('GOVERNANCE'), id: uuid, name: z.string().min(1).max(100),
  mode: z.enum(['SHARED_EXPENSES', 'POOLED_FUND']), status }).strict();

export const homeCardSchema = z.union([personalCard, sharedCard, pooledCard, governanceCard]);
export const homeResponseSchema = z.object({
  context: z.union([z.object({ kind: z.literal('PERSONAL') }).strict(),
    z.object({ kind: z.literal('GROUP'), id: uuid, name: z.string().min(1) }).strict()]),
  cards: z.array(homeCardSchema), task_count: z.number().int().nonnegative().safe(), generated_at: iso,
}).strict();

const taskSchema = z.object({
  id: z.string().regex(/^(POOLED_CONTRIBUTION|POOLED_REIMBURSEMENT_SEND|POOLED_REIMBURSEMENT_RECEIVE|SHARED_TRANSFER_SEND|SHARED_TRANSFER_RECEIVE|POOLED_SHORTFALL):[0-9a-f-]{36}$/i),
  kind: z.enum(['POOLED_CONTRIBUTION', 'POOLED_REIMBURSEMENT_SEND', 'POOLED_REIMBURSEMENT_RECEIVE', 'SHARED_TRANSFER_SEND', 'SHARED_TRANSFER_RECEIVE', 'POOLED_SHORTFALL']),
  urgency: z.enum(['ACTION_REQUIRED', 'OVERDUE', 'ATTENTION']),
  space: z.object({ id: uuid, name: z.string().min(1).max(100), mode: z.enum(['SHARED_EXPENSES', 'POOLED_FUND']), currency: currencySchema }).strict(),
  amount_minor: unsigned, due_on: z.iso.date().nullable(), href: z.string().regex(/^\/app\/spaces\/[0-9a-f-]{36}$/i),
}).strict().superRefine((value, ctx) => {
  if (value.href !== `/app/spaces/${value.space.id}`) ctx.addIssue({ code: 'custom', message: 'TASK_HREF_INVALID' });
  if (value.kind.startsWith('SHARED_') !== (value.space.mode === 'SHARED_EXPENSES')) ctx.addIssue({ code: 'custom', message: 'TASK_MODE_INVALID' });
});

export const taskCenterSchema = z.object({ items: z.array(taskSchema), count: z.number().int().nonnegative().safe(), generated_at: iso }).strict()
  .refine((value) => value.count === value.items.length, 'TASK_COUNT_INVALID');

export type HomeResponse = z.infer<typeof homeResponseSchema>;
export type HomeCard = z.infer<typeof homeCardSchema>;
export type TaskCenter = z.infer<typeof taskCenterSchema>;
export type HomeTask = z.infer<typeof taskSchema>;
