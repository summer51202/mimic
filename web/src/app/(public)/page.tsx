import { hasSession } from "@/shared/auth/has-session";
import { Hero } from "@/shared/brand/hero";
import styles from "@/shared/brand/hero.module.css";
import { getTranslations } from "next-intl/server";

const signals = ["fund", "split", "lock"] as const;

export default async function PublicHome() {
  const [authenticated, t] = await Promise.all([hasSession(), getTranslations("landing")]);
  return (
    <>
      <Hero authenticated={authenticated} />
      <section
        id="features"
        className={styles.nextBand}
        aria-label={t("summary")}
      >
        <div className={styles.nextBandInner}>
          {signals.map((signal) => (
            <article className={styles.signal} key={signal}>
              <h2 className={styles.signalTitle}>{t(`signals.${signal}.title`)}</h2>
              <p className={styles.signalText}>{t(`signals.${signal}.text`)}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
