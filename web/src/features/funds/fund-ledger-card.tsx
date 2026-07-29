import Link from "next/link";

import type { Fund } from "@/shared/api/domain-contracts";
import { formatMinorUnit } from "@/shared/finance/minor-unit";

import styles from "./fund-summary.module.css";

type FundLedgerCardProps = {
  fund: Fund;
};

export function FundLedgerCard({ fund }: FundLedgerCardProps) {
  return (
    <li>
      <Link className={styles.fundLink} href={`/app/funds/${fund.id}`}>
        <span>{fund.name}</span>
        <strong>{formatMinorUnit(fund.balance_minor, fund.currency, "en-US")}</strong>
      </Link>
    </li>
  );
}
