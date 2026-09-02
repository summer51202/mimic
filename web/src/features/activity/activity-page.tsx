"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Fund, Member } from "@/shared/api/domain-contracts";
import { formatMinorUnit } from "@/shared/finance/minor-unit";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import { ActivityDialogs } from "./activity-dialogs";
import type { ActivityRecord } from "./activity-queries";
import styles from "./activity.module.css";

type Filter = "all" | "contribution" | "expense";

type ActivityPageProps = {
  funds: Fund[];
  members: Member[];
  records: ActivityRecord[];
  selectedFundId: string;
  currentUserId: string;
  action: string | null;
  balanceMinor: string;
};

export function ActivityPage({
  funds,
  members,
  records,
  selectedFundId,
  currentUserId,
  action,
  balanceMinor,
}: ActivityPageProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<string | null>(null);
  const fund = funds.find((item) => item.id === selectedFundId) ?? funds[0];
  const visible = filter === "all"
    ? records
    : records.filter((record) => record.kind === filter);
  const names = new Map(members.map((member) => [member.user_id, member.display_name]));
  const memberOrder = new Map(members.map((member, index) => [member.user_id, index]));

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Records</p>
          <h1>Activity</h1>
          {fund ? (
            <p className={styles.balance}>
              <span>Fund balance</span>
              <strong>{formatMinorUnit(balanceMinor, fund.currency, "en-US")}</strong>
            </p>
          ) : null}
        </div>
        <label className={styles.fieldLabel}>
          Fund
          <select
            value={selectedFundId}
            onChange={(event) => router.push(`/app/activity?fund=${encodeURIComponent(event.target.value)}`)}
          >
            {funds.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </header>
      {fund ? (
        <ActivityDialogs
          fund={fund}
          members={members}
          currentUserId={currentUserId}
          initialAction={action}
          onSuccess={setStatus}
        />
      ) : null}
      {status ? <p role="status">{status}</p> : null}
      <PixelFrame className={styles.ledger}>
        <div className={styles.filters} role="group" aria-label="Filter activity">
          {(["all", "contribution", "expense"] as Filter[]).map((value) => (
            <PixelButton
              key={value}
              emphasis={filter === value ? "primary" : "ghost"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {filterLabel(value)}
            </PixelButton>
          ))}
        </div>
        {visible.length === 0 ? (
          <p>{records.length === 0 ? "No activity yet." : "No records match this filter."}</p>
        ) : (
          Object.entries(Object.groupBy(visible, (record) => record.occurred_on)).map(([date, items]) => (
            <section key={date}>
              <h2 className={styles.date}>{date}</h2>
              <ul className={styles.records}>
                {items?.map((record) => (
                  <li key={`${record.kind}:${record.id}`} className={styles.record}>
                    <span>
                      <strong>
                        {record.kind === "expense"
                          ? record.title
                          : `${capitalize(record.contribution_type)} contribution`}
                      </strong>
                      <small>
                        {record.kind === "expense"
                          ? `${payerSummary(record, names, memberOrder)} · ${capitalize(record.split_mode)}`
                          : names.get(record.contributor_user_id) ?? "Member"}
                      </small>
                      {record.note ? <small>{record.note}</small> : null}
                    </span>
                    <strong className={record.kind === "expense" ? styles.outflow : styles.inflow}>
                      {record.kind === "expense" ? "−" : "+"}{" "}
                      {formatMinorUnit(record.amount_minor, fund?.currency ?? "TWD", "en-US")}
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </PixelFrame>
    </section>
  );
}

function filterLabel(value: Filter) {
  if (value === "all") return "All";
  return value === "contribution" ? "Contributions" : "Expenses";
}

function capitalize(value: string) {
  return value.replace("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function payerSummary(
  record: Extract<ActivityRecord, { kind: "expense" }>,
  names: Map<string, string>,
  memberOrder: Map<string, number>,
) {
  const orderedPayers = [...record.payers].sort((left, right) =>
    (memberOrder.get(left.payer_user_id) ?? Number.MAX_SAFE_INTEGER)
      - (memberOrder.get(right.payer_user_id) ?? Number.MAX_SAFE_INTEGER)
    || left.payer_user_id.localeCompare(right.payer_user_id));
  const firstPayer = names.get(orderedPayers[0]?.payer_user_id ?? "") ?? "Member";
  const additionalPayers = record.payers.length - 1;
  return additionalPayers > 0 ? `${firstPayer} + ${additionalPayers} more` : firstPayer;
}
