"use client";

import { useState } from "react";

import { appFetch } from "@/shared/api/app-fetch";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelDialog } from "@/shared/ui/pixel-dialog";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { groupErrorMessage } from "./group-client-api";

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
  const [error, setError] = useState<string | null>(null);
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
      setError(groupErrorMessage(caught));
      setPending(false);
    }
  }

  return (
    <PixelDialog
      description="NestJS will reject departure until reconciliation rules are satisfied."
      onClose={onClose}
      open={open}
      title={`Leave ${groupName}`}
    >
      {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
      <p>
        Leaving keeps your historical records in place. Settle open balances
        first if Mimiku blocks the exit.
      </p>
      <PixelButton disabled={pending} emphasis="danger" onClick={leaveGroup}>
        Leave group
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
