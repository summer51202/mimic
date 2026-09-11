import { allocateShared, AllocationInput } from './shared-allocation';

const row = (userId: string, amountMinor: bigint) => ({ userId, amountMinor });

describe('exact shared allocations', () => {
  it('assigns equal-split remainder in stable identity order', () => {
    expect(allocateShared(100n, { mode: 'EQUAL', userIds: ['C', 'B', 'A'] }))
      .toEqual([row('A', 34n), row('B', 33n), row('C', 33n)]);
  });
  it('uses largest remainders for integer ratios', () => {
    expect(allocateShared(100n, { mode: 'RATIO', weights: [row('A', 1n), row('B', 2n)] }))
      .toEqual([row('A', 33n), row('B', 67n)]);
  });
  it('allocates only the remainder after fixed hybrid shares', () => {
    expect(allocateShared(100n, { mode: 'HYBRID', fixed: [row('A', 20n)], weights: [row('B', 1n), row('C', 2n)] }))
      .toEqual([row('A', 20n), row('B', 27n), row('C', 53n)]);
  });
  it('accepts exact fixed allocations including zero', () => {
    expect(allocateShared(100n, { mode: 'FIXED', amounts: [row('B', 100n), row('A', 0n)] }))
      .toEqual([row('A', 0n), row('B', 100n)]);
  });
  it('retains zero shares when hybrid fixed allocations consume the total', () => {
    expect(allocateShared(100n, { mode: 'HYBRID', fixed: [row('A', 100n)], weights: [row('B', 1n)] }))
      .toEqual([row('A', 100n), row('B', 0n)]);
  });
  it('does not change input order or amounts', () => {
    const weights = Object.freeze([Object.freeze(row('B', 1n)), Object.freeze(row('A', 1n))]);
    const result = allocateShared(3n, { mode: 'RATIO', weights });
    expect(result).toEqual(allocateShared(3n, { mode: 'RATIO', weights: [...weights].reverse() }));
    expect(result).toEqual([row('A', 2n), row('B', 1n)]);
  });
  it('preserves precision for huge amounts and weights', () => {
    const large = 9007199254740993n;
    expect(allocateShared(large * 3n + 1n, { mode: 'RATIO', weights: [row('A', large), row('B', large * 2n)] }))
      .toEqual([row('A', large), row('B', large * 2n + 1n)]);
  });
  it.each<AllocationInput>([
    { mode: 'EQUAL', userIds: [] }, { mode: 'EQUAL', userIds: ['A', 'A'] },
    { mode: 'EQUAL', userIds: [''] }, { mode: 'RATIO', weights: [] },
    { mode: 'RATIO', weights: [row('A', 0n)] }, { mode: 'RATIO', weights: [row('A', -1n)] },
    { mode: 'FIXED', amounts: [row('A', -1n), row('B', 101n)] },
    { mode: 'HYBRID', fixed: [row('A', 10n)], weights: [row('A', 1n)] },
    { mode: 'HYBRID', fixed: [row('A', 101n)], weights: [row('B', 1n)] },
  ])('rejects invalid participant selection %#', input => {
    expect(() => allocateShared(100n, input)).toThrow('SHARED_INPUT_INVALID');
  });
  it('rejects fixed allocations with an incorrect total', () => {
    expect(() => allocateShared(100n, { mode: 'FIXED', amounts: [row('A', 99n)] })).toThrow('SHARED_TOTAL_MISMATCH');
  });
  it.each([0n, -1n])('rejects nonpositive ordinary expense %s', amount => {
    expect(() => allocateShared(amount, { mode: 'EQUAL', userIds: ['A'] })).toThrow('SHARED_INPUT_INVALID');
  });
  it('conserves all small totals across all modes', () => {
    for (let total = 1n; total <= 50n; total++) {
      for (const input of [
        { mode: 'EQUAL', userIds: ['A', 'B', 'C'] },
        { mode: 'RATIO', weights: [row('A', 7n), row('B', 3n)] },
        { mode: 'FIXED', amounts: [row('A', total)] },
        { mode: 'HYBRID', fixed: [row('A', 1n)], weights: [row('B', 2n), row('C', 3n)] },
      ] satisfies AllocationInput[]) {
        const result = allocateShared(total, input);
        expect(result.reduce((sum, item) => sum + item.amountMinor, 0n)).toBe(total);
        expect(result.every(item => item.amountMinor >= 0n)).toBe(true);
      }
    }
  });
});
