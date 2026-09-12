"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

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
        <span className={styles.logo}>mimic</span>
        <span className={styles.mimiku}>Mimiku</span>
      </header>
      <div className={styles.body}>
        <div className={styles.desktopOnly}>
          <AppNavigation currentSection={currentSection} variant="desktop" />
        </div>
        <main className={styles.main}>{children}</main>
      </div>
      <Link className={styles.quickAction} href={quickHref}>記一筆支出</Link>
      <div className={styles.mobileOnly}>
        <AppNavigation currentSection={currentSection} variant="mobile" />
      </div>
    </div>
  );
}
