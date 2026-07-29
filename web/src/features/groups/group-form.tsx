"use client";

import { type FormEvent, useState } from "react";

import type { Group, GroupDetail } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { appFetch, groupErrorMessage } from "./group-client-api";
import {
  createGroupSchema,
  renameGroupSchema,
  type CreateGroupValues,
  type RenameGroupValues,
} from "./group-schema";
import styles from "./group-management.module.css";

type GroupFormMode = "create" | "rename";

interface GroupFormProps {
  group?: GroupDetail;
  mode: GroupFormMode;
  onSuccess?: (path: string) => void;
}

export function GroupForm({ group, mode, onSuccess }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? "");
  const [groupType, setGroupType] = useState<CreateGroupValues["groupType"]>(
    group?.group_type === "group" ? "group" : "couple",
  );
  const [defaultCurrency, setDefaultCurrency] = useState(
    group?.default_currency ?? "TWD",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isCreate = mode === "create";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      if (isCreate) {
        const values = createGroupSchema.parse({
          defaultCurrency,
          groupType,
          name,
        });
        const result = await appFetch<{ data: Group }>("/api/app/groups", {
          body: JSON.stringify({
            default_currency: values.defaultCurrency,
            group_type: values.groupType,
            name: values.name,
          }),
          method: "POST",
        });

        navigate(onSuccess, `/app/groups/${result.data.id}`);
      } else if (group) {
        const values: RenameGroupValues = renameGroupSchema.parse({ name });

        await appFetch<{ data: GroupDetail }>(`/api/app/groups/${group.id}`, {
          body: JSON.stringify({ name: values.name }),
          method: "PATCH",
        });
        onSuccess?.(`/app/groups/${group.id}`);
      }
    } catch (caught) {
      setError(groupErrorMessage(caught));
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
      <PixelField
        label="Group name"
        name="name"
        onChange={(event) => setName(event.target.value)}
        required
        value={name}
      />
      {isCreate ? (
        <>
          <fieldset className={styles.radioGroup}>
            <legend>Group type</legend>
            <label>
              <input
                checked={groupType === "couple"}
                name="groupType"
                onChange={() => setGroupType("couple")}
                type="radio"
              />
              Couple
            </label>
            <label>
              <input
                checked={groupType === "group"}
                name="groupType"
                onChange={() => setGroupType("group")}
                type="radio"
              />
              Group
            </label>
          </fieldset>
          <PixelField
            label="Currency"
            maxLength={3}
            name="defaultCurrency"
            onChange={(event) => setDefaultCurrency(event.target.value)}
            required
            value={defaultCurrency}
          />
        </>
      ) : null}
      <PixelButton disabled={pending} type="submit">
        {isCreate ? "Create group" : "Save name"}
      </PixelButton>
    </form>
  );
}

function navigate(onSuccess: GroupFormProps["onSuccess"], path: string) {
  if (onSuccess) {
    onSuccess(path);
    return;
  }

  window.location.assign(path);
}
