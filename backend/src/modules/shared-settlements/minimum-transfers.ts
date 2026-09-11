import { MemberAmount } from '../shared-expenses/shared-accounting';

export interface SuggestedTransfer {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
}
export const MAX_SETTLEMENT_POSITIONS = 16;

export function minimumTransfers(positions: readonly MemberAmount[]): SuggestedTransfer[] {
  if (positions.some(row => !row.userId) || new Set(positions.map(row => row.userId)).size !== positions.length) {
    throw new Error('SHARED_INPUT_INVALID');
  }
  if (positions.reduce((sum, row) => sum + row.amountMinor, 0n) !== 0n) {
    throw new Error('SHARED_POSITIONS_UNBALANCED');
  }
  const members = positions.filter(row => row.amountMinor !== 0n)
    .sort((a, b) => a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
  if (members.length > MAX_SETTLEMENT_POSITIONS) throw new Error('SHARED_SETTLEMENT_LIMIT');
  const size = 1 << members.length;
  const sums = Array<bigint>(size).fill(0n);
  const groups = new Int8Array(size);
  const lastMember = new Int8Array(size);
  // Every ordering defines disjoint zero-sum groups at its zero-sum prefixes.
  // Maximize these prefixes in O(n * 2^n), with stable identity tie-breaking.
  for (let mask = 1; mask < size; mask++) {
    const firstBit = mask & -mask;
    sums[mask] = sums[mask ^ firstBit] + members[Math.log2(firstBit)].amountMinor;
    let best = -1;
    for (let index = 0; index < members.length; index++) {
      const bit = 1 << index;
      if ((mask & bit) && groups[mask ^ bit] > best) {
        best = groups[mask ^ bit];
        lastMember[mask] = index;
      }
    }
    groups[mask] = best + (sums[mask] === 0n ? 1 : 0);
  }
  const result: SuggestedTransfer[] = [];
  let group: MemberAmount[] = [];
  let balance = 0n;
  for (let mask = size - 1; mask !== 0;) {
    const index = lastMember[mask];
    group.push(members[index]);
    balance += members[index].amountMinor;
    mask ^= 1 << index;
    if (balance === 0n) {
      result.push(...settleGroup(group));
      group = [];
    }
  }
  return result;
}

function settleGroup(group: readonly MemberAmount[]): SuggestedTransfer[] {
  const ordered = [...group].sort((a, b) => a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
  const debtors = ordered.filter(row => row.amountMinor < 0n).map(row => ({ ...row, amountMinor: -row.amountMinor }));
  const creditors = ordered.filter(row => row.amountMinor > 0n).map(row => ({ ...row }));
  const transfers: SuggestedTransfer[] = [];
  let debtor = 0;
  let creditor = 0;
  // A maximally partitioned group has no proper zero-sum subset, so any
  // debtor/creditor matching within it uses exactly group.length - 1 edges.
  while (debtor < debtors.length && creditor < creditors.length) {
    const from = debtors[debtor];
    const to = creditors[creditor];
    const amountMinor = from.amountMinor < to.amountMinor ? from.amountMinor : to.amountMinor;
    transfers.push({ fromUserId: from.userId, toUserId: to.userId, amountMinor });
    from.amountMinor -= amountMinor;
    to.amountMinor -= amountMinor;
    if (from.amountMinor === 0n) debtor++;
    if (to.amountMinor === 0n) creditor++;
  }
  return transfers;
}
