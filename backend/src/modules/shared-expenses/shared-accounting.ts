export interface MemberAmount { userId: string; amountMinor: bigint }
export interface SharedEffect {
  amountMinor: bigint;
  payers: readonly MemberAmount[];
  allocations: readonly MemberAmount[];
}
export interface SharedPayment {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
  status: 'AWAITING_PAYMENT' | 'SENT' | 'COMPLETED';
}

export function validateSharedExpense(effect: SharedEffect): void {
  if (effect.amountMinor <= 0n || effect.payers.some(row => row.amountMinor <= 0n)
    || effect.allocations.some(row => row.amountMinor < 0n)) throw new Error('SHARED_INPUT_INVALID');
  validateEffect(effect);
}

export function sharedPositions(effects: readonly SharedEffect[], payments: readonly SharedPayment[]): MemberAmount[] {
  const positions = new Map<string, bigint>();
  const add = (userId: string, amount: bigint) => positions.set(userId, (positions.get(userId) ?? 0n) + amount);
  for (const effect of effects) {
    validateEffect(effect);
    for (const row of effect.payers) add(row.userId, row.amountMinor);
    for (const row of effect.allocations) add(row.userId, -row.amountMinor);
  }
  for (const payment of payments) {
    if (!payment.fromUserId || !payment.toUserId || payment.fromUserId === payment.toUserId
      || payment.amountMinor <= 0n || !['AWAITING_PAYMENT', 'SENT', 'COMPLETED'].includes(payment.status)) {
      throw new Error('SHARED_INPUT_INVALID');
    }
    if (payment.status === 'COMPLETED') {
      add(payment.fromUserId, payment.amountMinor);
      add(payment.toUserId, -payment.amountMinor);
    }
  }
  return [...positions].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([userId, amountMinor]) => ({ userId, amountMinor }));
}

function validateEffect(effect: SharedEffect): void {
  for (const rows of [effect.payers, effect.allocations]) {
    if (rows.some(row => !row.userId) || new Set(rows.map(row => row.userId)).size !== rows.length) {
      throw new Error('SHARED_INPUT_INVALID');
    }
    if (rows.reduce((sum, row) => sum + row.amountMinor, 0n) !== effect.amountMinor) {
      throw new Error('SHARED_TOTAL_MISMATCH');
    }
  }
}
