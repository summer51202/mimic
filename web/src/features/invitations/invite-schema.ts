import { z } from "zod";

import { inviteCodeSchema } from "@/shared/api/domain-contracts";

export const inviteCodePattern = /^[A-Za-z0-9_-]{12}$/;

export const publicInviteCodeSchema = inviteCodeSchema;

export const inviteCreateSchema = z.object({
  invitedEmail: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const normalized = value.trim().toLowerCase();
      return normalized.length > 0 ? normalized : undefined;
    },
    z.string().email().optional(),
  ),
});

export type InviteCreateValues = z.infer<typeof inviteCreateSchema>;

export function parseInviteCode(code: string): string | null {
  return publicInviteCodeSchema.safeParse(code).success ? code : null;
}
