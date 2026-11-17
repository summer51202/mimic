"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { appFetch } from "@/shared/api/app-fetch";
import { pixelUiRoles } from "@/shared/brand/pixel-ui-assets";
import type { InviteAcceptResult } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelFrame } from "@/shared/ui/pixel-frame";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { inviteErrorKey, type InviteErrorCode } from "./invite-errors";
import { parseInviteCode } from "./invite-schema";
import styles from "./invitation-flow.module.css";

type InviteAcceptPanelProps = {
  authenticated?: boolean;
  code: string;
  onSuccess?: (path: string) => void;
  titleId?: string;
};

export function InviteAcceptPanel({
  authenticated = false,
  code,
  onSuccess,
  titleId,
}: InviteAcceptPanelProps) {
  const t = useTranslations("invite");
  const validCode = parseInviteCode(code);
  const [error, setError] = useState<InviteErrorCode | null>(
    validCode ? null : "INVITE_NOT_FOUND",
  );
  const [pending, setPending] = useState(false);
  const returnTo = useMemo(
    () => `/invite/${encodeURIComponent(code)}`,
    [code],
  );

  async function acceptInvite() {
    if (!validCode || pending) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await appFetch<{ data: InviteAcceptResult }>(
        "/api/app/group-invites/accept",
        {
          body: JSON.stringify({ invite_code: validCode }),
          method: "POST",
        },
      );
      navigate(onSuccess, `/app/groups/${result.data.group_id}`);
    } catch (caught) {
      setError(inviteErrorKey(caught));
      setPending(false);
    }
  }

  return (
    <PixelFrame className={styles.panel}>
      <div className={styles.hero}>
        <div>
          <p className={styles.meta}>{t("kicker")}</p>
          <h1 id={titleId}>{t("title")}</h1>
          <p className={styles.meta}>
            {t("description")}
          </p>
        </div>
        <Image
          alt={t(error ? "altClosed" : "alt")}
          className="pixel-art"
          height={512}
          priority
          src={error ? pixelUiRoles.blockingError : pixelUiRoles.invitation}
          unoptimized
          width={512}
        />
      </div>
      {error ? <PixelNotice variant="error">{t(`errors.${error}`)}</PixelNotice> : null}
      {validCode ? <p className={styles.code}>{validCode}</p> : null}
      {!authenticated && validCode ? (
        <div className={styles.actions}>
          <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            {t("login")}
          </Link>
          <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
            {t("register")}
          </Link>
        </div>
      ) : null}
      {authenticated && validCode ? (
        <PixelButton disabled={pending} onClick={acceptInvite} type="button">
          {t(pending ? "accepting" : "accept")}
        </PixelButton>
      ) : null}
    </PixelFrame>
  );
}

function navigate(onSuccess: InviteAcceptPanelProps["onSuccess"], path: string) {
  if (onSuccess) {
    onSuccess(path);
    return;
  }

  window.location.assign(path);
}
