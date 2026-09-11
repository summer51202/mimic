import { MemberAmount } from './shared-accounting';

export type AllocationInput =
  | { mode: 'EQUAL'; userIds: readonly string[] }
  | { mode: 'FIXED'; amounts: readonly MemberAmount[] }
  | { mode: 'RATIO'; weights: readonly MemberAmount[] }
  | { mode: 'HYBRID'; fixed: readonly MemberAmount[]; weights: readonly MemberAmount[] };

export function allocateShared(amountMinor: bigint, input: AllocationInput): MemberAmount[] {
  if (amountMinor <= 0n) throw new Error('SHARED_INPUT_INVALID');
  let result: MemberAmount[];
  switch (input.mode) {
    case 'EQUAL':
      result = weighted(amountMinor, input.userIds.map(userId => ({ userId, amountMinor: 1n })));
      break;
    case 'RATIO':
      result = weighted(amountMinor, input.weights);
      break;
    case 'FIXED':
      validateRows(input.amounts);
      if (sum(input.amounts) !== amountMinor) throw new Error('SHARED_TOTAL_MISMATCH');
      result = input.amounts.map(row => ({ ...row }));
      break;
    case 'HYBRID': {
      validateRows([...input.fixed, ...input.weights]);
      const remainder = amountMinor - sum(input.fixed);
      if (remainder < 0n) throw new Error('SHARED_INPUT_INVALID');
      result = [...input.fixed.map(row => ({ ...row })), ...weighted(remainder, input.weights)];
      break;
    }
  }
  return result.sort((a, b) => compareId(a.userId, b.userId));
}

function sum(rows: readonly MemberAmount[]): bigint {
  return rows.reduce((total, row) => total + row.amountMinor, 0n);
}

function validateRows(rows: readonly MemberAmount[]): void {
  if (!rows.length || rows.some(row => !row.userId || row.amountMinor < 0n)
    || new Set(rows.map(row => row.userId)).size !== rows.length) throw new Error('SHARED_INPUT_INVALID');
}

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function weighted(total: bigint, weights: readonly MemberAmount[]): MemberAmount[] {
  validateRows(weights);
  if (weights.some(row => row.amountMinor === 0n)) throw new Error('SHARED_INPUT_INVALID');
  const denominator = sum(weights);
  const rows = weights.map(row => ({ userId: row.userId,
    amountMinor: total * row.amountMinor / denominator,
    remainder: total * row.amountMinor % denominator,
  })).sort((a, b) => a.remainder === b.remainder ? compareId(a.userId, b.userId) : a.remainder > b.remainder ? -1 : 1);
  let leftover = total - sum(rows);
  for (const row of rows) {
    if (leftover === 0n) break;
    row.amountMinor += 1n;
    leftover -= 1n;
  }
  return rows.map(({ userId, amountMinor }) => ({ userId, amountMinor }));
}
