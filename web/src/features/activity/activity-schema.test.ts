import { describe, expect, it } from "vitest";

import {
  allocateEqualSplit,
  majorToMinorUnit,
  sumMinorUnits,
} from "./activity-schema";

describe("activity finance helpers", () => {
  it("converts positive major-unit input using currency precision", () => {
    expect(majorToMinorUnit("123.45", "TWD")).toBe(12345);
    expect(majorToMinorUnit("123", "JPY")).toBe(123);
  });

  it("rejects invalid precision, non-positive, and unsafe values", () => {
    expect(() => majorToMinorUnit("1.001", "TWD")).toThrow("AMOUNT_PRECISION");
    expect(() => majorToMinorUnit("0", "TWD")).toThrow("AMOUNT_POSITIVE");
    expect(() => majorToMinorUnit("90071992547410", "TWD")).toThrow("AMOUNT_UNSAFE");
  });

  it("allocates equal shares with the final member receiving the remainder", () => {
    expect(allocateEqualSplit(1000, ["u1", "u2", "u3"])).toEqual([
      { userId: "u1", amountMinor: 333 },
      { userId: "u2", amountMinor: 333 },
      { userId: "u3", amountMinor: 334 },
    ]);
  });

  it("never creates a negative equal share when minor units are scarce", () => {
    expect(allocateEqualSplit(2, ["u1", "u2", "u3", "u4"])).toEqual([
      { userId: "u1", amountMinor: 1 },
      { userId: "u2", amountMinor: 1 },
      { userId: "u3", amountMinor: 0 },
      { userId: "u4", amountMinor: 0 },
    ]);
  });

  it("sums canonical minor-unit form entries", () => {
    expect(sumMinorUnits(["12.50", "7.50"], "TWD")).toBe(2000);
  });
});
