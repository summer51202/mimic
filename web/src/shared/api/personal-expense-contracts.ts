import { z } from 'zod';
import { currencySchema } from './domain-contracts';
const uuid = z.string().uuid();
const nonnegative = z.string().regex(/^(0|[1-9]\d*)$/);
const positive = z.string().refine(value => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= BigInt('9223372036854775807'));
const signed = z.string().regex(/^(0|-?[1-9]\d*)$/);
export const expenseRecordSchema = z.object({
  id: uuid, space_id: uuid, amount_minor: positive, currency: currencySchema, occurred_on: z.iso.date(),
  title: z.string().min(1).max(200), note: z.string().max(2000).nullable(), category_id: uuid,
  tag_ids: z.array(uuid).max(20), status: z.enum(['ACTIVE', 'DELETED']), version: z.number().int().positive().safe(),
  created_by: uuid, updated_by: uuid, created_at: z.iso.datetime({ offset: true }), updated_at: z.iso.datetime({ offset: true }),
}).strict();
export const expenseMutationSchema = z.object({ record: expenseRecordSchema, change_minor: signed }).strict();
const categoryName = z.string().min(1).max(60);
export const personalManualEntrySchema = expenseRecordSchema.extend({
  entry_type: z.literal('MANUAL'), category_name: categoryName,
}).strict();
export const personalReferenceEntrySchema = z.object({
  entry_type: z.literal('SHARED_REFERENCE'), id: uuid, space_id: uuid, source_space_id: uuid,
  source_expense_id: uuid, owner_user_id: uuid, amount_minor: nonnegative, currency: currencySchema,
  occurred_on: z.iso.date(), title: z.string().min(1).max(200), note: z.string().max(2000).nullable(),
  category_id: uuid, category_name: categoryName, tag_ids: z.array(uuid).max(20), status: z.literal('ACTIVE'),
  version: z.number().int().positive().safe(), source_locked: z.boolean(),
  created_at: z.iso.datetime({ offset: true }), updated_at: z.iso.datetime({ offset: true }),
}).strict();
export const personalMonthEntrySchema = z.discriminatedUnion('entry_type', [personalManualEntrySchema, personalReferenceEntrySchema]);
export const personalReferenceSchema = z.object({
  id: uuid, personal_space_id: uuid, source_expense_id: uuid, owner_user_id: uuid,
  note: z.string().max(2000).nullable(), tag_ids: z.array(uuid).max(20), status: z.enum(['ACTIVE', 'REMOVED']),
  version: z.number().int().positive().safe(), created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
}).strict();
export const personalReferenceMutationSchema = z.object({ reference: personalReferenceSchema, change_minor: signed }).strict();
export const personalMonthSchema = z.object({
  space_id: uuid, mode: z.literal('PERSONAL_EXPENSES'), currency: currencySchema,
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), space_version: z.number().int().positive().safe(),
  view_version: z.string().regex(/^[a-f0-9]{64}$/), spending_minor: nonnegative,
  categories: z.array(z.object({ category_id: uuid, category_name: categoryName, spending_minor: nonnegative }).strict()),
  items: z.array(personalMonthEntrySchema), next_cursor: uuid.nullable(),
}).strict();
export type PersonalExpense = z.infer<typeof expenseRecordSchema>;
export type ExpenseMutation = z.infer<typeof expenseMutationSchema>;
export type PersonalMonth = z.infer<typeof personalMonthSchema>;
export type PersonalMonthEntry = z.infer<typeof personalMonthEntrySchema>;
export type PersonalReferenceEntry = z.infer<typeof personalReferenceEntrySchema>;
export type PersonalReference = z.infer<typeof personalReferenceSchema>;
export type PersonalReferenceMutation = z.infer<typeof personalReferenceMutationSchema>;
