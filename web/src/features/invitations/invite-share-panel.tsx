"use client";

import { useMemo, useRef, useState } from "react";

import type { InviteCreated } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelFrame } from "@/shared/ui/pixel-frame";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import styles from "./invitation-flow.module.css";

type InviteSharePanelProps = {
  invite: InviteCreated;
  origin?: string;
};

export function InviteSharePanel({ invite, origin }: InviteSharePanelProps) {
  const codeRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inviteUrl = useMemo(
    () =>
      new URL(
        `/invite/${invite.invite_code}`,
        origin ?? globalThis.location?.origin ?? "http://localhost",
      ).toString(),
    [invite.invite_code, origin],
  );
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copyCode() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(invite.invite_code);
      setNotice("Invite code copied.");
      return;
    }

    const code = codeRef.current;
    const selection = window.getSelection();

    if (code && selection) {
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    code?.focus();
    setNotice("Invite code selected. Copy it from the page.");
  }

  async function copyInvite() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("Invite link copied.");
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
    setNotice("Invite link selected. Copy it from the field.");
  }

  async function shareInvite() {
    if (!canShare) {
      return;
    }

    await navigator.share({
      text: "Join my mimic shared money space.",
      title: "mimic invite",
      url: inviteUrl,
    });
  }

  return (
    <PixelFrame className={styles.panel}>
      {notice ? <PixelNotice variant="success">{notice}</PixelNotice> : null}
      <p className={styles.meta}>Invite code</p>
      <p ref={codeRef} className={styles.code} tabIndex={-1}>
        {invite.invite_code}
      </p>
      <PixelField
        ref={inputRef}
        className={styles.urlField}
        label="Invite link"
        readOnly
        value={inviteUrl}
      />
      <p className={styles.meta}>
        Expires {formatExpiry(invite.expires_at)}
      </p>
      <div className={styles.shareActions}>
        <PixelButton onClick={copyCode} type="button">
          Copy code
        </PixelButton>
        <PixelButton onClick={copyInvite} type="button" emphasis="secondary">
          Copy link
        </PixelButton>
        {canShare ? (
          <PixelButton onClick={shareInvite} type="button" emphasis="secondary">
            Share invite
          </PixelButton>
        ) : null}
      </div>
    </PixelFrame>
  );
}

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
