import { createTranslator } from "next-intl";
import { expect, it } from "vitest";
import zh from "./messages/zh-TW.json";
import en from "./messages/en.json";
import ja from "./messages/ja.json";

for (const [locale, messages] of [["zh-TW", zh], ["en", en], ["ja", ja]] as const) {
  for (const frequency of ["MONTHLY", "WEEKLY"] as const) {
    it.each([1, 2])(`${locale} ${frequency} interval %s`, (count) => {
      const t = createTranslator({ locale, messages, namespace: "pooled" });
      const monthly = frequency === "MONTHLY";
      const cadence = t(monthly ? "monthly" : "weekly");
      const actual = t.rich("scheduleSummary", { frequency, count, cadence: () => cadence, interval: chunks => chunks });
      const expected = locale === "zh-TW" ? `${cadence} · 每 ${count} 期`
        : locale === "ja" ? `${cadence} · ${count}${monthly ? "か月ごと" : "週間ごと"}`
        : `${cadence} · every ${count === 1 ? "" : `${count} `}${monthly ? "month" : "week"}${count === 1 ? "" : "s"}`;
      expect(actual).toBe(expected);
    });
  }
}
