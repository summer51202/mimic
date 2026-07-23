import styles from "@/shared/navigation/app-navigation.module.css";

export default function AppPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Private app preview</p>
        <h1 className={styles.title}>Your shared money space is ready.</h1>
        <p className={styles.intro}>
          This protected shell is connected to the secure session boundary. Group
          and fund data arrive in the next plan, so this page intentionally shows
          no balances, totals, contributions, expenses, or settlements yet.
        </p>
      </header>

      <section className={styles.panelGrid} aria-label="Application status">
        <article className={styles.notice}>
          <span className={styles.mimikuBadge} aria-hidden="true">
            M
          </span>
          <div>
            <h2 className={styles.panelTitle}>Mimiku is keeping watch.</h2>
            <p className={styles.panelText}>
              The app area is private now. The next work will replace this calm
              placeholder with real group and fund views from the API.
            </p>
          </div>
        </article>

        <aside className={styles.statusPanel} aria-labelledby="app-next-title">
          <h2 className={styles.panelTitle} id="app-next-title">
            Next planned data
          </h2>
          <ul className={styles.statusList}>
            <li className={styles.statusItem}>
              <span className={styles.statusMarker} aria-hidden="true" />
              Groups
            </li>
            <li className={styles.statusItem}>
              <span className={styles.statusMarker} aria-hidden="true" />
              Funds
            </li>
            <li className={styles.statusItem}>
              <span className={styles.statusMarker} aria-hidden="true" />
              Activity
            </li>
          </ul>
        </aside>
      </section>
    </>
  );
}
