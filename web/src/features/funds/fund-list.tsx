import Link from "next/link";

import type { Fund } from "@/shared/api/domain-contracts";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import { FundLedgerCard } from "./fund-ledger-card";
import styles from "./fund-summary.module.css";

type FundListProps = {
  funds: Fund[];
  groupId: string;
};

export function FundList({ funds, groupId }: FundListProps) {
  return (
    <PixelFrame className={styles.panel}>
      <div className={styles.header}>
        <h2>Funds</h2>
        <Link href={`/app/groups/${groupId}/funds/new`}>新增</Link>
      </div>
      {funds.length === 0 ? (
        <p className={styles.muted}>還沒有基金。先建立一個共同目標。</p>
      ) : (
        <ul className={styles.fundList}>
          {funds.map((fund) => (
            <FundLedgerCard fund={fund} key={fund.id} />
          ))}
        </ul>
      )}
    </PixelFrame>
  );
}
