import {
  buildSettlementSuggestions,
  calculateMemberPositions,
  expenseDirection,
  normalizeAgainstEqualFundShare,
} from './accounting-calculator';

const baseInput = () => ({
  memberIds: ['user-a', 'user-b'],
  contributions: [],
  expenses: [],
  settlements: [],
});

describe('accounting calculator', () => {
  it('adds contributions to the contributor position', () => {
    expect(
      calculateMemberPositions({
        ...baseInput(),
        contributions: [
          { contributorUserId: 'user-a', amountMinor: BigInt(1000) },
        ],
      }),
    ).toEqual([
      { userId: 'user-a', positionMinor: 1000n },
      { userId: 'user-b', positionMinor: 0n },
    ]);
  });

  it('credits normal-expense payers and debits split allocations', () => {
    expect(
      calculateMemberPositions({
        ...baseInput(),
        expenses: [
          {
            expenseType: 'EXPENSE',
            amountMinor: BigInt(600),
            payers: [
              { payerUserId: 'user-a', amountMinor: BigInt(600) },
            ],
            splits: [
              { userId: 'user-a', allocatedAmountMinor: BigInt(300) },
              { userId: 'user-b', allocatedAmountMinor: BigInt(300) },
            ],
          },
        ],
      }),
    ).toEqual([
      { userId: 'user-a', positionMinor: 300n },
      { userId: 'user-b', positionMinor: -300n },
    ]);
  });

  it('reverses payer and split allocation directions for refunds', () => {
    expect(expenseDirection('REFUND')).toBe(-1n);
    expect(
      calculateMemberPositions({
        ...baseInput(),
        expenses: [
          {
            expenseType: 'REFUND',
            amountMinor: BigInt(200),
            payers: [
              { payerUserId: 'user-a', amountMinor: BigInt(200) },
            ],
            splits: [
              { userId: 'user-a', allocatedAmountMinor: BigInt(50) },
              { userId: 'user-b', allocatedAmountMinor: BigInt(150) },
            ],
          },
        ],
      }),
    ).toEqual([
      { userId: 'user-a', positionMinor: -150n },
      { userId: 'user-b', positionMinor: 150n },
    ]);
  });

  it('applies only completed settlements', () => {
    expect(
      calculateMemberPositions({
        ...baseInput(),
        settlements: [
          {
            fromUserId: 'user-a',
            toUserId: 'user-b',
            amountMinor: BigInt(100),
            status: 'COMPLETED',
          },
          {
            fromUserId: 'user-a',
            toUserId: 'user-b',
            amountMinor: BigInt(200),
            status: 'PENDING',
          },
          {
            fromUserId: 'user-a',
            toUserId: 'user-b',
            amountMinor: BigInt(300),
            status: 'CANCELED',
          },
        ],
      }),
    ).toEqual([
      { userId: 'user-a', positionMinor: -100n },
      { userId: 'user-b', positionMinor: 100n },
    ]);
  });

  it('preserves the existing fixture positions, normalization, and suggestion', () => {
    const positions = calculateMemberPositions({
      ...baseInput(),
      contributions: [
        { contributorUserId: 'user-a', amountMinor: BigInt(1000) },
      ],
      expenses: [
        {
          expenseType: 'EXPENSE',
          amountMinor: BigInt(600),
          payers: [{ payerUserId: 'user-a', amountMinor: BigInt(600) }],
          splits: [
            { userId: 'user-a', allocatedAmountMinor: BigInt(300) },
            { userId: 'user-b', allocatedAmountMinor: BigInt(300) },
          ],
        },
      ],
    });

    expect(positions).toEqual([
      { userId: 'user-a', positionMinor: 1300n },
      { userId: 'user-b', positionMinor: -300n },
    ]);

    const normalized = normalizeAgainstEqualFundShare(positions);
    expect(normalized).toEqual([
      { userId: 'user-a', positionMinor: 800n },
      { userId: 'user-b', positionMinor: -800n },
    ]);
    expect(buildSettlementSuggestions(normalized)).toEqual([
      { from_user_id: 'user-b', to_user_id: 'user-a', amount_minor: 800n },
    ]);
  });

  it('does not mutate member positions while building suggestions', () => {
    const positions = [
      { userId: 'creditor', positionMinor: 800n },
      { userId: 'debtor', positionMinor: -800n },
    ];
    const originalPositions = positions.map((position) => ({ ...position }));

    buildSettlementSuggestions(positions);

    expect(positions).toEqual(originalPositions);
  });

  it('matches multiple debtors to multiple creditors in balance order', () => {
    expect(
      buildSettlementSuggestions([
        { userId: 'creditor-a', positionMinor: 700n },
        { userId: 'creditor-b', positionMinor: 300n },
        { userId: 'debtor-c', positionMinor: -600n },
        { userId: 'debtor-d', positionMinor: -400n },
      ]),
    ).toEqual([
      {
        from_user_id: 'debtor-c',
        to_user_id: 'creditor-a',
        amount_minor: 600n,
      },
      {
        from_user_id: 'debtor-d',
        to_user_id: 'creditor-a',
        amount_minor: 100n,
      },
      {
        from_user_id: 'debtor-d',
        to_user_id: 'creditor-b',
        amount_minor: 300n,
      },
    ]);
  });
});
