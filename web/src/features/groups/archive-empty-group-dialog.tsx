"use client";

import { type FormEvent, useState } from "react";

import { appFetch } from "@/shared/api/app-fetch";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelDialog } from "@/shared/ui/pixel-dialog";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { archiveGroupErrorMessage } from "./group-client-api";
import styles from "./group-management.module.css";

interface ArchiveEmptyGroupDialogProps {
  groupId: string;
  groupName: string;
  onClose?: () => void;
  onSuccess?: (path: string) => void;
  open: boolean;
}

export function ArchiveEmptyGroupDialog({
  groupId,
  groupName,
  onClose = () => {},
  onSuccess,
  open,
}: ArchiveEmptyGroupDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const confirmed = confirmation === groupName;

  if (!open) {
    return null;
  }

  async function archiveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!confirmed || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await appFetch<{ data: { group_id: string; status: "archived" } }>(
        `/api/app/groups/${groupId}/archive`,
        { method: "POST" },
      );
      navigate(onSuccess, "/app/groups");
    } catch (caught) {
      setError(archiveGroupErrorMessage(caught));
      setPending(false);
    }
  }

  return (
    <PixelDialog
      closeDisabled={pending}
      description="Delete from view is available only for groups where bookkeeping has not started."
      onClose={onClose}
      open={open}
      title={`Delete ${groupName}`}
    >
      <p className={styles.archiveExplanation}>
        The group and its empty funds will be removed from view and archived.
        Historical membership, invites, and audit records are retained. There
        is currently no self-service restore.
      </p>
      <form className={styles.archiveForm} onSubmit={archiveGroup}>
        <label htmlFor="archive-group-confirmation">
          Type the group name to confirm
        </label>
        <input
          autoComplete="off"
          id="archive-group-confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          type="text"
          value={confirmation}
        />
        {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
        <PixelButton
          aria-label={
            pending
              ? "Deleting group..."
              : "Delete empty group permanently from view"
          }
          disabled={!confirmed || pending}
          emphasis="danger"
          type="submit"
        >
          {pending ? "Deleting group..." : "Delete empty group"}
        </PixelButton>
      </form>
    </PixelDialog>
  );
}

function navigate(
  onSuccess: ArchiveEmptyGroupDialogProps["onSuccess"],
  path: string,
) {
  if (onSuccess) {
    onSuccess(path);
    return;
  }

  window.location.assign(path);
}
