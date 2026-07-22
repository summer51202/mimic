import type { Metadata } from "next";
import Image from "next/image";
import styles from "@/shared/brand/hero.module.css";
import { publicCopy } from "@/shared/brand/public-copy";

export const metadata: Metadata = {
  title: "功能 | mimic",
  description: "mimic 的共同基金、出資、支出分帳與結算鎖定功能。",
};

export default function FeaturesPage() {
  return (
    <section className={styles.contentPage} aria-labelledby="features-title">
      <div className={styles.contentHero}>
        <div>
          <p className={styles.kicker}>
            {publicCopy.characterNameZh} / {publicCopy.characterNameEn}
          </p>
          <h1 id="features-title" className={styles.pageTitle}>
            mimic 功能
          </h1>
          <p className={styles.pageLead}>{publicCopy.tagline}</p>
        </div>
        <Image
          className={`${styles.pageMascot} pixel-art`}
          src="/brand/mimiku-thinking.png"
          alt="咪咪庫正在整理共同基金與分帳紀錄"
          width={512}
          height={512}
          sizes="(max-width: 760px) 9rem, 12rem"
        />
      </div>

      <div className={styles.featureGrid}>
        {publicCopy.features.map((feature) => (
          <article className={styles.featureItem} key={feature.title}>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <p className={styles.featureText}>{feature.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
