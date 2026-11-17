import { hasSession } from "@/shared/auth/has-session";
import { getTranslations } from "next-intl/server";
import styles from "@/shared/brand/hero.module.css";
import { SiteHeader } from "@/shared/brand/site-header";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [authenticated, t] = await Promise.all([hasSession(), getTranslations("brand")]);
  return (
    <div className={styles.publicShell}>
      <SiteHeader authenticated={authenticated} />
      <main className={styles.main}>{children}</main>
      <footer className={styles.siteFooter}>
        <div className={styles.footerInner}>
          <span>{t("name")}</span>
          <span>{t("speaker")}</span>
        </div>
      </footer>
    </div>
  );
}
