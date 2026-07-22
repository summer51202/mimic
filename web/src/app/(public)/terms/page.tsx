import type { Metadata } from "next";
import styles from "@/shared/brand/hero.module.css";
import { POLICY_EFFECTIVE_DATE, publicCopy } from "@/shared/brand/public-copy";

export const metadata: Metadata = {
  title: "服務條款 | mimic",
  description: "mimic 預發布版本服務條款。",
};

export default function TermsPage() {
  return (
    <section className={styles.contentPage} aria-labelledby="terms-title">
      <p className={styles.policyBadge}>預發布版本</p>
      <h1 id="terms-title" className={styles.pageTitle}>
        服務條款
      </h1>
      <p className={styles.pageLead}>{publicCopy.policy.termsStatus}</p>
      <dl className={styles.policyFacts}>
        <div>
          <dt>生效日期</dt>
          <dd>{POLICY_EFFECTIVE_DATE}</dd>
        </div>
        <div>
          <dt>目前狀態</dt>
          <dd>上線前草稿，僅用於標示未來條款頁位置。</dd>
        </div>
      </dl>
    </section>
  );
}
