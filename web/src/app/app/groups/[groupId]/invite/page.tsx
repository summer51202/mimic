import { getTranslations } from "next-intl/server";
import { InviteCreatePanel } from "@/features/invitations/invite-create-panel";
import { getGroup } from "@/features/groups/group-queries";

import styles from "@/features/groups/group-management.module.css";

interface GroupInvitePageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupInvitePage({ params }: GroupInvitePageProps) {
  const t = await getTranslations("invite.app");
  const { groupId } = await params;
  const group = await getGroup(groupId);

  return (
    <section className={styles.page} aria-labelledby="group-invite-title">
      <header className={styles.header}>
        <p>{t("kicker")}</p>
        <h1 id="group-invite-title">{t("title", { name: group.name })}</h1>
        <p>
          {t("intro")}
        </p>
      </header>
      <InviteCreatePanel groupId={group.id} />
    </section>
  );
}
