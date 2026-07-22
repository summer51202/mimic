import Image from "next/image";
import Link from "next/link";
import { brand } from "./brand";
import styles from "./hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="public-hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>
          {brand.characterNameZh} / {brand.characterNameEn}
        </p>
        <h1 id="public-hero-title" className={styles.title}>
          {brand.productName}
        </h1>
        <p className={styles.tagline}>{brand.tagline}</p>
        <Link className={styles.primaryAction} href="/register">
          開始冒險
        </Link>
      </div>
      <div className={styles.heroVisual}>
        <Image
          className={`${styles.heroImage} pixel-art`}
          src="/brand/mimiku-hero.png"
          alt={`${brand.characterNameZh} ${brand.characterNameEn} 在異世界村莊守著共享基金寶箱`}
          width={1672}
          height={941}
          priority
          sizes="(max-width: 760px) 100vw, min(58vw, 940px)"
        />
      </div>
    </section>
  );
}
