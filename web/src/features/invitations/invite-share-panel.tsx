"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import { intlLocale } from "@/i18n/config";
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
  const t = useTranslations("invite.app");
  const locale = useLocale();
  const inviteText = useTranslations("invite");
  const codeRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<"codeCopied" | "codeSelected" | "linkCopied" | "linkSelected" | null>(null);
  const inviteUrl = useMemo(
    () =>
      new URL(
        `/invite/${invite.invite_code}`,
        origin ?? globalThis.location?.origin ?? "http://localhost",
      ).toString(),
    [invite.invite_code, origin],
  );
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const expiry = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(invite.expires_at));

  async function copyCode() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(invite.invite_code);
      setNotice("codeCopied");
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
    setNotice("codeSelected");
  }

  async function copyInvite() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("linkCopied");
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
    setNotice("linkSelected");
  }

  async function shareInvite() {
    if (!canShare) {
      return;
    }

    await navigator.share({
      text: t("shareText"),
      title: inviteText("kicker"),
      url: inviteUrl,
    });
  }

  return (
    <PixelFrame className={styles.panel}>
      {notice ? <PixelNotice variant="success">{t(notice)}</PixelNotice> : null}
      <p className={styles.meta}>{t("code")}</p>
      <p ref={codeRef} className={styles.code} tabIndex={-1}>
        {invite.invite_code}
      </p>
      <PixelField
        ref={inputRef}
        className={styles.urlField}
        label={t("link")}
        readOnly
        value={inviteUrl}
      />
      <p className={styles.meta}>
        {t("expiry", { time: expiry })}
      </p>
      <div className={styles.shareActions}>
        <PixelButton onClick={copyCode} type="button">
          {t("copyCode")}
        </PixelButton>
        <PixelButton onClick={copyInvite} type="button" emphasis="secondary">
          {t("copyLink")}
        </PixelButton>
        {canShare ? (
          <PixelButton onClick={shareInvite} type="button" emphasis="secondary">
            {t("share")}
          </PixelButton>
        ) : null}
      </div>
    </PixelFrame>
  );
}
