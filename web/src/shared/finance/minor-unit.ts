const canonicalMinorUnitPattern = /^-?(0|[1-9]\d*)$/;

export function parseMinorUnit(value: string): bigint {
  if (!canonicalMinorUnitPattern.test(value) || value === "-0") {
    throw new Error("Expected a canonical minor-unit integer string.");
  }

  return BigInt(value);
}

export function formatMinorUnit(
  value: string,
  currency: string,
  locale: string,
): string {
  const parsed = parseMinorUnit(value);
  const digits = currencyFractionDigits(currency, locale);
  const { integerPart, fractionPart } = splitMinorUnit(parsed, digits);
  const groupedInteger = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(integerPart));

  const templateValue = digits === 0 ? 1 : 1 + 1 / 10 ** digits;
  const parts = new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    style: "currency",
  }).formatToParts(parsed < BigInt(0) ? -templateValue : templateValue);

  return parts
    .map((part) => {
      if (part.type === "integer") {
        return groupedInteger;
      }

      if (part.type === "fraction") {
        return fractionPart;
      }

      return part.value;
    })
    .join("");
}

function currencyFractionDigits(currency: string, locale: string): number {
  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
  }).resolvedOptions().maximumFractionDigits ?? 0;
}

function splitMinorUnit(value: bigint, fractionDigits: number) {
  const absolute = (value < BigInt(0) ? -value : value).toString(10);

  if (fractionDigits === 0) {
    return { integerPart: absolute, fractionPart: "" };
  }

  const padded = absolute.padStart(fractionDigits + 1, "0");
  const integerPart = padded.slice(0, -fractionDigits);
  const fractionPart = padded.slice(-fractionDigits);

  return { integerPart, fractionPart };
}
