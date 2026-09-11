export function parseExpenseMinor(raw: string): bigint {
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw) || raw.length > 19) {
    throw new Error('EXPENSE_AMOUNT_INVALID');
  }
  const amount = BigInt(raw);
  if (amount > 9223372036854775807n) throw new Error('EXPENSE_AMOUNT_INVALID');
  return amount;
}

export function parseExpenseDate(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('EXPENSE_DATE_INVALID');
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== raw || raw < '0001-01-01') {
    throw new Error('EXPENSE_DATE_INVALID');
  }
  return date;
}

export function monthBounds(month: string): { start: Date; endExclusive: Date } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < '0001-01') throw new Error('EXPENSE_MONTH_INVALID');
  const start = parseExpenseDate(`${month}-01`);
  const endExclusive = new Date(start);
  endExclusive.setUTCMonth(endExclusive.getUTCMonth() + 1);
  return { start, endExclusive };
}
