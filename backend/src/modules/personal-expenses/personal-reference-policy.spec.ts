import {
  comparePersonalEntries,
  isReferenceSourceLocked,
  referenceAllocation,
  referenceDelta,
  resolveReferenceCategory,
} from './personal-reference-policy';

describe('personal shared-reference policy', () => {
  it('selects the owner allocation exactly as bigint and rejects zero or absent shares', () => {
    expect(referenceAllocation([
      { userId: 'owner', amountMinor: 9_007_199_254_740_993n },
      { userId: 'other', amountMinor: 1n },
    ], 'owner')).toBe(9_007_199_254_740_993n);
    expect(() => referenceAllocation([{ userId: 'owner', amountMinor: 0n }], 'owner')).toThrow('PERSONAL_REFERENCE_ALLOCATION_REQUIRED');
    expect(() => referenceAllocation([], 'owner')).toThrow('PERSONAL_REFERENCE_ALLOCATION_REQUIRED');
  });

  it('computes signed mutation deltas without Number conversion', () => {
    expect(referenceDelta(null, 9_007_199_254_740_993n)).toBe(9_007_199_254_740_993n);
    expect(referenceDelta(9_007_199_254_740_993n, null)).toBe(-9_007_199_254_740_993n);
    expect(referenceDelta(4n, 7n)).toBe(3n);
  });

  it('resolves a merged source category to its canonical id and name', () => {
    expect(resolveReferenceCategory('old', [
      { id: 'old', name: 'Meals', mergedIntoId: 'food' },
      { id: 'food', name: 'Food', mergedIntoId: null },
    ])).toEqual({ category_id: 'food', category_name: 'Food' });
  });

  it('marks only a completed batch covering the source date as permanently locked', () => {
    const batches = [
      { status: 'CANCELED' as const, periodStart: '2026-09-01', periodEnd: '2026-09-30' },
      { status: 'COMPLETED' as const, periodStart: '2026-08-01', periodEnd: '2026-08-31' },
    ];
    expect(isReferenceSourceLocked('2026-09-12', batches)).toBe(false);
    expect(isReferenceSourceLocked('2026-08-12', batches)).toBe(true);
  });

  it('sorts mixed entry kinds by date then id descending', () => {
    const rows = [
      { id: 'a', occurred_on: '2026-09-10' },
      { id: 'c', occurred_on: '2026-09-11' },
      { id: 'b', occurred_on: '2026-09-10' },
    ];
    expect([...rows].sort(comparePersonalEntries).map(row => row.id)).toEqual(['c', 'b', 'a']);
  });
});
