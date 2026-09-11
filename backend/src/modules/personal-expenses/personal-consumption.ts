export function groupConsumption(rows: Array<{ category_id: string; amount: string }>, canonical: ReadonlyMap<string, string>) {
  const grouped = new Map<string, bigint>();
  let total = 0n;
  for (const row of rows) {
    const id = canonical.get(row.category_id);
    if (!id || !/^\d+$/.test(row.amount)) throw new Error('PERSONAL_CONSUMPTION_INVALID');
    const amount = BigInt(row.amount);
    total += amount;
    grouped.set(id, (grouped.get(id) ?? 0n) + amount);
  }
  return { spending_minor: total.toString(), categories: [...grouped].sort(([a], [b]) => a.localeCompare(b))
    .map(([category_id, amount]) => ({ category_id, spending_minor: amount.toString() })) };
}
