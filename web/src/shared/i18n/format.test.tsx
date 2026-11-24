import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatMinorUnit } from "@/shared/finance/minor-unit";
import { IntlTestProvider } from "@/test/render-with-intl";
import { getFormatMoney, useFormatMoney } from "./format";

describe("localized money helpers", () => {
  it("uses ja-JP for Japanese money", () => {
    const { result } = renderHook(useFormatMoney, {
      wrapper: ({ children }) => <IntlTestProvider locale="ja">{children}</IntlTestProvider>,
    });
    for (const currency of ["TWD", "JPY", "USD"]) {
      expect(result.current("123450", currency)).toBe(formatMinorUnit("123450", currency, "ja-JP"));
    }
  });
  it("preserves the current Traditional Chinese formatting", async () => {
    const { result } = renderHook(useFormatMoney, { wrapper: IntlTestProvider });
    const formatOnServer = await getFormatMoney();
    for (const currency of ["TWD", "JPY", "USD"]) {
      const expected = formatMinorUnit("-123450", currency, "zh-TW");
      expect(result.current("-123450", currency)).toBe(expected);
      expect(formatOnServer("-123450", currency)).toBe(expected);
    }
  });

  it("uses the NT$ marker for TWD in English", () => {
    const { result } = renderHook(useFormatMoney, {
      wrapper: ({ children }) => <IntlTestProvider locale="en">{children}</IntlTestProvider>,
    });
    expect(result.current("-123450", "TWD")).toBe("-NT$1,234.50");
  });
});
