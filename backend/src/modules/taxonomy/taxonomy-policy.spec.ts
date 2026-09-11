import { canMerge, normalizeTermName, resolveCanonical, rankTermIds } from './taxonomy-policy';

describe('taxonomy identity policy', () => {
  const term = { id: 'a', kind: 'CATEGORY' as const, scope: 'PERSONAL' as const, scopeKey: 'PERSONAL:owner', status: 'ACTIVE' as const, mergedIntoId: null };
  it('normalizes custom names without changing identities', () => {
    expect(normalizeTermName('  ＣＯＦＦＥＥ  ')).toBe('coffee');
    expect(() => normalizeTermName(' ')).toThrow();
  });
  it('restricts merges to same kind and scope or system target', () => {
    expect(canMerge(term, { ...term, id: 'b' })).toBe(true);
    expect(canMerge(term, { ...term, id: 'b', scope: 'SYSTEM', scopeKey: 'SYSTEM' })).toBe(true);
    expect(canMerge(term, { ...term, id: 'b', scopeKey: 'PERSONAL:other' })).toBe(false);
    expect(canMerge(term, { ...term, id: 'b', kind: 'TAG' })).toBe(false);
    expect(canMerge({ ...term, scope: 'SYSTEM' }, { ...term, id: 'b' })).toBe(false);
  });
  it('resolves chains and rejects cycles or missing targets', () => {
    const terms = new Map([
      ['a', { ...term, status: 'MERGED' as const, mergedIntoId: 'b' }],
      ['b', { ...term, id: 'b', status: 'MERGED' as const, mergedIntoId: 'c' }],
      ['c', { ...term, id: 'c' }],
    ]);
    expect(resolveCanonical('a', terms)).toBe('c');
    terms.set('c', { ...term, id: 'c', status: 'MERGED', mergedIntoId: 'a' });
    expect(() => resolveCanonical('a', terms)).toThrow('TAXONOMY_MERGE_CYCLE');
    expect(() => resolveCanonical('missing', terms)).toThrow('TAXONOMY_NOT_FOUND');
  });
  it('ranks recent then frequent then context then defaults without duplicates', () => {
    expect(rankTermIds(['b', 'a'], ['a', 'c'], ['d', 'c'], ['a', 'b', 'c', 'd', 'e']))
      .toEqual(['b', 'a', 'c', 'd', 'e']);
  });
});
