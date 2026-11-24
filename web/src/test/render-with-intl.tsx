import { render as renderReact, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactElement, ReactNode } from "react";
import { DEFAULT_LOCALE, type EnabledLocale } from "@/i18n/config";
import en from "@/i18n/messages/en.json";
import zh from "@/i18n/messages/zh-TW.json";
import ja from "@/i18n/messages/ja.json";

export function IntlTestProvider({
  children,
  locale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  locale?: EnabledLocale;
}) {
  return (
    <AppRouterContext.Provider value={testRouter}>
      <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : locale === "ja" ? ja : zh} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </AppRouterContext.Provider>
  );
}

const ignore = () => {};
const testRouter: AppRouterInstance = {
  back: ignore,
  forward: ignore,
  refresh: ignore,
  push: ignore,
  replace: ignore,
  prefetch: ignore,
};

export function render(ui: ReactElement, options?: RenderOptions) {
  return renderReact(ui, { wrapper: IntlTestProvider, ...options });
}
