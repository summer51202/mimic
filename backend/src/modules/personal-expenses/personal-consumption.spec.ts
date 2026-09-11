import { groupConsumption } from './personal-consumption';
describe('personal consumption arithmetic', () => {
  it('sums exact values beyond a single row range and groups merged categories', () => {
    expect(groupConsumption([{ category_id: 'a', amount: '9223372036854775807' }, { category_id: 'b', amount: '125' }], new Map([['a', 'b'], ['b', 'b']])))
      .toEqual({ spending_minor: '9223372036854775932', categories: [{ category_id: 'b', spending_minor: '9223372036854775932' }] });
  });
  it('measures active consumption and represents an authoritative empty result', () => {
    expect(groupConsumption([{ category_id: 'a', amount: '125' }], new Map([['a', 'a']])).spending_minor).toBe('125');
    expect(groupConsumption([{ category_id: 'a', amount: '200' }], new Map([['a', 'a']])).spending_minor).toBe('200');
    expect(groupConsumption([], new Map())).toEqual({ spending_minor: '0', categories: [] });
  });
  it('fails instead of silently omitting an unresolved category', () => {
    expect(() => groupConsumption([{ category_id: 'missing', amount: '125' }], new Map())).toThrow();
  });
});
