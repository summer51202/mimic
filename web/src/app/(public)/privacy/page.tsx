import type { Metadata } from "next";
import styles from "@/shared/brand/hero.module.css";
import { POLICY_EFFECTIVE_DATE, publicCopy } from "@/shared/brand/public-copy";

export const metadata: Metadata = {
  title: "隱私權 | mimic",
  description: "mimic 預發布版本隱私權說明。",
};

export default function PrivacyPage() {
  return (
    <section className={styles.contentPage} aria-labelledby="privacy-title">
      <p className={styles.policyBadge}>預發布版本</p>
      <h1 id="privacy-title" className={styles.pageTitle}>
        隱私權說明
      </h1>
      <p className={styles.pageLead}>{publicCopy.policy.privacyStatus}</p>
      <dl className={styles.policyFacts}>
        <div>
          <dt>生效日期</dt>
          <dd>{POLICY_EFFECTIVE_DATE}</dd>
        </div>
        <div>
          <dt>目前狀態</dt>
          <dd>上線前草稿，僅用於標示未來政策頁位置。</dd>
        </div>
      </dl>
    </section>
  );
}
