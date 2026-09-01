"use client";

import { type FormEvent, useRef, useState } from "react";

import styles from "@/features/groups/group-management.module.css";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";

import { parseInviteEntry } from "./invite-entry";

const invalidInviteMessage =
  "Enter a valid 12-character invite code or invite link.";

interface JoinGroupFormProps {
  onSuccess?: (path: string) => void;
}

export function JoinGroupForm({ onSuccess }: JoinGroupFormProps) {
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const inviteCode = parseInviteEntry(entry);

    if (!inviteCode) {
      setError(invalidInviteMessage);
      inputRef.current?.focus();
      return;
    }

    navigate(onSuccess, `/invite/${encodeURIComponent(inviteCode)}`);
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <PixelField
        ref={inputRef}
        autoCapitalize="none"
        autoComplete="off"
        description="Paste the 12-character code or the complete invitation link."
        error={error}
        label="Invite code or link"
        name="invite"
        onChange={(event) => {
          setEntry(event.target.value);
          setError(null);
        }}
        required
        spellCheck={false}
        value={entry}
      />
      <PixelButton type="submit">Review invite</PixelButton>
    </form>
  );
}

function navigate(onSuccess: JoinGroupFormProps["onSuccess"], path: string) {
  if (onSuccess) {
    onSuccess(path);
    return;
  }

  window.location.assign(path);
}
