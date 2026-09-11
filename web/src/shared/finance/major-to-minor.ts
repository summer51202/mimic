export function majorToMinorString(value: string, currency: string): string {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value.trim());
  if (!match || match[1].length > 19) throw new Error('EXPENSE_AMOUNT_INVALID');
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency })
    .resolvedOptions().maximumFractionDigits ?? 0;
  const fraction = match[2] ?? '';
  if (fraction.length > digits) throw new Error('EXPENSE_AMOUNT_PRECISION');
  const amount = BigInt(match[1]) * BigInt(10) ** BigInt(digits) + BigInt(fraction.padEnd(digits, '0') || '0');
  if (amount <= BigInt(0) || amount > BigInt('9223372036854775807')) throw new Error('EXPENSE_AMOUNT_INVALID');
  return amount.toString();
}
