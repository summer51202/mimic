import { describe, expect, it } from "vitest";

import { formatMinorUnit, parseMinorUnit } from "./minor-unit";

describe("minor-unit finance helpers", () => {
  it("parses canonical signed integer minor-unit strings", () => {
    expect(parseMinorUnit("24680")).toBe(BigInt("24680"));
    expect(parseMinorUnit("-860")).toBe(BigInt("-860"));
  });

  it("rejects decimal, exponential, and noncanonical minor-unit strings", () => {
    expect(() => parseMinorUnit("1.25")).toThrow();
    expect(() => parseMinorUnit("1e3")).toThrow();
    expect(() => parseMinorUnit("001")).toThrow();
    expect(() => parseMinorUnit("-0")).toThrow();
  });

  it("formats TWD using fraction digits from Intl metadata", () => {
    expect(
      new Intl.NumberFormat("zh-TW", {
        currency: "TWD",
        style: "currency",
      }).resolvedOptions().maximumFractionDigits,
    ).toBe(2);
    expect(formatMinorUnit("24680", "TWD", "zh-TW")).toBe("$246.80");
    expect(formatMinorUnit("-860", "TWD", "zh-TW")).toBe("-$8.60");
  });

  it("formats currencies with fraction digits from Intl metadata", () => {
    expect(formatMinorUnit("1234", "USD", "en-US")).toBe("$12.34");
    expect(formatMinorUnit("-1234", "USD", "en-US")).toBe("-$12.34");
  });
});
