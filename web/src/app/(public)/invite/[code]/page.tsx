import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/shared/brand/hero.module.css";

type InvitePageProps = {
  params: Promise<{
    code: string;
  }>;
};

const inviteCodePattern = /^[A-Za-z0-9_-]{6,32}$/;

export const metadata: Metadata = {
  title: "邀請 | mimic",
  description: "使用 mimic 邀請連結加入共同基金空間。",
};

function maskInviteCode(code: string) {
  return `${code.slice(0, 4)}••••`;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const isValidCode = inviteCodePattern.test(code);

  if (!isValidCode) {
    return (
      <section className={styles.contentPage} aria-labelledby="invalid-invite-title">
        <p className={styles.policyBadge}>邀請狀態</p>
        <h1 id="invalid-invite-title" className={styles.pageTitle}>
          邀請連結無效
        </h1>
        <p className={styles.pageLead}>
          這組邀請代碼格式不正確。請確認你開啟的是最新的 mimic 邀請連結。
        </p>
      </section>
    );
  }

  const returnTo = encodeURIComponent(`/invite/${code}`);

  return (
    <section className={styles.contentPage} aria-labelledby="invite-title">
      <p className={styles.policyBadge}>邀請入口</p>
      <h1 id="invite-title" className={styles.pageTitle}>
        接受 mimic 邀請
      </h1>
      <p className={styles.pageLead}>
        這是一個公開邀請入口。為了保護共同帳務，登入前不會顯示群組、成員、基金或金額資訊。
      </p>
      <div className={styles.inviteReference}>
        <span>邀請參考</span>
        <strong>{maskInviteCode(code)}</strong>
      </div>
      <div className={styles.actionRow}>
        <Link className={styles.primaryAction} href={`/login?returnTo=${returnTo}`}>
          登入後接受邀請
        </Link>
        <Link className={styles.navLink} href={`/register?returnTo=${returnTo}`}>
          註冊新帳號
        </Link>
      </div>
    </section>
  );
}
