import { describe, expect, it } from 'vitest';
import { applyExpenseCorrections, equalAllocations, sumMinor } from './shared-money';

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
  it('reconstructs the latest correction target from ordered signed deltas exactly', () => {
    const source = { id: 'expense', amount_minor: '9007199254741000',
      payers: [{ user_id: 'a', amount_minor: '9007199254741000' }],
      allocations: [{ user_id: 'a', amount_minor: '400' }, { user_id: 'b', amount_minor: '9007199254740600' }] };
    const target = applyExpenseCorrections(source, [
      { source_expense_id: 'expense', revision: 2, target_amount_minor: '9007199254740850',
        payers: [{ user_id: 'a', amount_minor: '50' }], allocations: [{ user_id: 'a', amount_minor: '20' }, { user_id: 'b', amount_minor: '30' }] },
      { source_expense_id: 'expense', revision: 1, target_amount_minor: '9007199254740800',
        payers: [{ user_id: 'a', amount_minor: '-200' }], allocations: [{ user_id: 'a', amount_minor: '-80' }, { user_id: 'b', amount_minor: '-120' }] },
    ]);
    expect(target).toMatchObject({ amount_minor: '9007199254740850',
      payers: [{ user_id: 'a', amount_minor: '9007199254740850' }],
      allocations: [{ user_id: 'a', amount_minor: '340' }, { user_id: 'b', amount_minor: '9007199254740510' }] });
  });
});
