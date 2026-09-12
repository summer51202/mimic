"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppNavigation } from "./app-navigation";
import { currentAppSection } from "./app-section";
import styles from "./pixel-app-shell.module.css";

interface PixelAppShellProps {
  children: ReactNode;
}

export function PixelAppShell({ children }: PixelAppShellProps) {
  const currentSection = currentAppSection(usePathname());

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
      <Link className={styles.quickAction} href="/app?quick=1">記一筆支出</Link>
      <div className={styles.mobileOnly}>
        <AppNavigation currentSection={currentSection} variant="mobile" />
      </div>
    </div>
  );
}
