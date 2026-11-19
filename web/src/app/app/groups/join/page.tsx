import { useTranslations } from "next-intl";
import { JoinGroupForm } from "@/features/invitations/join-group-form";
import styles from "@/features/groups/group-management.module.css";
import { PixelFrame } from "@/shared/ui/pixel-frame";

export default function JoinGroupPage() {
  const t = useTranslations("groups");
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>{t("joinKicker")}</p>
        <h1>{t("join")}</h1>
        <p>{t("joinIntro")}</p>
      </header>
      <PixelFrame>
        <JoinGroupForm />
      </PixelFrame>
    </section>
  );
}
