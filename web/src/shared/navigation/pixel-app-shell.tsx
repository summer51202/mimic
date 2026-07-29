import type { ReactNode } from "react";

import { AppNavigation } from "./app-navigation";
import styles from "./pixel-app-shell.module.css";

interface PixelAppShellProps {
  children: ReactNode;
}

export function PixelAppShell({ children }: PixelAppShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <span className={styles.logo}>mimic</span>
        <span className={styles.mimiku}>Mimiku</span>
      </header>
      <div className={styles.body}>
        <div className={styles.desktopOnly}>
          <AppNavigation currentPath="/app" variant="desktop" />
        </div>
        <main className={styles.main}>{children}</main>
      </div>
      <div className={styles.mobileOnly}>
        <AppNavigation currentPath="/app" variant="mobile" />
      </div>
    </div>
  );
}
