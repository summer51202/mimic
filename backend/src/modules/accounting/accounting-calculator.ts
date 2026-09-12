export type AccountingExpenseKind = 'EXPENSE' | 'REFUND';
export type AccountingSettlementStatus = 'PENDING' | 'COMPLETED' | 'CANCELED';

export interface MemberPosition {
  userId: string;
  positionMinor: bigint;
}

export interface AccountingCalculatorInput {
  memberIds: string[];
  contributions: Array<{
    contributorUserId: string;
    amountMinor: bigint;
  }>;
  expenses: Array<{
    expenseType: AccountingExpenseKind;
    amountMinor: bigint;
    payers: Array<{ payerUserId: string; amountMinor: bigint }>;
    splits: Array<{ userId: string; allocatedAmountMinor: bigint }>;
  }>;
  settlements: Array<{
    fromUserId: string;
    toUserId: string;
    amountMinor: bigint;
    status: AccountingSettlementStatus;
  }>;
}

export function expenseDirection(type: AccountingExpenseKind): 1n | -1n {
  return type === 'REFUND' ? -1n : 1n;
}

export function calculateMemberPositions(
  input: AccountingCalculatorInput,
): MemberPosition[] {
  const positionByUser = new Map<string, bigint>();
  input.memberIds.forEach((userId) => positionByUser.set(userId, 0n));

  const addPosition = (userId: string, amount: bigint) => {
    positionByUser.set(userId, (positionByUser.get(userId) ?? 0n) + amount);
  };

  input.contributions.forEach((contribution) => {
    addPosition(contribution.contributorUserId, contribution.amountMinor);
  });

  input.expenses.forEach((expense) => {
    const sign = expenseDirection(expense.expenseType);

    expense.payers.forEach((payer) => {
      addPosition(payer.payerUserId, payer.amountMinor * sign);
    });
    expense.splits.forEach((split) => {
      addPosition(split.userId, -split.allocatedAmountMinor * sign);
    });
  });

  input.settlements
    .filter((settlement) => settlement.status === 'COMPLETED')
    .forEach((settlement) => {
      addPosition(settlement.fromUserId, -settlement.amountMinor);
      addPosition(settlement.toUserId, settlement.amountMinor);
    });

  return Array.from(positionByUser.entries()).map(([userId, positionMinor]) => ({
    userId,
    positionMinor,
  }));
}

export function buildSettlementSuggestions(positions: MemberPosition[]) {
  const creditors = positions
    .filter((position) => position.positionMinor > 0n)
    .map((position) => ({ ...position }))
    .sort((a, b) => a.positionMinor === b.positionMinor ? 0 : a.positionMinor > b.positionMinor ? -1 : 1);
  const debtors = positions
    .filter((position) => position.positionMinor < 0n)
    .map((position) => ({
      userId: position.userId,
      debtMinor: -position.positionMinor,
    }))
    .sort((a, b) => a.debtMinor === b.debtMinor ? 0 : a.debtMinor > b.debtMinor ? -1 : 1);
  const suggestions: Array<{
    from_user_id: string;
    to_user_id: string;
    amount_minor: bigint;
  }> = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = debtor.debtMinor < creditor.positionMinor ? debtor.debtMinor : creditor.positionMinor;

    if (amount > 0n) {
      suggestions.push({
        from_user_id: debtor.userId,
        to_user_id: creditor.userId,
        amount_minor: amount,
      });
    }

    debtor.debtMinor -= amount;
    creditor.positionMinor -= amount;

    if (debtor.debtMinor === 0n) {
      debtorIndex += 1;
    }
    if (creditor.positionMinor === 0n) {
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
    0n,
  );
  const memberCount = BigInt(positions.length);
  const baseTargetShare = totalPosition / memberCount;
  let remainingRemainder = totalPosition - baseTargetShare * memberCount;
  let normalizedTotal = 0n;

  return positions.map((position, index) => {
    const remainderShare = remainingRemainder > 0n ? 1n : remainingRemainder < 0n ? -1n : 0n;
    const targetShare = baseTargetShare + remainderShare;
    if (remainingRemainder !== 0n) {
      remainingRemainder -= remainderShare;
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
