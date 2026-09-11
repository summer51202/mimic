import { z } from 'zod';
const uuid = z.string().uuid();
export const taxonomyTermSchema = z.object({
  id: uuid, canonical_id: uuid, kind: z.enum(['CATEGORY', 'TAG']), scope: z.enum(['SYSTEM', 'PERSONAL', 'GROUP']),
  name: z.string().min(1), status: z.enum(['ACTIVE', 'ARCHIVED', 'MERGED']), version: z.number().int().positive().safe(),
}).strict();
export const taxonomyPickerSchema = z.object({
  terms: z.array(taxonomyTermSchema), recent_ids: z.array(uuid), frequent_ids: z.array(uuid), context_ids: z.array(uuid),
}).strict();
export type TaxonomyTerm = z.infer<typeof taxonomyTermSchema>;
export type TaxonomyPickerResult = z.infer<typeof taxonomyPickerSchema>;
