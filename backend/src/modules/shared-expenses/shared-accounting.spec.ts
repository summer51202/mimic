import { sharedPositions, validateSharedExpense, SharedEffect, SharedPayment } from './shared-accounting';

const expense: SharedEffect = {
  amountMinor: 1000n,
  payers: [{ userId: 'A', amountMinor: 1000n }],
  allocations: [{ userId: 'A', amountMinor: 400n }, { userId: 'B', amountMinor: 600n }],
};
const payment: SharedPayment = { fromUserId: 'B', toUserId: 'A', amountMinor: 600n, status: 'COMPLETED' };

describe('shared expense positions', () => {
  it('uses paid minus allocated, with positive meaning receivable', () => {
    expect(sharedPositions([expense], [])).toEqual([
      { userId: 'A', amountMinor: 600n }, { userId: 'B', amountMinor: -600n },
    ]);
  });
  it.each(['AWAITING_PAYMENT', 'SENT'] as const)('does not post %s transfers', status => {
    expect(sharedPositions([expense], [{ ...payment, status }])).toEqual(sharedPositions([expense], []));
  });
  it('posts completed sent positively and received negatively', () => {
    expect(sharedPositions([expense], [payment])).toEqual([
      { userId: 'A', amountMinor: 0n }, { userId: 'B', amountMinor: 0n },
    ]);
  });
  it('supports multiple payers and amounts above Number.MAX_SAFE_INTEGER', () => {
    const large = 9007199254740993n;
    expect(sharedPositions([{
      amountMinor: large + 1n,
      payers: [{ userId: 'A', amountMinor: large }, { userId: 'B', amountMinor: 1n }],
      allocations: [{ userId: 'B', amountMinor: large + 1n }],
    }], [])).toEqual([{ userId: 'A', amountMinor: large }, { userId: 'B', amountMinor: -large }]);
  });
  it('supports a signed reversal without changing the source', () => {
    const reverse = { amountMinor: -1000n,
      payers: expense.payers.map(row => ({ ...row, amountMinor: -row.amountMinor })),
      allocations: expense.allocations.map(row => ({ ...row, amountMinor: -row.amountMinor })),
    };
    expect(sharedPositions([expense, reverse], []).every(row => row.amountMinor === 0n)).toBe(true);
    expect(expense.amountMinor).toBe(1000n);
  });
  it('supports zero-total allocation redistribution', () => {
    expect(sharedPositions([{ amountMinor: 0n, payers: [], allocations: [
      { userId: 'A', amountMinor: -100n }, { userId: 'B', amountMinor: 100n },
    ] }], [])).toEqual([{ userId: 'A', amountMinor: 100n }, { userId: 'B', amountMinor: -100n }]);
  });
  it('rejects unequal totals even when aggregate errors would cancel', () => {
    expect(() => sharedPositions([{ ...expense, amountMinor: 999n }], [])).toThrow('SHARED_TOTAL_MISMATCH');
  });
  it('rejects repeated identities within either side', () => {
    expect(() => sharedPositions([{ ...expense, payers: [
      { userId: 'A', amountMinor: 500n }, { userId: 'A', amountMinor: 500n },
    ] }], [])).toThrow('SHARED_INPUT_INVALID');
  });
  it.each([
    { ...payment, amountMinor: 0n }, { ...payment, amountMinor: -1n },
    { ...payment, fromUserId: 'A' }, { ...payment, toUserId: '' },
    { ...payment, status: 'PENDING' as SharedPayment['status'] },
  ])('rejects invalid transfer facts %#', invalid => {
    expect(() => sharedPositions([], [invalid])).toThrow('SHARED_INPUT_INVALID');
  });
  it('has an empty zero-sum result without facts', () => expect(sharedPositions([], [])).toEqual([]));
});

describe('ordinary shared expense validation', () => {
  it('accepts positive expense and zero allocated shares', () => {
    expect(() => validateSharedExpense({ ...expense, allocations: [
      { userId: 'A', amountMinor: 0n }, { userId: 'B', amountMinor: 1000n },
    ] })).not.toThrow();
  });
  it.each([
    { ...expense, amountMinor: 0n },
    { amountMinor: -1n, payers: [{ userId: 'A', amountMinor: -1n }], allocations: [{ userId: 'A', amountMinor: -1n }] },
    { ...expense, payers: [...expense.payers, { userId: 'B', amountMinor: 0n }] },
    { ...expense, allocations: [{ userId: 'A', amountMinor: -1n }, { userId: 'B', amountMinor: 1001n }] },
    { ...expense, payers: [{ userId: '', amountMinor: 1000n }] },
  ])('rejects invalid ordinary expense %#', invalid => {
    expect(() => validateSharedExpense(invalid)).toThrow('SHARED_INPUT_INVALID');
  });
});
