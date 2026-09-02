"use client";

import { type FormEvent, useState } from "react";

import { AppClientError, appFetch } from "@/shared/api/app-fetch";
import type { Member } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { majorToMinorUnit } from "./activity-schema";
import styles from "./activity.module.css";

type ContributionFormProps = {
  fundId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
  onSuccess: () => void;
};

export function ContributionForm({
  fundId,
  currency,
  members,
  currentUserId,
  onSuccess,
}: ContributionFormProps) {
  const activeMembers = members.filter(
    (member) => member.status.toLowerCase() === "active",
  );
  const defaultContributorId = activeMembers.some(
    (member) => member.user_id === currentUserId,
  )
    ? currentUserId
    : activeMembers[0]?.user_id ?? "";
  const [contributor, setContributor] = useState(
    defaultContributorId,
  );
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"regular" | "one_time">("regular");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;

    setError(null);
    setAmountError(null);
    setDateError(null);
    setPending(true);

    try {
      const amountMinor = majorToMinorUnit(amount, currency);
      if (!contributor || !date) throw new Error("FORM_REQUIRED");
      await appFetch(`/api/app/funds/${encodeURIComponent(fundId)}/contributions`, {
        method: "POST",
        body: JSON.stringify({
          contributor_user_id: contributor,
          amount_minor: amountMinor,
          contribution_type: type,
          occurred_on: date,
          note: note.trim() || undefined,
        }),
      });
      onSuccess();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "UNKNOWN";
      if (code.startsWith("AMOUNT_")) {
        setAmountError("Enter a positive amount using the fund currency precision.");
      } else if (caught instanceof AppClientError && caught.code === "LOCKED_PERIOD") {
        setDateError("This date is in a completed settlement period. Choose a current date.");
      } else if (caught instanceof AppClientError && caught.status === 403) {
        setError("You no longer have access to this fund.");
      } else if (
        caught instanceof TypeError
        || (caught instanceof AppClientError && caught.status >= 500)
      ) {
        setError("Could not reach Mimic. Your entries are still here; try again.");
      } else if (code === "FORM_REQUIRED") {
        setError("Choose a contributor and date before adding the contribution.");
      } else {
        setError("Could not add this contribution. Review the entries and try again.");
      }
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
      <label className={styles.fieldLabel}>
        Contributor
        <select value={contributor} onChange={(event) => setContributor(event.target.value)}>
          {activeMembers.map((member) => (
            <option key={member.user_id} value={member.user_id}>{member.display_name}</option>
          ))}
        </select>
      </label>
      <PixelField label="Amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} error={amountError} required />
      <label className={styles.fieldLabel}>
        Type
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
          <option value="regular">Regular</option>
          <option value="one_time">One time</option>
        </select>
      </label>
      <PixelField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} error={dateError} required />
      <label className={styles.fieldLabel}>
        Note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <PixelButton disabled={pending} type="submit">
        {pending ? "Adding..." : "Add contribution"}
      </PixelButton>
    </form>
  );
}
