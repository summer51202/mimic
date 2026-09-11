import { parseExpenseDate } from '../expense-records/expense-values';
export function deriveSharedPeriod(openedOn: string, previousEnd: string | null, end: string, today: string): { start: string; end: string } {
  try {
    parseExpenseDate(openedOn); parseExpenseDate(end); parseExpenseDate(today);
    let start = openedOn;
    if (previousEnd !== null) {
      const date = parseExpenseDate(previousEnd);
      if (previousEnd < openedOn) throw new Error();
      date.setUTCDate(date.getUTCDate() + 1);
      start = date.toISOString().slice(0, 10);
      parseExpenseDate(start);
    }
    if (end < start || end > today) throw new Error();
    return { start, end };
  } catch { throw new Error('SHARED_PERIOD_INVALID'); }
}
export function parseSharedUnsigned(raw: string): bigint {
  if (typeof raw !== 'string' || !/^(0|[1-9][0-9]*)$/.test(raw) || raw.length > 65) throw new Error('SHARED_AMOUNT_INVALID');
  return BigInt(raw);
}
