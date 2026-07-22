import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>mimic</h1>
        <p>Next.js web foundation is ready.</p>
      </main>
    </div>
  );
}
