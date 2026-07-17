import { ExpenseType, SettlementStatus } from '@prisma/client';

export interface MemberPosition {
  userId: string;
  positionMinor: number;
}

export interface AccountingCalculatorInput {
  memberIds: string[];
  contributions: Array<{
    contributorUserId: string;
    amountMinor: bigint;
  }>;
  expenses: Array<{
    expenseType: ExpenseType;
    amountMinor: bigint;
    payers: Array<{ payerUserId: string; amountMinor: bigint }>;
    splits: Array<{ userId: string; allocatedAmountMinor: bigint }>;
  }>;
  settlements: Array<{
    fromUserId: string;
    toUserId: string;
    amountMinor: bigint;
    status: SettlementStatus;
  }>;
}

export function expenseDirection(type: ExpenseType): 1 | -1 {
  return type === ExpenseType.REFUND ? -1 : 1;
}

export function calculateMemberPositions(
  input: AccountingCalculatorInput,
): MemberPosition[] {
  const positionByUser = new Map<string, number>();
  input.memberIds.forEach((userId) => positionByUser.set(userId, 0));

  const addPosition = (userId: string, amount: number) => {
    positionByUser.set(userId, (positionByUser.get(userId) ?? 0) + amount);
  };

  input.contributions.forEach((contribution) => {
    addPosition(contribution.contributorUserId, Number(contribution.amountMinor));
  });

  input.expenses.forEach((expense) => {
    const sign = expenseDirection(expense.expenseType);

    expense.payers.forEach((payer) => {
      addPosition(payer.payerUserId, Number(payer.amountMinor) * sign);
    });
    expense.splits.forEach((split) => {
      addPosition(split.userId, -Number(split.allocatedAmountMinor) * sign);
    });
  });

  input.settlements
    .filter((settlement) => settlement.status === SettlementStatus.COMPLETED)
    .forEach((settlement) => {
      addPosition(settlement.fromUserId, -Number(settlement.amountMinor));
      addPosition(settlement.toUserId, Number(settlement.amountMinor));
    });

  return Array.from(positionByUser.entries()).map(([userId, positionMinor]) => ({
    userId,
    positionMinor,
  }));
}

export function buildSettlementSuggestions(positions: MemberPosition[]) {
  const creditors = positions
    .filter((position) => position.positionMinor > 0)
    .sort((a, b) => b.positionMinor - a.positionMinor);
  const debtors = positions
    .filter((position) => position.positionMinor < 0)
    .map((position) => ({
      userId: position.userId,
      debtMinor: -position.positionMinor,
    }))
    .sort((a, b) => b.debtMinor - a.debtMinor);
  const suggestions: Array<{
    from_user_id: string;
    to_user_id: string;
    amount_minor: number;
  }> = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.debtMinor, creditor.positionMinor);

    if (amount > 0) {
      suggestions.push({
        from_user_id: debtor.userId,
        to_user_id: creditor.userId,
        amount_minor: amount,
      });
    }

    debtor.debtMinor -= amount;
    creditor.positionMinor -= amount;

    if (debtor.debtMinor === 0) {
      debtorIndex += 1;
    }
    if (creditor.positionMinor === 0) {
      creditorIndex += 1;
    }
  }

  return suggestions;
}

export function normalizeAgainstEqualFundShare(
  positions: MemberPosition[],
): MemberPosition[] {
  if (positions.length === 0) {
    return [];
  }

  const totalPosition = positions.reduce(
    (sum, position) => sum + position.positionMinor,
    0,
  );
  const baseTargetShare = Math.floor(totalPosition / positions.length);
  let remainingRemainder = totalPosition - baseTargetShare * positions.length;
  let normalizedTotal = 0;

  return positions.map((position, index) => {
    const targetShare = baseTargetShare + (remainingRemainder > 0 ? 1 : 0);
    if (remainingRemainder > 0) {
      remainingRemainder -= 1;
    }

    const isLast = index === positions.length - 1;
    const normalizedPosition = isLast
      ? -normalizedTotal
      : position.positionMinor - targetShare;

    normalizedTotal += normalizedPosition;

    return {
      userId: position.userId,
      positionMinor: normalizedPosition,
    };
  });
}
