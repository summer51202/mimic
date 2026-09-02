"use client";

import { type FormEvent, useMemo, useState } from "react";

import { AppClientError, appFetch } from "@/shared/api/app-fetch";
import type { Member } from "@/shared/api/domain-contracts";
import { formatMinorUnit } from "@/shared/finance/minor-unit";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { allocateEqualSplit, majorToMinorUnit } from "./activity-schema";
import styles from "./activity.module.css";

type SplitMode = "equal" | "fixed";

type ExpenseFormProps = {
  fundId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
  onSuccess: () => void;
};

type ExpenseFieldErrors = Partial<Record<
  "title" | "amount" | "date" | "payers" | "splits",
  string
>>;

export function ExpenseForm({
  fundId,
  currency,
  members,
  currentUserId,
  onSuccess,
}: ExpenseFormProps) {
  const active = useMemo(
    () => members.filter((member) => member.status.toLowerCase() === "active"),
    [members],
  );
  const defaultPayerId = active.some((member) => member.user_id === currentUserId)
    ? currentUserId
    : active[0]?.user_id;
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<SplitMode>("equal");
  const [payerIds, setPayerIds] = useState(defaultPayerId ? [defaultPayerId] : []);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});
  const [participantIds, setParticipantIds] = useState(() =>
    active.map((member) => member.user_id),
  );
  const [fixedAmounts, setFixedAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ExpenseFieldErrors>({});
  const [pending, setPending] = useState(false);
  const orderedParticipantIds = useMemo(
    () => active
      .filter((member) => participantIds.includes(member.user_id))
      .map((member) => member.user_id),
    [active, participantIds],
  );

  const equalPreview = useMemo(() => {
    if (mode !== "equal" || !amount || orderedParticipantIds.length === 0) return [];

    try {
      const total = majorToMinorUnit(amount, currency);
      return allocateEqualSplit(total, orderedParticipantIds).map((allocation) => ({
        ...allocation,
        name: active.find((member) => member.user_id === allocation.userId)
          ?.display_name ?? "Member",
      }));
    } catch {
      return [];
    }
  }, [active, amount, currency, mode, orderedParticipantIds]);

  function toggle(
    id: string,
    values: string[],
    update: (next: string[]) => void,
  ) {
    update(
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;

    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      const total = majorToMinorUnit(amount, currency);
      if (!title.trim() || !date || !payerIds.length || !orderedParticipantIds.length) {
        throw new Error("FORM_REQUIRED");
      }

      const payers = payerIds.map((id) => ({
        payer_user_id: id,
        amount_minor: entryAmount(
          payerAmounts[id] ?? (payerIds.length === 1 ? amount : ""),
          currency,
          "PAYER_AMOUNT_INVALID",
        ),
      }));
      if (payers.reduce((sum, payer) => sum + payer.amount_minor, 0) !== total) {
        throw new Error("PAYER_TOTAL_MISMATCH");
      }

      const allocations = mode === "equal"
        ? allocateEqualSplit(total, orderedParticipantIds)
        : orderedParticipantIds.map((userId) => ({
          userId,
          amountMinor: entryAmount(
            fixedAmounts[userId] ?? "",
            currency,
            "SPLIT_AMOUNT_INVALID",
          ),
        }));
      if (allocations.reduce((sum, split) => sum + split.amountMinor, 0) !== total) {
        throw new Error("SPLIT_TOTAL_MISMATCH");
      }

      const splits = allocations.map((split, index) => mode === "equal"
        ? { user_id: split.userId, split_type: "equal", sort_order: index }
        : {
          user_id: split.userId,
          split_type: "fixed",
          fixed_amount_minor: split.amountMinor,
          sort_order: index,
        });

      await appFetch(`/api/app/funds/${encodeURIComponent(fundId)}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          amount_minor: total,
          split_mode: mode,
          expense_type: "fund_expense",
          occurred_on: date,
          note: note.trim() || undefined,
          payers,
          splits,
        }),
      });
      onSuccess();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "UNKNOWN";
      if (code === "PAYER_AMOUNT_INVALID") {
        setFieldErrors({ payers: "Enter a positive amount for every selected payer." });
      } else if (code === "SPLIT_AMOUNT_INVALID") {
        setFieldErrors({ splits: "Enter a positive share for every selected member." });
      } else if (code.startsWith("AMOUNT_")) {
        setFieldErrors({ amount: "Enter a positive amount using the fund currency precision." });
      } else if (code === "PAYER_TOTAL_MISMATCH") {
        setFieldErrors({ payers: "Payer amounts must equal the expense total." });
      } else if (code === "SPLIT_TOTAL_MISMATCH") {
        setFieldErrors({ splits: "Member shares must equal the expense total." });
      } else if (caught instanceof AppClientError && caught.code === "LOCKED_PERIOD") {
        setFieldErrors({ date: "This date is in a completed settlement period. Choose a current date." });
      } else if (caught instanceof AppClientError && caught.status === 403) {
        setError("You no longer have access to this fund.");
      } else if (
        caught instanceof TypeError
        || (caught instanceof AppClientError && caught.status >= 500)
      ) {
        setError("Could not reach Mimic. Your entries are still here; try again.");
      } else if (code === "FORM_REQUIRED") {
        setFieldErrors({
          ...(!title.trim() ? { title: "Enter a title." } : {}),
          ...(!date ? { date: "Choose a date." } : {}),
          ...(!payerIds.length ? { payers: "Select at least one payer." } : {}),
          ...(!orderedParticipantIds.length ? { splits: "Select at least one member." } : {}),
        });
      } else {
        setError("Could not add this expense. Review the entries and try again.");
      }
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
      <PixelField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} error={fieldErrors.title} required />
      <PixelField label="Amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} error={fieldErrors.amount} required />
      <PixelField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} error={fieldErrors.date} required />
      <label className={styles.fieldLabel}>
        Split mode
        <select value={mode} onChange={(event) => setMode(event.target.value as SplitMode)}>
          <option value="equal">Equal</option>
          <option value="fixed">Fixed amounts</option>
        </select>
      </label>
      <fieldset className={styles.fieldset} aria-describedby={fieldErrors.payers ? "payer-error" : undefined}>
        <legend>Who paid?</legend>
        {active.map((member) => (
          <div className={styles.memberInput} key={member.user_id}>
            <label className={styles.memberChoice}>
              <input type="checkbox" checked={payerIds.includes(member.user_id)} onChange={() => toggle(member.user_id, payerIds, setPayerIds)} />
              {member.display_name}
            </label>
            {payerIds.includes(member.user_id) ? (
              <PixelField
                label={`${member.display_name} paid`}
                value={payerAmounts[member.user_id] ?? (payerIds.length === 1 ? amount : "")}
                onChange={(event) => setPayerAmounts((values) => ({ ...values, [member.user_id]: event.target.value }))}
              />
            ) : null}
          </div>
        ))}
        {fieldErrors.payers ? <p className="pixel-field__error" id="payer-error" role="alert">{fieldErrors.payers}</p> : null}
      </fieldset>
      <fieldset className={styles.fieldset} aria-describedby={fieldErrors.splits ? "split-error" : undefined}>
        <legend>Who shares this expense?</legend>
        {active.map((member) => (
          <div className={styles.memberInput} key={member.user_id}>
            <label className={styles.memberChoice}>
              <input
                type="checkbox"
                checked={participantIds.includes(member.user_id)}
                onChange={() => toggle(member.user_id, participantIds, setParticipantIds)}
              />
              {member.display_name}
            </label>
            {mode === "fixed" && participantIds.includes(member.user_id) ? (
              <PixelField
                label={`${member.display_name} share`}
                value={fixedAmounts[member.user_id] ?? ""}
                onChange={(event) => setFixedAmounts((values) => ({ ...values, [member.user_id]: event.target.value }))}
              />
            ) : null}
          </div>
        ))}
        {equalPreview.length ? (
          <ul className={styles.splitPreview} aria-live="polite">
            {equalPreview.map((allocation) => (
              <li key={allocation.userId}>
                <span>{allocation.name}</span>
                <strong>{formatMinorUnit(String(allocation.amountMinor), currency, "en-US")}</strong>
              </li>
            ))}
          </ul>
        ) : null}
        {fieldErrors.splits ? <p className="pixel-field__error" id="split-error" role="alert">{fieldErrors.splits}</p> : null}
      </fieldset>
      <label className={styles.fieldLabel}>
        Note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <PixelButton disabled={pending} type="submit">
        {pending ? "Adding..." : "Add expense"}
      </PixelButton>
    </form>
  );
}

function entryAmount(value: string, currency: string, errorCode: string) {
  try {
    return majorToMinorUnit(value, currency);
  } catch {
    throw new Error(errorCode);
  }
}
