import { describe, expect, it } from 'vitest';
import { majorToMinorString } from './major-to-minor';

describe('exact expense entry', () => {
  it.each([
    ['1.25', 'TWD', '125'], ['125', 'JPY', '125'], ['1.234', 'KWD', '1234'],
    ['90071992547409.93', 'TWD', '9007199254740993'],
    ['92233720368547758.07', 'TWD', '9223372036854775807'],
  ])('converts %s %s exactly', (value, currency, expected) => {
    expect(majorToMinorString(value, currency)).toBe(expected);
  });
  it.each(['1.001', '0', '-1', '01', '1e3', '1.', '', '92233720368547758.08'])('rejects %s', value => {
    expect(() => majorToMinorString(value, 'TWD')).toThrow();
  });
});
