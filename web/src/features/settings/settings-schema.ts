import { z } from "zod";

export const mimicIdSchema = z
  .string()
  .regex(/^MIMIC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);

export const settingsProfileSchema = z.object({
  id: z.string().trim().min(1).max(128),
  mimic_id: mimicIdSchema,
  email: z.string().email(),
  display_name: z.string().trim().min(1).max(100),
  locale: z.string().trim().min(1).max(20),
  timezone: z.string().trim().min(1).max(100),
});

export const displayNameSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
});

export type SettingsProfile = z.infer<typeof settingsProfileSchema>;
