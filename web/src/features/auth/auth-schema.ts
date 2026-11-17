import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "emailRequired")
  .email("emailInvalid");

const passwordRequiredSchema = z.string().min(1, "passwordRequired");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordRequiredSchema,
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "displayNameRequired"),
  email: emailSchema,
  password: z.string().min(6, "passwordTooShort"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
