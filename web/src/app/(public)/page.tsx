import { Hero } from "@/shared/brand/hero";
import styles from "@/shared/brand/hero.module.css";

const signals = [
  {
    title: "共同基金",
    text: "為共同目標建立基金，讓每筆出資與支出都回到同一個清楚的帳務脈絡。",
  },
  {
    title: "彈性分帳",
    text: "支援等分、比例、固定金額與混合分帳，也能保留多人付款的真實金流。",
  },
  {
    title: "結算鎖定",
    text: "完成結算後鎖定期間，修正用新交易補上，讓共同帳務不被回頭改寫。",
  },
];

export default function PublicHome() {
  return (
    <>
      <Hero />
      <section
        id="features"
        className={styles.nextBand}
        aria-label="mimic 功能摘要"
      >
        <div className={styles.nextBandInner}>
          {signals.map((signal) => (
            <article className={styles.signal} key={signal.title}>
              <h2 className={styles.signalTitle}>{signal.title}</h2>
              <p className={styles.signalText}>{signal.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
