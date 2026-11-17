import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, resolveLocale } from "./config";

const loadMessages = {
  "zh-TW": () => import("./messages/zh-TW.json"),
  en: () => import("./messages/en.json"),
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return { locale, messages: (await loadMessages[locale]()).default, timeZone: "UTC" };
});
