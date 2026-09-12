import { z } from "zod";

export const idSchema = z.string().trim().min(1).max(128);
export const currencySchema = z.string().regex(/^[A-Z]{3}$/);
export const minorUnitSchema = z
  .union([z.string(), z.number().int().safe()])
  .transform((value) => String(value))
  .pipe(z.string().regex(/^-?(0|[1-9]\d*)$/));
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const inviteCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{12}$/);
export const mimicIdSchema = z
  .string()
  .regex(/^MIMIC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);

const labelSchema = z.string().trim().min(1).max(255);
const statusSchema = z.string().trim().min(1).max(32);
const isoDateTimeSchema = z.string().datetime({ offset: true });

export const groupSchema = z.object({
  id: idSchema,
  name: labelSchema,
  group_type: statusSchema,
  default_currency: currencySchema,
  status: statusSchema,
});

export const groupDetailSchema = groupSchema.extend({
  role: statusSchema,
  current_user_id: idSchema,
});

export const memberSchema = z.object({
  user_id: idSchema,
  display_name: labelSchema,
  mimic_id: mimicIdSchema,
  role: statusSchema,
  status: statusSchema,
});

export const inviteCreatedSchema = z.object({
  invite_id: idSchema,
  invite_code: inviteCodeSchema,
  invited_email: z.string().email().nullable().optional(),
  expires_at: isoDateTimeSchema,
  status: statusSchema,
});

export const inviteAcceptResultSchema = z.object({
  group_id: idSchema,
  group_name: labelSchema,
  role: statusSchema,
  joined_at: isoDateTimeSchema,
});

export type Group = z.infer<typeof groupSchema>;
export type GroupDetail = z.infer<typeof groupDetailSchema>;
export type Member = z.infer<typeof memberSchema>;
export type InviteCreated = z.infer<typeof inviteCreatedSchema>;
export type InviteAcceptResult = z.infer<typeof inviteAcceptResultSchema>;
