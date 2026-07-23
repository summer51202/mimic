import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "請輸入電子郵件。")
  .email("請輸入有效的電子郵件地址。");

const passwordRequiredSchema = z.string().min(1, "請輸入密碼。");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordRequiredSchema,
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "請輸入顯示名稱。"),
  email: emailSchema,
  password: z.string().min(6, "密碼至少需要 6 個字元。"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
