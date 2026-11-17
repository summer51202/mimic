import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/features/settings/settings-form";
import { getSettingsProfile } from "@/features/settings/settings-queries";
import styles from "@/features/settings/settings.module.css";
import { AppReadFailure } from "@/shared/ui/app-read-failure";
import { PixelFrame } from "@/shared/ui/pixel-frame";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  let profile;

  try {
    profile = await getSettingsProfile();
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <PixelFrame>
        <SettingsForm profile={profile} />
      </PixelFrame>
    </section>
  );
}
