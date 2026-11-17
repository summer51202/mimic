import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import styles from "@/shared/brand/hero.module.css";
import { POLICY_EFFECTIVE_DATE } from "@/shared/brand/public-copy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.policy.privacy");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("landing.policy");
  return (
    <section className={styles.contentPage} aria-labelledby="privacy-title">
      <p className={styles.policyBadge}>{t("badge")}</p>
      <h1 id="privacy-title" className={styles.pageTitle}>
        {t("privacy.title")}
      </h1>
      <p className={styles.pageLead}>{t("privacy.lead")}</p>
      <dl className={styles.policyFacts}>
        <div>
          <dt>{t("effective")}</dt>
          <dd>{POLICY_EFFECTIVE_DATE}</dd>
        </div>
        <div>
          <dt>{t("status")}</dt>
          <dd>{t("privacy.draft")}</dd>
        </div>
      </dl>
    </section>
  );
}
