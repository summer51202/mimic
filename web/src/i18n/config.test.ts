import { describe, expect, it } from "vitest";
import { htmlLang, intlLocale, resolveLocale } from "./config";

describe("locale mappings", () => {
  it.each([
    [undefined, "zh-TW"],
    ["", "zh-TW"],
    ["ja", "ja"],
    ["en-US", "zh-TW"],
    ["zh-TW", "zh-TW"],
    ["en", "en"],
  ])("resolves %s to %s", (value, expected) => {
    expect(resolveLocale(value)).toBe(expected);
  });

  it.each([
    ["zh-TW", "zh-Hant", "zh-TW"],
    ["en", "en", "en-US"],
    ["ja", "ja", "ja-JP"],
  ] as const)("maps %s to HTML lang %s and Intl locale %s", (locale, html, intl) => {
    expect(htmlLang(locale)).toBe(html);
    expect(intlLocale(locale)).toBe(intl);
  });
});
