import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { pixelUiFiles } from "@/shared/brand/pixel-ui-assets";
import styles from "@/shared/brand/hero.module.css";
import { featureKeys } from "@/shared/brand/public-copy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.features");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function FeaturesPage() {
  const t = await getTranslations();
  return (
    <section className={styles.contentPage} aria-labelledby="features-title">
      <div className={styles.contentHero}>
        <div>
          <p className={styles.kicker}>
            {t("brand.speaker")}
          </p>
          <h1 id="features-title" className={styles.pageTitle}>
            {t("landing.features.title")}
          </h1>
          <p className={styles.pageLead}>{t("brand.tagline")}</p>
        </div>
        <Image
          className={`${styles.pageMascot} pixel-art`}
          src={pixelUiFiles.characters.thinking}
          alt={t("landing.features.alt")}
          width={512}
          height={512}
          sizes="(max-width: 760px) 9rem, 12rem"
          unoptimized
        />
      </div>

      <div className={styles.featureGrid}>
        {featureKeys.map((feature) => (
          <article className={styles.featureItem} key={feature}>
            <h2 className={styles.featureTitle}>{t(`landing.features.${feature}.title`)}</h2>
            <p className={styles.featureText}>{t(`landing.features.${feature}.body`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
