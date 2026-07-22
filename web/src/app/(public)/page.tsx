import { Hero } from "@/shared/brand/hero";
import styles from "@/shared/brand/hero.module.css";

const signals = [
  {
    title: "共享基金",
    text: "把旅行、約會、家用和夢想清單放在同一個冒險背包裡，誰存了多少一眼看清楚。",
  },
  {
    title: "一起記帳",
    text: "支出、分攤和補款都保留脈絡，不靠猜測回想上一次是誰先墊。",
  },
  {
    title: "安心結算",
    text: "每段旅程結束後鎖定紀錄，後續修正用新交易補上，帳本不倒帶。",
  },
];

export default function PublicHome() {
  return (
    <>
      <Hero />
      <section
        id="features"
        className={styles.nextBand}
        aria-label="mimic 冒險功能概覽"
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
