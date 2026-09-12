import Link from "next/link";

import { Wordmark } from "@/shared/brand/wordmark";

import type { AppSection } from "./app-section";
import styles from "./app-navigation.module.css";

type AppNavigationVariant = "mobile" | "desktop";

type AppNavigationProps = {
  currentSection: AppSection | undefined;
  variant: AppNavigationVariant;
};

const navigationItems = [
  {
    icon: "H",
    href: "/app",
    label: "首頁",
    status: "available",
  },
  { icon: "P", href: "/app/personal", label: "我的寶箱", status: "available" },
  {
    icon: "G",
    href: "/app/groups",
    label: "共同群組",
    status: "available",
  },
  {
    icon: "!",
    href: "/app/tasks",
    label: "任務",
    status: "available",
  },
  {
    icon: "S",
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
      {variant === "desktop" ? (
        <div className={styles.brand}>
          <Wordmark as="div" />
        </div>
      ) : null}

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
                <span aria-hidden="true" className={styles.icon}>
                  {item.icon}
                </span>
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
                <span aria-hidden="true" className={styles.icon}>
                  {item.icon}
                </span>
                <span className={styles.label}>{item.label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
