"use client";

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { ZodError } from "zod";

import { appFetch } from "@/features/groups/group-client-api";
import { pixelUiAssets } from "@/shared/brand/pixel-ui-assets";
import type { InviteCreated } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelFrame } from "@/shared/ui/pixel-frame";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { inviteErrorMessage } from "./invite-errors";
import { InviteSharePanel } from "./invite-share-panel";
import { inviteCreateSchema } from "./invite-schema";
import styles from "./invitation-flow.module.css";

type InviteCreatePanelProps = {
  groupId: string;
  onCreated?: (invite: InviteCreated) => void;
};

export function InviteCreatePanel({ groupId, onCreated }: InviteCreatePanelProps) {
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState<InviteCreated | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);
    setFieldError(null);
    setPending(true);

    try {
      const values = inviteCreateSchema.parse({ invitedEmail: email });
      const payload =
        values.invitedEmail === undefined
          ? {}
          : { invited_email: values.invitedEmail };
      const result = await appFetch<{ data: InviteCreated }>(
        `/api/app/groups/${groupId}/invites`,
        {
          body: JSON.stringify(payload),
          method: "POST",
        },
      );

      setInvite(result.data);
      onCreated?.(result.data);
    } catch (caught) {
      if (caught instanceof ZodError) {
        setFieldError("Enter a valid email or leave it blank.");
      } else {
        setError(inviteErrorMessage(caught));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.panel}>
      <PixelFrame className={styles.panel}>
        <div className={styles.hero}>
          <div>
            <p className={styles.meta}>Party invite</p>
            <h2>Bring a partner into this quest.</h2>
            <p className={styles.meta}>
              Generate a private invite. Email is optional, but a locked invite
              can only be accepted by that account.
            </p>
          </div>
          <Image
            alt="Mimiku carrying a fresh invite"
            className="pixel-art"
            height={512}
            src={pixelUiAssets.mimiku.invite}
            width={512}
          />
        </div>
        {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
        <form className={styles.panel} onSubmit={handleSubmit}>
          <PixelField
            error={fieldError}
            label="Invite email"
            name="invitedEmail"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@example.com"
            type="email"
            value={email}
          />
          <PixelButton disabled={pending} type="submit">
            {pending ? "Generating..." : "Generate invite"}
          </PixelButton>
        </form>
      </PixelFrame>
      {invite ? <InviteSharePanel invite={invite} /> : null}
    </div>
  );
}
