import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

import { pixelUiFiles } from "@/shared/brand/pixel-ui-assets";

export default async function OfflinePage() {
  const t = await getTranslations();
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
          alt={t("brand.speaker")}
          className="pixel-art"
          height={128}
          priority
          src={pixelUiFiles.characters.idle}
          unoptimized
          width={128}
        />
        <h1 style={{ fontSize: "clamp(1.75rem, 6vw, 3rem)" }}>
          {t("pwa.offlineTitle")}
        </h1>
        <p style={{ lineHeight: 1.6 }}>
          {t("brand.tagline")}
        </p>
        <Link className="pixel-button" data-emphasis="primary" href="/">
          {t("common.home")}
        </Link>
      </section>
    </main>
  );
}
