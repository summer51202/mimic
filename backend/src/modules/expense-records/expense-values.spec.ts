import { monthBounds, parseExpenseDate, parseExpenseMinor } from './expense-values';

describe('expense values', () => {
  it.each(['1', '9007199254740993', '9223372036854775807'])('preserves exact %s', value => {
    expect(parseExpenseMinor(value)).toBe(BigInt(value));
  });
  it.each(['0', '-1', '+1', '01', '1.25', '1e3', '', '9223372036854775808'])('rejects invalid amount %s', value => {
    expect(() => parseExpenseMinor(value)).toThrow('EXPENSE_AMOUNT_INVALID');
  });
  it('accepts leap day without timezone shifts', () => {
    expect(parseExpenseDate('2028-02-29').toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });
  it.each(['2026-02-29', '2026-02-30', '2026-9-1', '0000-01-01', '2026-09-11T00:00:00Z'])('rejects invalid DATE %s', value => {
    expect(() => parseExpenseDate(value)).toThrow('EXPENSE_DATE_INVALID');
  });
  it('uses an exclusive next-month boundary across the year', () => {
    expect(monthBounds('2026-12')).toEqual({ start: new Date('2026-12-01T00:00:00Z'), endExclusive: new Date('2027-01-01T00:00:00Z') });
  });
  it.each(['2026-00', '2026-13', '2026-1', '0000-01'])('rejects invalid month %s', value => {
    expect(() => monthBounds(value)).toThrow('EXPENSE_MONTH_INVALID');
  });
});
