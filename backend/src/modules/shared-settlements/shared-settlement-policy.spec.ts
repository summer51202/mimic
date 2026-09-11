import { deriveSharedPeriod, parseSharedUnsigned } from './shared-settlement-policy';

describe('shared settlement calendar policy', () => {
  it('starts the first period at opening', () => expect(deriveSharedPeriod('2026-09-01', null, '2026-09-10', '2026-09-11')).toEqual({ start: '2026-09-01', end: '2026-09-10' }));
  it.each([
    ['2028-02-28', '2028-02-29'], ['2028-02-29', '2028-03-01'], ['2026-12-31', '2027-01-01'],
  ])('starts after %s on %s', (previous, next) => expect(deriveSharedPeriod('2020-01-01', previous, next, next).start).toBe(next));
  it.each(['2026-02-30', '2026-08-31', '2026-09-12'])('rejects invalid/inverted/future end %s', end => {
    expect(() => deriveSharedPeriod('2026-09-01', null, end, '2026-09-11')).toThrow('SHARED_PERIOD_INVALID');
  });
  it('rejects a previously covered end', () => expect(() => deriveSharedPeriod('2026-09-01', '2026-09-10', '2026-09-10', '2026-09-11')).toThrow('SHARED_PERIOD_INVALID'));
});
describe('wide minor-unit integers', () => {
  it('accepts zero and exact 65-digit values', () => {
    expect(parseSharedUnsigned('0')).toBe(0n);
    expect(parseSharedUnsigned('9'.repeat(65))).toBe(BigInt('9'.repeat(65)));
  });
  it.each(['-1', '01', '1.0', '1e3', '', '9'.repeat(66)])('rejects %s', raw => expect(() => parseSharedUnsigned(raw)).toThrow('SHARED_AMOUNT_INVALID'));
});
