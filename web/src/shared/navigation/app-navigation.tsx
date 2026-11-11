import Link from "next/link";

import { NavigationIcon } from "./navigation-icon";

import type { AppSection } from "./app-section";
import styles from "./app-navigation.module.css";

type AppNavigationVariant = "mobile" | "desktop";

type AppNavigationProps = {
  currentSection: AppSection | undefined;
  variant: AppNavigationVariant;
};

const navigationItems = [
  {
    icon: "nav-home",
    href: "/app",
    label: "首頁",
    status: "available",
  },
  { icon: "nav-adventure-log", href: "/app/personal", label: "我的寶箱", status: "available" },
  {
    icon: "nav-guild",
    href: "/app/groups",
    label: "共同群組",
    status: "available",
  },
  {
    icon: "nav-tasks",
    href: "/app/tasks",
    label: "任務",
    status: "available",
  },
  {
    icon: "nav-settings",
    href: "/app/settings",
    label: "設定",
    status: "available",
  },
] as const;

export function AppNavigation({ currentSection, variant }: AppNavigationProps) {
  return (
    <nav
      aria-label="Primary app sections"
      className={styles.navigation}
      data-variant={variant}
    >
      <ul className={styles.list}>
        {navigationItems.map((item) => (
          <li className={styles.item} key={item.label}>
            {item.status === "available" ? (
              <Link
                aria-current={currentSection === item.href ? "page" : undefined}
                className={styles.link}
                data-current={currentSection === item.href ? "true" : undefined}
                href={item.href}
              >
                <NavigationIcon name={item.icon} size={variant === "desktop" ? 48 : 32} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            ) : (
              <button
                aria-label={`${item.label} (coming soon)`}
                className={styles.link}
                data-disabled="true"
                disabled
                type="button"
              >
                <NavigationIcon name={item.icon} size={variant === "desktop" ? 48 : 32} />
                <span className={styles.label}>{item.label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
