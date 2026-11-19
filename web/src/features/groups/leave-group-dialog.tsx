"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { appFetch } from "@/shared/api/app-fetch";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelDialog } from "@/shared/ui/pixel-dialog";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { groupErrorKey } from "./group-client-api";

interface LeaveGroupDialogProps {
  groupId: string;
  groupName: string;
  onClose?: () => void;
  onSuccess?: (path: string) => void;
  open: boolean;
}

export function LeaveGroupDialog({
  groupId,
  groupName,
  onClose = () => {},
  onSuccess,
  open,
}: LeaveGroupDialogProps) {
  const t = useTranslations("groups");
  const translate = useTranslations();
  const [error, setError] = useState<ReturnType<typeof groupErrorKey> | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) {
    return null;
  }

  async function leaveGroup() {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await appFetch<void>(`/api/app/groups/${groupId}/leave`, {
        method: "POST",
      });
      navigate(onSuccess, "/app");
    } catch (caught) {
      setError(groupErrorKey(caught));
      setPending(false);
    }
  }

  return (
    <PixelDialog
      description={t("leaveDescription")}
      onClose={onClose}
      open={open}
      title={t("leaveTitle", { name: groupName })}
    >
      {error ? <PixelNotice variant="error">{translate(error)}</PixelNotice> : null}
      <p>
        {t("leaveHistory")}
      </p>
      <PixelButton disabled={pending} emphasis="danger" onClick={leaveGroup}>
        {t("leave")}
      </PixelButton>
    </PixelDialog>
  );
}

function navigate(onSuccess: LeaveGroupDialogProps["onSuccess"], path: string) {
  if (onSuccess) {
    onSuccess(path);
    return;
  }

  window.location.assign(path);
}
