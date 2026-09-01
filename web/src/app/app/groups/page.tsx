import Link from "next/link";

import { GroupList } from "@/features/groups/group-list";
import { listGroups } from "@/features/groups/group-queries";
import styles from "@/features/groups/group-management.module.css";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

export default async function GroupsPage() {
  let groups;

  try {
    groups = await listGroups();
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>party roster</p>
        <h1>Your shared groups</h1>
        <p>Choose a treasury party, create a new one, or join with an invite.</p>
        <div className={styles.actions}>
          <Link className="pixel-button" data-emphasis="primary" href="/app/groups/new">
            Create group
          </Link>
          <Link className="pixel-button" data-emphasis="secondary" href="/app/groups/join">
            Join group
          </Link>
        </div>
      </header>
      <GroupList groups={groups} />
    </section>
  );
}
