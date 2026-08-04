import type { FundSummary as FundSummaryData } from "@/shared/api/domain-contracts";
import { formatMinorUnit } from "@/shared/finance/minor-unit";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import styles from "./fund-summary.module.css";

type FundSummaryProps = {
  summary: FundSummaryData;
};

export function FundSummary({ summary }: FundSummaryProps) {
  const currency = summary.fund.currency;

  return (
    <section className={styles.page} aria-labelledby="fund-summary-title">
      <PixelFrame className={styles.panel} data-frame="fund-balance" variant="treasury">
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>fund ledger</p>
            <h1 className={`${styles.title} ${styles.fundName}`} data-contain-text id="fund-summary-title">
              {summary.fund.name}
            </h1>
          </div>
          <span className={styles.currency}>{currency}</span>
        </div>
        <p className={styles.muted}>目前餘額</p>
        <strong className={`${styles.balance} ${styles.balanceAmount}`} data-contain-text>
          <MoneyAmount currency={currency} value={summary.fund.cash_balance_minor} />
        </strong>
        <p className={styles.notice}>活動功能將在下一階段開放</p>
      </PixelFrame>

      <PixelFrame className={styles.panel} data-frame="current-period">
        <h2>Current period</h2>
        <p className={styles.muted}>{periodLabel(summary.current_period)}</p>
        <div className={styles.totals}>
          <Total label="Contribution" currency={currency} value={summary.current.contribution_minor} />
          <Total label="Expense" currency={currency} value={summary.current.expense_minor} />
          <Total label="Net" currency={currency} value={summary.current.net_change_minor} />
        </div>
        <h3>Member positions</h3>
        <ul className={styles.memberList}>
          {summary.current.member_positions.map((member) => (
            <li className={styles.member} key={member.user_id}>
              <span className={styles.memberName} data-contain-text>{member.display_name}</span>
              <strong className={styles.memberAmount} data-contain-text>
                <MoneyAmount currency={currency} value={member.position_minor} />
              </strong>
            </li>
          ))}
        </ul>
      </PixelFrame>

      <PixelFrame className={styles.panel} data-frame="all-time-totals">
        <details className={styles.summaryDisclosure} open>
          <summary>All-time totals</summary>
          <div className={styles.totals}>
            <Total label="Contribution" currency={currency} value={summary.all_time.contribution_minor} />
            <Total label="Expense" currency={currency} value={summary.all_time.expense_minor} />
            <Total label="Net" currency={currency} value={summary.all_time.net_change_minor} />
          </div>
        </details>
      </PixelFrame>
    </section>
  );
}

function Total({
  currency,
  label,
  value,
}: {
  currency: string;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.total}>
      <span>{label}</span>
      <strong className={styles.totalAmount} data-contain-text>
        <MoneyAmount currency={currency} value={value} />
      </strong>
    </div>
  );
}

export function MoneyAmount({
  currency,
  value,
}: {
  currency: string;
  value: string;
}) {
  return formatMinorUnit(value, currency, "en-US");
}

function periodLabel(period: FundSummaryData["current_period"]): string {
  if (!period.period_start || !period.period_end) {
    return "本期尚無交易";
  }

  return `${period.period_start} - ${period.period_end}`;
}
