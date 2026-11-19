"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { type FormEvent, useState } from "react";
import { ZodError } from "zod";

import { appFetch } from "@/shared/api/app-fetch";
import { pixelUiRoles } from "@/shared/brand/pixel-ui-assets";
import type { InviteCreated } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelFrame } from "@/shared/ui/pixel-frame";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { inviteErrorKey, type InviteErrorCode } from "./invite-errors";
import { InviteSharePanel } from "./invite-share-panel";
import { inviteCreateSchema } from "./invite-schema";
import styles from "./invitation-flow.module.css";

type InviteCreatePanelProps = {
  groupId: string;
  onCreated?: (invite: InviteCreated) => void;
};

export function InviteCreatePanel({ groupId, onCreated }: InviteCreatePanelProps) {
  const t = useTranslations("invite.app");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState<InviteCreated | null>(null);
  const inviteErrors = useTranslations("invite.errors");
  const [error, setError] = useState<InviteErrorCode | null>(null);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);
    setInvalidEmail(false);
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
        setInvalidEmail(true);
      } else {
        setError(inviteErrorKey(caught));
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
            <p className={styles.meta}>{t("createKicker")}</p>
            <h2>{t("createTitle")}</h2>
            <p className={styles.meta}>
              {t("createIntro")}
            </p>
          </div>
          <Image
            alt={t("alt")}
            className="pixel-art"
            height={512}
            priority
            src={pixelUiRoles.invitation}
            unoptimized
            width={512}
          />
        </div>
        {error ? <PixelNotice variant="error">{inviteErrors(error)}</PixelNotice> : null}
        <form className={styles.panel} onSubmit={handleSubmit}>
          <PixelField
            error={invalidEmail ? t("invalidEmail") : null}
            label={t("email")}
            name="invitedEmail"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            type="email"
            value={email}
          />
          <PixelButton disabled={pending} type="submit">
            {t(pending ? "generating" : "generate")}
          </PixelButton>
        </form>
      </PixelFrame>
      {invite ? <InviteSharePanel invite={invite} /> : null}
    </div>
  );
}
