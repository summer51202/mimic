import { z } from "zod";

export const fundFormSchema = z.object({
  currency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code.")),
  name: z.string().trim().min(1, "Fund name is required.").max(255),
});

export type FundFormValues = z.infer<typeof fundFormSchema>;
