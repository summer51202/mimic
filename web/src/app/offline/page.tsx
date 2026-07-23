import Image from "next/image";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      style={{
        display: "grid",
        minHeight: "100svh",
        placeItems: "center",
        background: "var(--mimic-color-surface)",
        color: "var(--mimic-color-ink)",
        padding: "2rem",
      }}
    >
      <section
        className="pixel-panel"
        style={{
          display: "grid",
          gap: "1rem",
          justifyItems: "center",
          maxWidth: "34rem",
          textAlign: "center",
        }}
      >
        <Image
          alt="咪咪庫 / Mimiku"
          className="pixel-art"
          height={128}
          priority
          src="/brand/mimiku-idle.png"
          width={128}
        />
        <h1 style={{ fontSize: "clamp(1.75rem, 6vw, 3rem)" }}>
          mimic 離線中
        </h1>
        <p style={{ lineHeight: 1.6 }}>
          一起存，一起花，一起在異世界探險吧!
        </p>
        <Link className="pixel-button" data-emphasis="primary" href="/">
          回首頁
        </Link>
      </section>
    </main>
  );
}
