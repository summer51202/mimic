"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { appFetch } from "@/shared/api/app-fetch";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelDialog } from "@/shared/ui/pixel-dialog";
import { PixelField } from "@/shared/ui/pixel-field";

import { archiveGroupErrorMessage } from "./group-client-api";
import styles from "./group-management.module.css";

interface ArchiveEmptyGroupDialogProps {
  groupId: string;
  groupName: string;
  onClose?: () => void;
  onSuccess?: (path: string) => void;
  open: boolean;
}

interface ArchiveDialogState {
  confirmation: string;
  context: string;
  error: string | null;
  pending: boolean;
}

export function ArchiveEmptyGroupDialog({
  groupId,
  groupName,
  onClose = () => {},
  onSuccess,
  open,
}: ArchiveEmptyGroupDialogProps) {
  const context = `${groupId}\u001f${groupName}\u001f${open ? "open" : "closed"}`;
  const [state, setState] = useState<ArchiveDialogState>(() =>
    emptyState(context),
  );
  const latestContextRef = useRef(context);
  const mountedRef = useRef(false);
  const operationRef = useRef(0);
  latestContextRef.current = context;

  if (state.context !== context) {
    setState(emptyState(context));
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    operationRef.current += 1;
  }, [groupId, groupName, open]);

  const { confirmation, error, pending } = state;
  const confirmed = confirmation === groupName;

  function closeDialog() {
    operationRef.current += 1;
    setState(emptyState(context));
    onClose();
  }

  async function archiveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!open || !confirmed || pending) {
      return;
    }

    const operation = operationRef.current + 1;
    const requestContext = context;
    operationRef.current = operation;
    setState((current) => ({ ...current, error: null, pending: true }));

    try {
      await appFetch<{ data: { group_id: string; status: "archived" } }>(
        `/api/app/groups/${groupId}/archive`,
        { method: "POST" },
      );

      if (
        !isCurrentOperation({
          latestContext: latestContextRef.current,
          mounted: mountedRef.current,
          operation,
          requestContext,
          requestOpen: open,
          token: operationRef.current,
        })
      ) {
        return;
      }

      navigate(onSuccess, "/app/groups");
    } catch (caught) {
      if (
        !isCurrentOperation({
          latestContext: latestContextRef.current,
          mounted: mountedRef.current,
          operation,
          requestContext,
          requestOpen: open,
          token: operationRef.current,
        })
      ) {
        return;
      }

      setState((current) => ({
        ...current,
        error: archiveGroupErrorMessage(caught),
        pending: false,
      }));
    }
  }

  return (
    <PixelDialog
      closeDisabled={pending}
      description="Delete from view is available only for groups where bookkeeping has not started."
      onClose={closeDialog}
      open={open}
      title={`Delete ${groupName}`}
    >
      <p className={styles.archiveExplanation}>
        The group and its empty funds will be removed from view and archived.
        Historical membership, invites, and audit records are retained. There
        is currently no self-service restore.
      </p>
      <form className={styles.archiveForm} onSubmit={archiveGroup}>
        <PixelField
          autoComplete="off"
          error={error}
          label="Type the group name to confirm"
          onChange={(event) =>
            setState((current) => ({
              ...current,
              confirmation: event.target.value,
            }))
          }
          type="text"
          value={confirmation}
        />
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

function isCurrentOperation({
  latestContext,
  mounted,
  operation,
  requestContext,
  requestOpen,
  token,
}: {
  latestContext: string;
  mounted: boolean;
  operation: number;
  requestContext: string;
  requestOpen: boolean;
  token: number;
}) {
  return (
    mounted &&
    requestOpen &&
    token === operation &&
    latestContext === requestContext
  );
}

function emptyState(context: string): ArchiveDialogState {
  return {
    confirmation: "",
    context,
    error: null,
    pending: false,
  };
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
