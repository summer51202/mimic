const majorAmountPattern = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/;

export type EqualAllocation = {
  userId: string;
  amountMinor: number;
};

export function majorToMinorUnit(value: string, currency: string): number {
  const normalized = value.trim();
  const match = majorAmountPattern.exec(normalized);

  if (!match) {
    throw new Error("AMOUNT_INVALID");
  }

  const digits = currencyFractionDigits(currency);
  const fraction = match[1] ?? "";

  if (fraction.length > digits) {
    throw new Error("AMOUNT_PRECISION");
  }

  const scale = 10 ** digits;
  const integer = Number(normalized.split(".")[0]);
  const paddedFraction = fraction.padEnd(digits, "0");
  const minor = integer * scale + Number(paddedFraction || 0);

  if (!Number.isSafeInteger(minor)) {
    throw new Error("AMOUNT_UNSAFE");
  }

  if (minor <= 0) {
    throw new Error("AMOUNT_POSITIVE");
  }

  return minor;
}

export function sumMinorUnits(values: string[], currency: string): number {
  const total = values.reduce(
    (sum, value) => sum + majorToMinorUnit(value, currency),
    0,
  );

  if (!Number.isSafeInteger(total)) {
    throw new Error("AMOUNT_UNSAFE");
  }

  return total;
}

export function allocateEqualSplit(
  amountMinor: number,
  userIds: string[],
): EqualAllocation[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || userIds.length === 0) {
    throw new Error("SPLIT_INVALID");
  }

  const roundedShare = Math.round(amountMinor / userIds.length);
  let allocated = 0;

  return userIds.map((userId, index) => {
    const amount = index === userIds.length - 1
      ? amountMinor - allocated
      : Math.min(roundedShare, amountMinor - allocated);

    allocated += amount;
    return { userId, amountMinor: amount };
  });
}

function currencyFractionDigits(currency: string): number {
  return new Intl.NumberFormat("en", {
    currency,
    style: "currency",
  }).resolvedOptions().maximumFractionDigits ?? 0;
}
