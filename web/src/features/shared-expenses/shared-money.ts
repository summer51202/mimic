const unsigned = /^(0|[1-9]\d*)$/;

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
