import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitch } from "@/shared/i18n/language-switch";
import { Wordmark } from "./wordmark";
import styles from "./hero.module.css";

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  const t = useTranslations();
  return (
    <header className={styles.siteHeader}>
      <nav className={styles.siteNav} aria-label={t("nav.header.label")}>
        <Link className={styles.brandLink} href="/">
          <Wordmark as="span" className="mimic-wordmark--dark" subtitle={t("brand.speaker")} />
        </Link>
        <div className={styles.navActions}>
          <LanguageSwitch className={styles.navLink} />
          <Link className={styles.navLink} href="/features">
            {t("common.features")}
          </Link>
          <Link className={styles.navLink} href={authenticated ? "/app" : "/login"}>
            {t(authenticated ? "nav.header.base" : "nav.header.login")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
