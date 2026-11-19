import { useTranslations } from "next-intl";
import { GroupForm } from "@/features/groups/group-form";
import styles from "@/features/groups/group-management.module.css";
import { PixelFrame } from "@/shared/ui/pixel-frame";

export default function NewGroupPage() {
  const t = useTranslations("groups");
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>{t("newKicker")}</p>
        <h1>{t("create")}</h1>
        <p>{t("newIntro")}</p>
      </header>
      <PixelFrame>
        <GroupForm mode="create" />
      </PixelFrame>
    </section>
  );
}
