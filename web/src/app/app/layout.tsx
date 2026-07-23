import type { ReactNode } from "react";

import { requireSession } from "@/shared/auth/require-session";
import { AppNavigation } from "@/shared/navigation/app-navigation";
import styles from "@/shared/navigation/app-navigation.module.css";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  await requireSession();

  return (
    <div className={styles.appShell}>
      <div className={styles.desktopOnly}>
        <AppNavigation currentPath="/app" variant="desktop" />
      </div>
      <main className={styles.main}>{children}</main>
      <div className={styles.mobileOnly}>
        <AppNavigation currentPath="/app" variant="mobile" />
      </div>
    </div>
  );
}
