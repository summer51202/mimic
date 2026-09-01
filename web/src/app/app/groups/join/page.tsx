import { JoinGroupForm } from "@/features/invitations/join-group-form";
import styles from "@/features/groups/group-management.module.css";
import { PixelFrame } from "@/shared/ui/pixel-frame";

export default function JoinGroupPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>join an adventure party</p>
        <h1>Join group</h1>
        <p>Enter an invitation from a group member before reviewing it.</p>
      </header>
      <PixelFrame>
        <JoinGroupForm />
      </PixelFrame>
    </section>
  );
}
