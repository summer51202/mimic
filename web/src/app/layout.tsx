import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { htmlLang } from "@/i18n/config";
import { RegisterServiceWorker } from "@/shared/pwa/register-service-worker";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brand");
  return {
    title: t("name"),
    description: t("description"),
    icons: {
      icon: [16, 32].map((size) => ({
        url: `/pixel-ui/v1/icons/install-warm/favicon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
      })),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const { auth, avatar, brand, common, drafts, groups, home, invite, language, landing,
    nav, personal, pooled, pwa, routeState, settings, settlement, shared, shell, tasks, taxonomy } = messages;
  return (
    <html lang={htmlLang(locale)}>
      <body>
        <NextIntlClientProvider messages={{
          auth, avatar, brand, common, drafts, groups, home, invite, language, personal, pooled,
          pwa, routeState, settings, settlement, shared, shell, tasks, taxonomy,
          nav: { home: nav.home, chests: nav.chests, parties: nav.parties, quests: nav.quests,
            settings: nav.settings, comingSoon: nav.comingSoon },
          landing: {
            base: landing.base, start: landing.start, exploreLeft: landing.exploreLeft,
            exploreRight: landing.exploreRight, props: landing.props, lines: landing.lines, scene: landing.scene,
          },
        }}>
          {children}
          <RegisterServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
