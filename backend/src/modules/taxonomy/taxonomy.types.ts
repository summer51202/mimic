import { TaxonomyKind, TaxonomyScope, TaxonomyStatus } from '@prisma/client';
export interface TaxonomyTermProjection {
  id: string; kind: TaxonomyKind; scope: TaxonomyScope; name: string;
  status: TaxonomyStatus; canonical_id: string; version: number;
}
export interface TaxonomyPickerResult {
  terms: TaxonomyTermProjection[]; recent_ids: string[]; frequent_ids: string[]; context_ids: string[];
}
