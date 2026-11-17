"use client";

import { useTranslations } from "next-intl";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { Wordmark } from "@/shared/brand/wordmark";

import { NavigationIcon } from "./navigation-icon";
import { AppNavigation } from "./app-navigation";
import { currentAppSection, quickExpenseHref } from "./app-section";
import styles from "./pixel-app-shell.module.css";

interface PixelAppShellProps {
  children: ReactNode;
}

export function PixelAppShell({ children }: PixelAppShellProps) {
  const t = useTranslations("shell");
  const brandText = useTranslations("brand");
  const pathname = usePathname();
  const showsQuickAction = pathname !== "/app";
  const currentSection = currentAppSection(pathname);
  const quickHref = quickExpenseHref(pathname, useSearchParams().toString());

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <Link aria-label={t("returnToLanding")} className={styles.wordmarkLink} href="/">
          <Wordmark as="span" className="mimic-wordmark--dark" subtitle={brandText("speaker")} />
        </Link>
      </header>
      <div className={styles.body}>
        <div className={styles.desktopOnly}>
          <AppNavigation currentSection={currentSection} variant="desktop" />
        </div>
        <main className={styles.main} data-quick-action={showsQuickAction || undefined}>{children}</main>
      </div>
      {showsQuickAction &&
        <Link className={styles.quickAction} href={quickHref} scroll={quickHref.split("?")[0] !== pathname}>
          <NavigationIcon name="action-record-expense" size={32} />
          {t("record")}
        </Link>}
      <div className={styles.mobileOnly}>
        <AppNavigation currentSection={currentSection} variant="mobile" />
      </div>
    </div>
  );
}
