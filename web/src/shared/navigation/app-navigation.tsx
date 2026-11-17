import { useTranslations } from "next-intl";
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
    label: "home",
    status: "available",
  },
  { icon: "nav-adventure-log", href: "/app/personal", label: "chests", status: "available" },
  {
    icon: "nav-guild",
    href: "/app/groups",
    label: "parties",
    status: "available",
  },
  {
    icon: "nav-tasks",
    href: "/app/tasks",
    label: "quests",
    status: "available",
  },
  {
    icon: "nav-settings",
    href: "/app/settings",
    label: "settings",
    status: "available",
  },
] as const;

export function AppNavigation({ currentSection, variant }: AppNavigationProps) {
  const t = useTranslations("nav");
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
                <span className={styles.label}>{t(item.label)}</span>
              </Link>
            ) : (
              <button
                aria-label={t("comingSoon", { label: t(item.label) })}
                className={styles.link}
                data-disabled="true"
                disabled
                type="button"
              >
                <NavigationIcon name={item.icon} size={variant === "desktop" ? 48 : 32} />
                <span className={styles.label}>{t(item.label)}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
