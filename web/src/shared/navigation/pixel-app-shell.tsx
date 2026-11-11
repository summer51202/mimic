"use client";

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
  const pathname = usePathname();
  const currentSection = currentAppSection(pathname);
  const quickHref = quickExpenseHref(pathname, useSearchParams().toString());

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <Link aria-label="回到 mimic 入口頁" className={styles.wordmarkLink} href="/">
          <Wordmark as="span" className="mimic-wordmark--dark" />
        </Link>
      </header>
      <div className={styles.body}>
        <div className={styles.desktopOnly}>
          <AppNavigation currentSection={currentSection} variant="desktop" />
        </div>
        <main className={styles.main}>{children}</main>
      </div>
      {(currentSection !== "/app" || pathname !== "/app") &&
        <Link className={styles.quickAction} href={quickHref}>
          <NavigationIcon name="action-record-expense" size={32} />
          記一筆支出
        </Link>}
      <div className={styles.mobileOnly}>
        <AppNavigation currentSection={currentSection} variant="mobile" />
      </div>
    </div>
  );
}
