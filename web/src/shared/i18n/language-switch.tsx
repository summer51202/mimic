"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { htmlLang, type EnabledLocale } from "@/i18n/config";
import { appFetch } from "@/shared/api/app-fetch";

function useChangeLocale() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const running = useRef(false);
  const [saving, setSaving] = useState(false);
  const busy = saving || refreshing;

  async function change(locale: EnabledLocale) {
    if (running.current || refreshing) return;
    running.current = true;
    setSaving(true);
    try {
      const result = await appFetch<{ locale: EnabledLocale; synced: boolean }>("/api/locale", {
        body: JSON.stringify({ locale }),
        method: "POST",
      });
      startTransition(() => router.refresh());
      return result;
    } catch {
      return undefined;
    } finally {
      running.current = false;
      setSaving(false);
    }
  }

  return { busy, change };
}

export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const { busy, change } = useChangeLocale();
  const target = locale === "en" ? "zh-TW" : "en";
  return (
    <button
      aria-busy={busy}
      aria-disabled={busy}
      className={className}
      lang={htmlLang(target)}
      onClick={() => void change(target)}
      type="button"
    >
      {t("target")}
    </button>
  );
}

export function LanguageSettings({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const { busy, change } = useChangeLocale();
  const [notice, setNotice] = useState<Awaited<ReturnType<typeof change>>>();

  return (
    <fieldset aria-busy={busy} className={className}>
      <legend>{t("legend")}</legend>
      <div>
        {(["zh-TW", "en"] as const).map((choice) => (
          <label key={choice} lang={htmlLang(choice)}>
            <input
              aria-disabled={busy}
              checked={(notice?.locale ?? locale) === choice}
              name="mimic-language"
              onChange={async () => {
                const result = await change(choice);
                if (result) setNotice(result);
              }}
              type="radio"
              value={choice}
            />
            {t(choice === "en" ? "english" : "traditionalChinese")}
          </label>
        ))}
      </div>
      {notice?.locale === locale ? (
        <div role="status">
          <p>{t("changed")}</p>
          {!notice.synced && <p>{t("deviceOnly")}</p>}
        </div>
      ) : null}
    </fieldset>
  );
}
