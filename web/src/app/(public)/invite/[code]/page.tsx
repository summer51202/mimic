import type { Metadata } from "next";

import { InviteAcceptPanel } from "@/features/invitations/invite-accept-panel";
import { parseInviteCode } from "@/features/invitations/invite-schema";
import styles from "@/shared/brand/hero.module.css";

type InvitePageProps = {
  params: Promise<{
    code: string;
  }>;
};

export const metadata: Metadata = {
  title: "Invite | mimic",
  description: "Accept a private mimic shared money invite.",
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const isValidCode = parseInviteCode(code) !== null;

  return (
    <section className={styles.contentPage} aria-labelledby="invite-title">
      <InviteAcceptPanel
        authenticated={false}
        code={isValidCode ? code : ""}
        titleId="invite-title"
      />
    </section>
  );
}
