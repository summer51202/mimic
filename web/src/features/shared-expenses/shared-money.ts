const unsigned = /^(0|[1-9]\d*)$/;
const signed = /^(0|-?[1-9]\d*)$/;
type AmountRow = { user_id: string; amount_minor: string };
type ExpenseTarget = { id: string; amount_minor: string; payers: AmountRow[]; allocations: AmountRow[] };
type CorrectionDelta = { source_expense_id: string | null; revision: number; target_amount_minor: string;
  payers: AmountRow[]; allocations: AmountRow[] };

export function sumMinor(values: readonly string[]): string {
  return values.reduce((sum, value) => {
    if (!unsigned.test(value)) throw new Error('SHARED_AMOUNT_INVALID');
    return sum + BigInt(value);
  }, BigInt(0)).toString();
}

export function equalAllocations(total: string, userIds: readonly string[]) {
  if (!unsigned.test(total) || userIds.length === 0 || new Set(userIds).size !== userIds.length) {
    throw new Error('SHARED_ALLOCATION_INVALID');
  }
  const ids = [...userIds].sort();
  const count = BigInt(ids.length);
  const amount = BigInt(total);
  const base = amount / count;
  const remainder = amount % count;
  return ids.map((user_id, index) => ({
    user_id,
    amount_minor: (base + (BigInt(index) < remainder ? BigInt(1) : BigInt(0))).toString(),
  }));
}

export function applyExpenseCorrections<T extends ExpenseTarget>(source: T, corrections: readonly CorrectionDelta[]) {
  const applied = corrections.filter(row => row.source_expense_id === source.id).sort((a, b) => a.revision - b.revision);
  const rows = (initial: readonly AmountRow[], key: 'payers' | 'allocations') => {
    const amounts = new Map(initial.map(row => [row.user_id, BigInt(row.amount_minor)]));
    for (const correction of applied) for (const row of correction[key]) {
      if (!signed.test(row.amount_minor)) throw new Error('SHARED_CORRECTION_INVALID');
      amounts.set(row.user_id, (amounts.get(row.user_id) ?? BigInt(0)) + BigInt(row.amount_minor));
    }
    return [...amounts].filter(([, amount]) => amount !== BigInt(0)).sort(([a], [b]) => a.localeCompare(b)).map(([user_id, amount]) => {
      if (amount < BigInt(0)) throw new Error('SHARED_CORRECTION_INVALID');
      return { user_id, amount_minor: amount.toString() };
    });
  };
  return { ...source, amount_minor: applied.at(-1)?.target_amount_minor ?? source.amount_minor,
    payers: rows(source.payers, 'payers'), allocations: rows(source.allocations, 'allocations') };
}
