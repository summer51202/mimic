"use client";

import { type FormEvent, useState } from "react";
import { ZodError } from "zod";

import { groupErrorMessage } from "@/features/groups/group-client-api";
import { appFetch } from "@/shared/api/app-fetch";
import type { Fund } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelFrame } from "@/shared/ui/pixel-frame";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { fundFormSchema } from "./fund-schema";
import styles from "./fund-summary.module.css";

type FundFormProps = {
  groupId: string;
  onSuccess?: (path: string) => void;
};

type FieldErrors = Partial<Record<"currency" | "name", string>>;

export function FundForm({ groupId, onSuccess }: FundFormProps) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("TWD");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      const values = fundFormSchema.parse({ currency, name });
      const result = await appFetch<{ data: Fund }>(
        `/api/app/groups/${groupId}/funds`,
        {
          body: JSON.stringify({
            currency: values.currency,
            name: values.name,
          }),
          method: "POST",
        },
      );

      navigate(onSuccess, `/app/funds/${result.data.id}`);
    } catch (caught) {
      if (caught instanceof ZodError) {
        setFieldErrors(fieldErrorsFromZod(caught));
      } else {
        setError(groupErrorMessage(caught));
      }
      setPending(false);
    }
  }

  return (
    <PixelFrame className={styles.panel}>
      {error ? <PixelNotice variant="error">{error}</PixelNotice> : null}
      <form className={styles.panel} onSubmit={handleSubmit}>
        <PixelField
          error={fieldErrors.name}
          label="Fund name"
          name="name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <PixelField
          error={fieldErrors.currency}
          label="Currency"
          maxLength={3}
          name="currency"
          onChange={(event) => setCurrency(event.target.value)}
          required
          value={currency}
        />
        <PixelButton disabled={pending} type="submit">
          {pending ? "Creating..." : "Create fund"}
        </PixelButton>
      </form>
    </PixelFrame>
  );
}

function fieldErrorsFromZod(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === "currency" || field === "name") && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

function navigate(onSuccess: FundFormProps["onSuccess"], path: string) {
  if (onSuccess) {
    onSuccess(path);
    return;
  }

  window.location.assign(path);
}
