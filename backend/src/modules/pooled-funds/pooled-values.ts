export type PooledOccurrenceStatus = 'EXPECTED' | 'CONFIRMED' | 'SKIPPED' | 'CANCELED';
export type PooledOccurrenceTiming = 'UPCOMING' | 'DUE' | 'OVERDUE';
export type PooledRecurrence = {
  cadence: 'WEEKLY' | 'MONTHLY';
  interval: number;
  startsOn: string;
  endsOn: string | null;
};

const MAX_INTEGER_DIGITS = 65;

export function parsePooledUnsigned(value: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value) || value.length > MAX_INTEGER_DIGITS) {
    throw new Error('POOLED_AMOUNT_INVALID');
  }
  return BigInt(value);
}

export function parsePooledPositive(value: string): bigint {
  const parsed = parsePooledUnsigned(value);
  if (parsed === 0n) throw new Error('POOLED_AMOUNT_INVALID');
  return parsed;
}

export function parsePooledSigned(value: string): bigint {
  if (!/^(0|-?[1-9]\d*)$/.test(value) || value.replace('-', '').length > MAX_INTEGER_DIGITS) {
    throw new Error('POOLED_AMOUNT_INVALID');
  }
  return BigInt(value);
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('POOLED_RECURRENCE_INVALID');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('POOLED_RECURRENCE_INVALID');
  }
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function materializeDueDates(schedule: PooledRecurrence, generateThrough: string): string[] {
  const starts = parseDate(schedule.startsOn);
  const through = parseDate(generateThrough);
  const ends = schedule.endsOn === null ? null : parseDate(schedule.endsOn);
  if (!Number.isSafeInteger(schedule.interval) || schedule.interval < 1 ||
      !['WEEKLY', 'MONTHLY'].includes(schedule.cadence) ||
      (ends !== null && ends < starts) || through < starts) {
    throw new Error('POOLED_RECURRENCE_INVALID');
  }
  const max = new Date(starts);
  max.setUTCDate(max.getUTCDate() + 366);
  if (through > max) throw new Error('POOLED_RECURRENCE_INVALID');
  const boundary = ends !== null && ends < through ? ends : through;
  const results: string[] = [];
  const anchorDay = starts.getUTCDate();
  for (let step = 0; ; step += 1) {
    let due: Date;
    if (schedule.cadence === 'WEEKLY') {
      due = new Date(starts);
      due.setUTCDate(starts.getUTCDate() + step * schedule.interval * 7);
    } else {
      const first = new Date(Date.UTC(starts.getUTCFullYear(), starts.getUTCMonth() + step * schedule.interval, 1));
      const finalDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
      due = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(anchorDay, finalDay)));
    }
    if (due > boundary) break;
    results.push(isoDate(due));
  }
  return results;
}

export function deriveOccurrenceTiming(
  status: PooledOccurrenceStatus,
  dueOn: string,
  today: string,
): PooledOccurrenceTiming | null {
  if (status !== 'EXPECTED') return null;
  parseDate(dueOn);
  parseDate(today);
  if (dueOn > today) return 'UPCOMING';
  if (dueOn === today) return 'DUE';
  return 'OVERDUE';
}

export type PooledSummaryInput = {
  confirmedContributions: bigint[];
  fundPaidExpenses: bigint[];
  pendingReimbursements: bigint[];
  sentReimbursements: bigint[];
  completedReimbursements: bigint[];
  sentReturns: bigint[];
  completedReturns: bigint[];
  corrections: bigint[];
};

const sum = (values: bigint[]) => values.reduce((total, value) => total + value, 0n);

export function pooledSummary(input: PooledSummaryInput) {
  const bookBalance = sum(input.confirmedContributions) - sum(input.fundPaidExpenses) -
    sum(input.sentReimbursements) - sum(input.completedReimbursements) -
    sum(input.sentReturns) - sum(input.completedReturns) + sum(input.corrections);
  const pendingReimbursement = sum(input.pendingReimbursements);
  const availableBalance = bookBalance - pendingReimbursement;
  return {
    bookBalance,
    pendingReimbursement,
    availableBalance,
    sentAwaitingReceipt: sum(input.sentReimbursements),
    shortfall: availableBalance < 0n ? -availableBalance : 0n,
  };
}
