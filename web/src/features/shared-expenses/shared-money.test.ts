import { describe, expect, it } from 'vitest';
import { equalAllocations, sumMinor } from './shared-money';

describe('exact shared money helpers', () => {
  it('sums beyond Number safe range without precision loss', () => {
    expect(sumMinor(['9007199254740993', '7'])).toBe('9007199254741000');
  });
  it('allocates deterministic integer remainders by stable user id', () => {
    expect(equalAllocations('100', ['b', 'a', 'c'])).toEqual([
      { user_id: 'a', amount_minor: '34' },
      { user_id: 'b', amount_minor: '33' },
      { user_id: 'c', amount_minor: '33' },
    ]);
  });
  it('rejects noncanonical values and duplicate participants', () => {
    expect(() => sumMinor(['1.2'])).toThrow();
    expect(() => equalAllocations('1', ['a', 'a'])).toThrow();
  });
});
