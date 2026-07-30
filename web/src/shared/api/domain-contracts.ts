import { z } from "zod";

export const idSchema = z.string().trim().min(1).max(128);
export const currencySchema = z.string().regex(/^[A-Z]{3}$/);
export const minorUnitSchema = z
  .union([z.string(), z.number().int().safe()])
  .transform((value) => String(value))
  .pipe(z.string().regex(/^-?(0|[1-9]\d*)$/));
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const inviteCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{12}$/);

const labelSchema = z.string().trim().min(1).max(255);
const statusSchema = z.string().trim().min(1).max(32);
const nullableIsoDateSchema = isoDateSchema.nullable();
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

export const fundSchema = z.object({
  id: idSchema,
  name: labelSchema,
  currency: currencySchema,
  status: statusSchema,
  balance_minor: minorUnitSchema,
});

const memberPositionSchema = z.object({
  user_id: idSchema,
  display_name: labelSchema,
  membership_status: statusSchema,
  position_minor: minorUnitSchema,
});

export const periodTotalsSchema = z.object({
  net_change_minor: minorUnitSchema,
  contribution_minor: minorUnitSchema,
  expense_minor: minorUnitSchema,
  member_positions: z.array(memberPositionSchema),
});

const summaryFundSchema = z.object({
  id: idSchema,
  group_id: idSchema,
  name: labelSchema,
  currency: currencySchema,
  status: statusSchema,
  cash_balance_minor: minorUnitSchema,
});

export const fundSummarySchema = z.object({
  fund: summaryFundSchema,
  current_period: z.object({
    period_start: nullableIsoDateSchema,
    period_end: nullableIsoDateSchema,
    last_completed_settlement_id: idSchema.nullable(),
    last_completed_period_end: nullableIsoDateSchema,
  }),
  current: periodTotalsSchema,
  all_time: periodTotalsSchema,
});

const dashboardFundSchema = z.object({
  fund_id: idSchema,
  name: labelSchema,
  cash_balance_minor: minorUnitSchema,
  current_net_change_minor: minorUnitSchema,
  period_start: nullableIsoDateSchema,
  period_end: nullableIsoDateSchema,
});

export const groupDashboardSchema = z.object({
  group: z.object({
    id: idSchema,
    name: labelSchema,
    default_currency: currencySchema,
  }),
  currencies: z.array(
    z.object({
      currency: currencySchema,
      cash_balance_minor: minorUnitSchema,
      current: periodTotalsSchema,
      all_time: periodTotalsSchema,
      funds: z.array(dashboardFundSchema),
    }),
  ),
});

export type Group = z.infer<typeof groupSchema>;
export type GroupDetail = z.infer<typeof groupDetailSchema>;
export type Member = z.infer<typeof memberSchema>;
export type InviteCreated = z.infer<typeof inviteCreatedSchema>;
export type InviteAcceptResult = z.infer<typeof inviteAcceptResultSchema>;
export type Fund = z.infer<typeof fundSchema>;
export type PeriodTotals = z.infer<typeof periodTotalsSchema>;
export type FundSummary = z.infer<typeof fundSummarySchema>;
export type GroupDashboard = z.infer<typeof groupDashboardSchema>;
