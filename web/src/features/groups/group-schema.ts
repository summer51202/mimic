import { z } from "zod";

const groupNameSchema = z.string().trim().min(1).max(120);

export const createGroupSchema = z.object({
  name: groupNameSchema,
  groupType: z.enum(["couple", "group"]),
  defaultCurrency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{3}$/)),
});

export const renameGroupSchema = z.object({
  name: groupNameSchema,
});

export type CreateGroupValues = z.infer<typeof createGroupSchema>;
export type RenameGroupValues = z.infer<typeof renameGroupSchema>;
