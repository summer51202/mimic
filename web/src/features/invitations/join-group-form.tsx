"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useRef, useState } from "react";

import styles from "@/features/groups/group-management.module.css";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";

import { parseInviteEntry } from "./invite-entry";

interface JoinGroupFormProps {
  onSuccess?: (path: string) => void;
}

export function JoinGroupForm({ onSuccess }: JoinGroupFormProps) {
  const t = useTranslations("invite.join");
  const [entry, setEntry] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const inviteCode = parseInviteEntry(entry);

    if (!inviteCode) {
      setInvalid(true);
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
        description={t("entryHint")}
        error={invalid ? t("invalidEntry") : null}
        label={t("entryLabel")}
        name="invite"
        onChange={(event) => {
          setEntry(event.target.value);
          setInvalid(false);
        }}
        required
        spellCheck={false}
        value={entry}
      />
      <PixelButton type="submit">{t("review")}</PixelButton>
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
