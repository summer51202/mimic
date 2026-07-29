import { FundForm } from "@/features/funds/fund-form";
import { getGroup } from "@/features/groups/group-queries";

import styles from "@/features/groups/group-management.module.css";

interface NewFundPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function NewFundPage({ params }: NewFundPageProps) {
  const { groupId } = await params;
  const group = await getGroup(groupId);

  return (
    <section className={styles.page} aria-labelledby="new-fund-title">
      <header className={styles.header}>
        <p>new fund</p>
        <h1 id="new-fund-title">Create a fund for {group.name}</h1>
        <p>Give this shared goal a name and currency. Balances start at zero.</p>
      </header>
      <FundForm groupId={group.id} />
    </section>
  );
}
