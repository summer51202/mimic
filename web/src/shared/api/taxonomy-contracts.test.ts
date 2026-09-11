import { describe, expect, it } from 'vitest';
import { taxonomyTermSchema, taxonomyPickerSchema } from './taxonomy-contracts';
const id = '20000000-0000-4000-8000-000000000016';
const term = { id, canonical_id: id, kind: 'CATEGORY', scope: 'SYSTEM', name: '未分類', status: 'ACTIVE', version: 1 };
describe('taxonomy contracts', () => {
  it('supports stable localized identity and ranked IDs', () => {
    expect(taxonomyTermSchema.parse(term)).toEqual(term);
    expect(taxonomyPickerSchema.parse({ terms: [term], recent_ids: [id], frequent_ids: [], context_ids: [] }).recent_ids).toEqual([id]);
  });
  it.each([{ scope: 'OTHER' }, { kind: 'EXPENSE' }, { usage: 100 }, { amount_minor: '1' }])('rejects %j', value => {
    expect(taxonomyTermSchema.safeParse({ ...term, ...value }).success).toBe(false);
  });
});
