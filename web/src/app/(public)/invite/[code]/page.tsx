import type { Metadata } from "next";

import { InviteAcceptPanel } from "@/features/invitations/invite-accept-panel";
import { parseInviteCode } from "@/features/invitations/invite-schema";
import { hasSession } from "@/shared/auth/has-session";
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
  const [{ code }, authenticated] = await Promise.all([params, hasSession()]);
  const isValidCode = parseInviteCode(code) !== null;

  return (
    <section className={styles.contentPage} aria-labelledby="invite-title">
      <InviteAcceptPanel
        authenticated={authenticated}
        code={isValidCode ? code : ""}
        titleId="invite-title"
      />
    </section>
  );
}
