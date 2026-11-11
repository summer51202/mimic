import Link from "next/link";
import { Wordmark } from "./wordmark";
import styles from "./hero.module.css";

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  return (
    <header className={styles.siteHeader}>
      <nav className={styles.siteNav} aria-label="主要導覽">
        <Link className={styles.brandLink} href="/">
          <Wordmark as="span" className="mimic-wordmark--dark" />
        </Link>
        <div className={styles.navActions}>
          <Link className={styles.navLink} href="/features">
            功能
          </Link>
          <Link className={styles.navLink} href={authenticated ? "/app" : "/login"}>
            {authenticated ? "返回基地" : "登入"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
