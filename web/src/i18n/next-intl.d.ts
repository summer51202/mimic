import type { EnabledLocale } from "./config";
import type messages from "./messages/zh-TW.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: EnabledLocale;
    Messages: typeof messages;
  }
}
