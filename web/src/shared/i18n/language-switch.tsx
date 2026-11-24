"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { htmlLang, type EnabledLocale } from "@/i18n/config";
import { appFetch } from "@/shared/api/app-fetch";
import styles from "./language-switch.module.css";

const choices = ["zh-TW", "en", "ja"] as const;
const nameKeys = { "zh-TW": "traditionalChinese", en: "english", ja: "japanese" } as const;

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
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const menu = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = menu.current;
    const anchor = root.current;
    if (!open || !element || !anchor) return;

    function place() {
      if (!element || !anchor) return;
      element.dataset.align = "end";
      element.style.transform = "";
      const end = element.getBoundingClientRect();
      const limit = document.documentElement.clientWidth - 8;
      if (end.left >= 8 && end.right <= limit) return;

      const left = anchor.getBoundingClientRect().left;
      const start = { left, right: left + end.width };
      const overflow = (rect: { left: number; right: number }) =>
        Math.max(0, 8 - rect.left) + Math.max(0, rect.right - limit);
      const useStart = overflow(start) <= overflow(end);
      const rect = useStart ? start : end;
      element.dataset.align = useStart ? "start" : "end";
      const shift = Math.max(8 - rect.left, Math.min(0, limit - rect.right));
      if (shift !== 0) element.style.transform = `translateX(${shift}px)`;
    }

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);
  const current = locale === "en" ? t("english") : locale === "ja" ? t("japanese") : t("currentShort");

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function show(index: number) {
    setOpen(true);
    requestAnimationFrame(() => items.current[index]?.focus());
  }

  return (
    <span className={styles.root} ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
    <button
      aria-label={t("menuLabel", { current })}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      aria-busy={busy}
      aria-disabled={busy}
      className={className}
      ref={trigger}
      onClick={() => { if (!busy) { if (open) setOpen(false); else show(choices.indexOf(locale as EnabledLocale)); } }}
      onKeyDown={(event) => {
        if (!busy && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          show(event.key === "ArrowDown" ? 0 : choices.length - 1);
        }
      }}
      type="button"
    >
      <span aria-hidden="true" className={styles.full} lang={htmlLang(locale as EnabledLocale)}>{current}</span>
      <span aria-hidden="true" className={styles.short} lang={htmlLang(locale as EnabledLocale)}>{t("currentShort")}</span>
      <span aria-hidden="true"> ▾</span>
    </button>
    {open && <span className={styles.menu} data-align="end" id={menuId} ref={menu} role="menu" onKeyDown={(event) => {
      const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        items.current[(index + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault(); setOpen(false); trigger.current?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault(); items.current[event.key === "Home" ? 0 : choices.length - 1]?.focus();
      }
    }}>
      {choices.map((choice, index) => <button
        aria-checked={choice === locale}
        aria-disabled={busy}
        key={choice}
        lang={htmlLang(choice)}
        onClick={async () => {
          if (busy) return;
          if (choice === locale || await change(choice)) { setOpen(false); trigger.current?.focus(); }
        }}
        ref={(element) => { items.current[index] = element; }}
        role="menuitemradio"
        tabIndex={-1}
        type="button"
      >{t(nameKeys[choice])}</button>)}
    </span>}
    </span>
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
        {choices.map((choice) => (
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
            {t(nameKeys[choice])}
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
