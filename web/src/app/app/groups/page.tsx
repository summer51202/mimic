import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { GroupList } from "@/features/groups/group-list";
import { listGroups } from "@/features/groups/group-queries";
import styles from "@/features/groups/group-management.module.css";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

export default async function GroupsPage() {
  const t = await getTranslations("groups");
  let groups;

  try {
    groups = await listGroups();
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>{t("roster")}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
        <div className={styles.actions}>
          <Link className="pixel-button" data-emphasis="primary" href="/app/groups/new">
            {t("create")}
          </Link>
          <Link className="pixel-button" data-emphasis="secondary" href="/app/groups/join">
            {t("join")}
          </Link>
        </div>
      </header>
      <GroupList groups={groups} />
    </section>
  );
}
