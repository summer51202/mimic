import { z } from "zod";
import { currencySchema } from "./domain-contracts";

const uuid = z.string().uuid();
const mode = z.enum(["PERSONAL_EXPENSES", "SHARED_EXPENSES", "POOLED_FUND"]);
const status = z.enum(["ACTIVE", "CLOSING", "ARCHIVED"]);
const base = { id: uuid, name: z.string().min(1).max(100), mode, status };
const governance = z.object({
  ...base, mode: z.enum(["SHARED_EXPENSES", "POOLED_FUND"]),
  access: z.literal("GOVERNANCE"),
}).strict();
const participant = z.object({
  ...base, access: z.literal("PARTICIPANT"), currency: currencySchema,
  timezone: z.string().min(1), opened_on: z.iso.date(),
  group_id: uuid.nullable(), owner_user_id: uuid.nullable(),
  role: z.enum(["MANAGER", "PARTICIPANT"]), version: z.number().int().positive().safe(),
  first_formal_record_at: z.iso.datetime({ offset: true }).nullable(),
}).strict().superRefine((value, ctx) => {
  const personal = value.mode === "PERSONAL_EXPENSES";
  if (personal ? value.group_id !== null || value.owner_user_id === null
    : value.group_id === null || value.owner_user_id !== null) {
    ctx.addIssue({ code: "custom", message: "SPACE_SCOPE_INVALID" });
  }
});

export const financialSpaceSchema = z.union([governance, participant]);
export type FinancialSpace = z.infer<typeof financialSpaceSchema>;
