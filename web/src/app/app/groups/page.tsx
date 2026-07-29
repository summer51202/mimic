import Link from "next/link";

import { GroupList } from "@/features/groups/group-list";
import { listGroups } from "@/features/groups/group-queries";
import styles from "@/features/groups/group-management.module.css";

export default async function GroupsPage() {
  const groups = await listGroups();

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>party roster</p>
        <h1>Your shared groups</h1>
        <p>Choose a treasury party or create a new one with Mimiku.</p>
        <Link className="pixel-button" data-emphasis="primary" href="/app/groups/new">
          Create group
        </Link>
      </header>
      <GroupList groups={groups} />
    </section>
  );
}
