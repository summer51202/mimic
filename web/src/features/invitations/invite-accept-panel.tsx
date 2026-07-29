"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { appFetch } from "@/features/groups/group-client-api";
import { pixelUiAssets } from "@/shared/brand/pixel-ui-assets";
import type { InviteAcceptResult } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelFrame } from "@/shared/ui/pixel-frame";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { inviteErrorMessage, inviteMessages } from "./invite-errors";
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
  const validCode = parseInviteCode(code);
  const [error, setError] = useState<string | null>(
    validCode ? null : inviteMessages.INVITE_NOT_FOUND,
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
      setError(inviteErrorMessage(caught));
      setPending(false);
    }
  }

  return (
    <PixelFrame className={styles.panel}>
      <div className={styles.hero}>
        <div>
          <p className={styles.meta}>mimic invite</p>
          <h1 id={titleId}>Join this shared money quest.</h1>
          <p className={styles.meta}>
            Mimiku only checks the invite code here. Group details stay private
            until you accept.
          </p>
        </div>
        <Image
          alt={error ? "Mimiku guarding a closed invite" : "Mimiku holding an invite"}
          className="pixel-art"
          height={512}
          src={error ? pixelUiAssets.mimiku.serious : pixelUiAssets.mimiku.invite}
          width={512}
        />
      </div>
      {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
      {validCode ? <p className={styles.code}>{validCode}</p> : null}
      {!authenticated && validCode ? (
        <div className={styles.actions}>
          <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            Log in to accept
          </Link>
          <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
            Create account
          </Link>
        </div>
      ) : null}
      {authenticated && validCode ? (
        <PixelButton disabled={pending} onClick={acceptInvite} type="button">
          {pending ? "Accepting..." : "Accept invite"}
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
