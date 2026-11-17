import { useLocale } from "next-intl";
import { getLocale } from "next-intl/server";
import { intlLocale, type EnabledLocale } from "@/i18n/config";
import { formatMinorUnit } from "@/shared/finance/minor-unit";

function formatFor(locale: EnabledLocale) {
  return (minor: string, currency: string) => formatMinorUnit(minor, currency, intlLocale(locale));
}

export function useFormatMoney() {
  return formatFor(useLocale());
}

export async function getFormatMoney() {
  return formatFor(await getLocale());
}
