import { GroupForm } from "@/features/groups/group-form";
import styles from "@/features/groups/group-management.module.css";
import { PixelFrame } from "@/shared/ui/pixel-frame";

export default function NewGroupPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>new adventure party</p>
        <h1>Create group</h1>
        <p>Start a shared treasury for two people or a small group.</p>
      </header>
      <PixelFrame>
        <GroupForm mode="create" />
      </PixelFrame>
    </section>
  );
}
