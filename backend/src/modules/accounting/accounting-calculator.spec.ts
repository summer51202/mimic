import { ExpenseType, SettlementStatus } from '@prisma/client';
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
      { userId: 'user-a', positionMinor: 1000 },
      { userId: 'user-b', positionMinor: 0 },
    ]);
  });

  it('credits normal-expense payers and debits split allocations', () => {
    expect(
      calculateMemberPositions({
        ...baseInput(),
        expenses: [
          {
            expenseType: ExpenseType.FUND_EXPENSE,
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
      { userId: 'user-a', positionMinor: 300 },
      { userId: 'user-b', positionMinor: -300 },
    ]);
  });

  it('reverses payer and split allocation directions for refunds', () => {
    expect(expenseDirection(ExpenseType.REFUND)).toBe(-1);
    expect(
      calculateMemberPositions({
        ...baseInput(),
        expenses: [
          {
            expenseType: ExpenseType.REFUND,
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
      { userId: 'user-a', positionMinor: -150 },
      { userId: 'user-b', positionMinor: 150 },
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
            status: SettlementStatus.COMPLETED,
          },
          {
            fromUserId: 'user-a',
            toUserId: 'user-b',
            amountMinor: BigInt(200),
            status: SettlementStatus.PENDING,
          },
          {
            fromUserId: 'user-a',
            toUserId: 'user-b',
            amountMinor: BigInt(300),
            status: SettlementStatus.CANCELED,
          },
        ],
      }),
    ).toEqual([
      { userId: 'user-a', positionMinor: -100 },
      { userId: 'user-b', positionMinor: 100 },
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
          expenseType: ExpenseType.FUND_EXPENSE,
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
      { userId: 'user-a', positionMinor: 1300 },
      { userId: 'user-b', positionMinor: -300 },
    ]);

    const normalized = normalizeAgainstEqualFundShare(positions);
    expect(normalized).toEqual([
      { userId: 'user-a', positionMinor: 800 },
      { userId: 'user-b', positionMinor: -800 },
    ]);
    expect(buildSettlementSuggestions(normalized)).toEqual([
      { from_user_id: 'user-b', to_user_id: 'user-a', amount_minor: 800 },
    ]);
  });

  it('does not mutate member positions while building suggestions', () => {
    const positions = [
      { userId: 'creditor', positionMinor: 800 },
      { userId: 'debtor', positionMinor: -800 },
    ];
    const originalPositions = positions.map((position) => ({ ...position }));

    buildSettlementSuggestions(positions);

    expect(positions).toEqual(originalPositions);
  });

  it('matches multiple debtors to multiple creditors in balance order', () => {
    expect(
      buildSettlementSuggestions([
        { userId: 'creditor-a', positionMinor: 700 },
        { userId: 'creditor-b', positionMinor: 300 },
        { userId: 'debtor-c', positionMinor: -600 },
        { userId: 'debtor-d', positionMinor: -400 },
      ]),
    ).toEqual([
      {
        from_user_id: 'debtor-c',
        to_user_id: 'creditor-a',
        amount_minor: 600,
      },
      {
        from_user_id: 'debtor-d',
        to_user_id: 'creditor-a',
        amount_minor: 100,
      },
      {
        from_user_id: 'debtor-d',
        to_user_id: 'creditor-b',
        amount_minor: 300,
      },
    ]);
  });
});
