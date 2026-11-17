export const SUPPORTED_LOCALES = ["zh-TW", "en", "ja"] as const;
export const ENABLED_LOCALES = ["zh-TW", "en"] as const;
export const DEFAULT_LOCALE = "zh-TW";
export const LOCALE_COOKIE = "mimic-locale";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type EnabledLocale = (typeof ENABLED_LOCALES)[number];

const htmlLanguages = { "zh-TW": "zh-Hant", en: "en", ja: "ja" } as const;
const intlLocales = { "zh-TW": "zh-TW", en: "en-US", ja: "ja-JP" } as const;

export function htmlLang(locale: SupportedLocale) {
  return htmlLanguages[locale];
}

export function intlLocale(locale: SupportedLocale) {
  return intlLocales[locale];
}

export function isEnabledLocale(value: unknown): value is EnabledLocale {
  return ENABLED_LOCALES.some((locale) => locale === value);
}

export function resolveLocale(value: unknown): EnabledLocale {
  return isEnabledLocale(value) ? value : DEFAULT_LOCALE;
}
