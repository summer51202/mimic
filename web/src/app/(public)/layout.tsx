import { brand } from "@/shared/brand/brand";
import styles from "@/shared/brand/hero.module.css";
import { SiteHeader } from "@/shared/brand/site-header";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.publicShell}>
      <SiteHeader />
      <main className={styles.main}>{children}</main>
      <footer className={styles.siteFooter}>
        <div className={styles.footerInner}>
          <span>{brand.productName}</span>
          <span>
            {brand.characterNameZh} / {brand.characterNameEn}
          </span>
        </div>
      </footer>
    </div>
  );
}
