import type { MetadataRoute } from "next";

import { getLocale, getTranslations } from "next-intl/server";
import { htmlLang } from "@/i18n/config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations()]);
  return {
    name: t("brand.name"),
    short_name: t("brand.name"),
    description: t("pwa.manifestDescription", { speaker: t("brand.speaker"), tagline: t("brand.tagline") }),
    lang: htmlLang(locale),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#211a18",
    categories: ["finance", "lifestyle"],
    icons: [
      {
        src: "/pixel-ui/v1/icons/install-warm/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pixel-ui/v1/icons/install-warm/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pixel-ui/v1/icons/install-warm/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pixel-ui/v1/icons/install-warm/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
