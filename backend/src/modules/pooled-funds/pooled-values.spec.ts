import {
  deriveOccurrenceTiming,
  materializeDueDates,
  parsePooledSigned,
  parsePooledUnsigned,
  pooledSummary,
} from './pooled-values';

describe('pooled exact values', () => {
  it('keeps unsigned money exact beyond JavaScript safe integers', () => {
    expect(parsePooledUnsigned('9007199254740993')).toBe(9007199254740993n);
    expect(parsePooledUnsigned('9'.repeat(65))).toBe(BigInt('9'.repeat(65)));
  });

  it.each(['-1', '+1', '01', '1.0', '1e3', '', '9'.repeat(66)])(
    'rejects non-canonical unsigned value %s',
    (raw) => expect(() => parsePooledUnsigned(raw)).toThrow('POOLED_AMOUNT_INVALID'),
  );

  it.each([
    ['0', 0n],
    ['-9007199254740993', -9007199254740993n],
    ['9007199254740993', 9007199254740993n],
  ])('parses signed value %s', (raw, expected) => {
    expect(parsePooledSigned(raw)).toBe(expected);
  });

  it.each(['-0', '+1', '01', '-01', '1.0', '9'.repeat(66)])(
    'rejects non-canonical signed value %s',
    (raw) => expect(() => parsePooledSigned(raw)).toThrow('POOLED_AMOUNT_INVALID'),
  );
});

describe('pooled recurrence materialization', () => {
  it('generates weekly dates through an inclusive boundary', () => {
    expect(materializeDueDates({ cadence: 'WEEKLY', interval: 2, startsOn: '2026-09-01', endsOn: null }, '2026-10-01'))
      .toEqual(['2026-09-01', '2026-09-15', '2026-09-29']);
  });

  it('clamps monthly recurrences to the last real day without drifting the anchor', () => {
    expect(materializeDueDates({ cadence: 'MONTHLY', interval: 1, startsOn: '2028-01-31', endsOn: '2028-04-30' }, '2028-04-30'))
      .toEqual(['2028-01-31', '2028-02-29', '2028-03-31', '2028-04-30']);
  });

  it.each([
    [{ cadence: 'WEEKLY', interval: 0, startsOn: '2026-09-01', endsOn: null }, '2026-09-01'],
    [{ cadence: 'MONTHLY', interval: 1, startsOn: '2026-02-30', endsOn: null }, '2026-03-30'],
    [{ cadence: 'MONTHLY', interval: 1, startsOn: '2026-09-01', endsOn: '2026-08-31' }, '2026-09-01'],
    [{ cadence: 'WEEKLY', interval: 1, startsOn: '2026-09-01', endsOn: null }, '2027-09-03'],
  ])('rejects invalid or unbounded schedule %#', (schedule, through) => {
    expect(() => materializeDueDates(schedule as never, through)).toThrow('POOLED_RECURRENCE_INVALID');
  });
});

describe('pooled derived state and summary', () => {
  it.each([
    ['2026-09-13', 'UPCOMING'],
    ['2026-09-12', 'DUE'],
    ['2026-09-11', 'OVERDUE'],
  ])('derives %s as %s in the space-local calendar', (dueOn, timing) => {
    expect(deriveOccurrenceTiming('EXPECTED', dueOn, '2026-09-12')).toBe(timing);
  });

  it.each(['CONFIRMED', 'SKIPPED', 'CANCELED'])('does not derive timing for terminal %s', (status) => {
    expect(deriveOccurrenceTiming(status as never, '2026-09-01', '2026-09-12')).toBeNull();
  });

  it('calculates independent pooled balances and sent-awaiting-receipt', () => {
    expect(pooledSummary({
      confirmedContributions: [1000n],
      fundPaidExpenses: [800n],
      pendingReimbursements: [300n],
      sentReimbursements: [300n],
      completedReimbursements: [],
      sentReturns: [],
      completedReturns: [],
      corrections: [-50n],
    })).toEqual({
      bookBalance: -150n,
      pendingReimbursement: 300n,
      availableBalance: -450n,
      sentAwaitingReceipt: 300n,
      shortfall: 450n,
    });
  });
});
