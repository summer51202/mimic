import { SettingsForm } from "@/features/settings/settings-form";
import { getSettingsProfile } from "@/features/settings/settings-queries";
import styles from "@/features/settings/settings.module.css";
import { AppReadFailure } from "@/shared/ui/app-read-failure";
import { PixelFrame } from "@/shared/ui/pixel-frame";

export default async function SettingsPage() {
  let profile;

  try {
    profile = await getSettingsProfile();
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>player profile</p>
        <h1>Settings</h1>
        <p>Manage how other treasury members recognize you and this session.</p>
      </header>
      <PixelFrame>
        <SettingsForm profile={profile} />
      </PixelFrame>
    </section>
  );
}
