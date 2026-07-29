import { InviteCreatePanel } from "@/features/invitations/invite-create-panel";
import { getGroup } from "@/features/groups/group-queries";

import styles from "@/features/groups/group-management.module.css";

interface GroupInvitePageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupInvitePage({ params }: GroupInvitePageProps) {
  const { groupId } = await params;
  const group = await getGroup(groupId);

  return (
    <section className={styles.page} aria-labelledby="group-invite-title">
      <header className={styles.header}>
        <p>Invite gate</p>
        <h1 id="group-invite-title">Invite members to {group.name}</h1>
        <p>
          Create a short-lived invite link. Mimiku keeps group balances and
          member details hidden until the invited user signs in and accepts.
        </p>
      </header>
      <InviteCreatePanel groupId={group.id} />
    </section>
  );
}
