"use client";

import { useLocale, useTranslations, type Messages } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState } from "react";
import { ZodError } from "zod";

import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { LanguageSwitch } from "@/shared/i18n/language-switch";
import { pixelUiFiles, pixelUiRoles } from "@/shared/brand/pixel-ui-assets";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelPanel } from "@/shared/ui/pixel-panel";
import { safeReturnTo } from "@/shared/navigation/safe-return-to";

import {
  type LoginFormValues,
  type RegisterFormValues,
  loginSchema,
  registerSchema,
} from "./auth-schema";
import styles from "./auth-form.module.css";

type AuthMode = "login" | "register";

type FieldErrors = Partial<Record<"displayName" | "email" | "password", ValidationKey>>;

type AuthFormProps = {
  mode: AuthMode;
  returnTo?: string | null;
};

type CsrfResponse = {
  token?: unknown;
};

type AuthErrorBody = {
  error?: unknown;
};

const fallbackPath = "/app";

const authErrorKeys = ["CSRF_INVALID", "EMAIL_ALREADY_REGISTERED", "INVALID_CREDENTIALS", "INVALID_JSON",
  "UPSTREAM_UNAVAILABLE", "VALIDATION_ERROR"] as const;
type AuthErrorKey = keyof Messages["auth"]["errors"];
type ValidationKey = keyof Messages["auth"]["validation"];

export function AuthForm({ mode, returnTo }: AuthFormProps) {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();
  const formId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthErrorKey | null>(null);
  const [hasAuthError, setHasAuthError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formErrorId = `${formId}-form-error`;
  const emailErrorId = `${formId}-email-error`;
  const passwordErrorId = `${formId}-password-error`;
  const displayNameErrorId = `${formId}-display-name-error`;
  const switchHref = buildSwitchHref(mode === "login" ? "/register" : "/login", returnTo);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const form = event.currentTarget;
    const rawValues = readFormValues(form, mode);
    const parsed = parseValues(rawValues, mode);

    setFormError(null);
    setHasAuthError(false);

    if (!parsed.success) {
      setFieldErrors(parsed.errors);
      return;
    }

    setFieldErrors({});
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`/api/auth/${mode}`, {
        body: JSON.stringify(parsed.values),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new AuthSubmissionError(await readAuthErrorCode(response));
      }

      const destination = validatedReturnTo(returnTo);
      const preference = document.cookie.split(";").map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));
      const persistedLocale = resolveLocale(preference?.slice(LOCALE_COOKIE.length + 1));
      if (persistedLocale !== locale) {
        window.location.replace(destination);
      } else {
        router.replace(destination);
      }
    } catch (error) {
      setHasAuthError(true);
      clearPassword();
      setFormError(keyForError(error));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function clearPassword() {
    if (passwordRef.current) {
      passwordRef.current.value = "";
    }
  }

  return (
    <section className={styles.shell} aria-labelledby={`${formId}-title`}>
      <PixelPanel className={styles.panel}>
        <div className={styles.character}>
          <Image
            className={`${styles.characterImage} pixel-art`}
            src={
              hasAuthError
                ? pixelUiRoles.blockingError
                : pixelUiFiles.characters.idle
            }
            alt={
              t(hasAuthError ? "auth.altError" : "auth.alt")
            }
            width={512}
            height={512}
            priority
            unoptimized
          />
        </div>

        <div className={styles.content}>
          <p className={styles.kicker}>{t("brand.speaker")}</p>
          <h1 id={`${formId}-title`} className={styles.title}>
            {t(`auth.${mode}.title`)}
          </h1>
          <p className={styles.description} id={`${formId}-description`}>
            {t(`auth.${mode}.description`)}
          </p>

          {formError ? (
            <div
              className={styles.formError}
              id={formErrorId}
              role="alert"
              aria-live="polite"
            >
              {t(`auth.errors.${formError}`)}
            </div>
          ) : null}

          <form
            className={styles.form}
            aria-describedby={`${formId}-description${
              formError ? ` ${formErrorId}` : ""
            }`}
            noValidate
            onSubmit={handleSubmit}
          >
            {mode === "register" ? (
              <Field
                autoComplete="name"
                error={fieldErrors.displayName ? t(`auth.validation.${fieldErrors.displayName}`) : undefined}
                errorId={displayNameErrorId}
                id={`${formId}-display-name`}
                label={t("auth.displayName")}
                name="displayName"
                type="text"
              />
            ) : null}

            <Field
              autoComplete="email"
              error={fieldErrors.email ? t(`auth.validation.${fieldErrors.email}`) : undefined}
              errorId={emailErrorId}
              id={`${formId}-email`}
              label={t("auth.email")}
              name="email"
              type="email"
            />

            <Field
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              description={mode === "register" ? t("auth.passwordHint") : undefined}
              error={fieldErrors.password ? t(`auth.validation.${fieldErrors.password}`) : undefined}
              errorId={passwordErrorId}
              id={`${formId}-password`}
              inputRef={passwordRef}
              label={t("auth.password")}
              name="password"
              type="password"
            />

            <PixelButton
              className={styles.submit}
              disabled={isSubmitting}
              type="submit"
            >
              {t(`auth.${mode}.${isSubmitting ? "submittingLabel" : "submitLabel"}`)}
            </PixelButton>
          </form>

          <p className={styles.switchPrompt}>
            {t(`auth.${mode}.switchPrompt`)}{" "}
            <Link href={switchHref}>{t(`auth.${mode}.switchLabel`)}</Link>{" "}
            <LanguageSwitch className={styles.languageSwitch} />
          </p>
        </div>
      </PixelPanel>
    </section>
  );
}

function Field({
  description,
  error,
  errorId,
  id,
  inputRef,
  label,
  name,
  type,
  autoComplete,
}: {
  autoComplete: string;
  description?: string;
  error?: string;
  errorId: string;
  id: string;
  inputRef?: React.Ref<HTMLInputElement>;
  label: string;
  name: string;
  type: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy = [descriptionId, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {description ? (
        <p className={styles.fieldDescription} id={descriptionId}>
          {description}
        </p>
      ) : null}
      <input
        ref={inputRef}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? "true" : "false"}
        autoComplete={autoComplete}
        className={styles.input}
        id={id}
        name={name}
        type={type}
      />
      {error ? (
        <p className={styles.fieldError} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function readFormValues(form: HTMLFormElement, mode: AuthMode) {
  const formData = new FormData(form);
  const values = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  if (mode === "login") {
    return values;
  }

  return {
    ...values,
    displayName: String(formData.get("displayName") ?? ""),
  };
}

function parseValues(
  rawValues: ReturnType<typeof readFormValues>,
  mode: AuthMode,
):
  | { success: true; values: LoginFormValues | RegisterFormValues }
  | { success: false; errors: FieldErrors } {
  try {
    return {
      success: true,
      values:
        mode === "login"
          ? loginSchema.parse(rawValues)
          : registerSchema.parse(rawValues),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: fieldErrorsFromZod(error) };
    }

    throw error;
  }
}

function fieldErrorsFromZod(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "displayName" || field === "email" || field === "password") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message as ValidationKey;
    }
  }

  return fieldErrors;
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new AuthSubmissionError("CSRF_INVALID");
  }

  let body: CsrfResponse;

  try {
    body = (await response.json()) as CsrfResponse;
  } catch {
    throw new AuthSubmissionError("CSRF_INVALID");
  }

  if (typeof body.token !== "string" || body.token.length === 0) {
    throw new AuthSubmissionError("CSRF_INVALID");
  }

  return body.token;
}

async function readAuthErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as AuthErrorBody;
    const error = body.error;

    if (typeof error === "string") {
      return error;
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
    ) {
      return error.code;
    }
  } catch {
    return "UPSTREAM_UNAVAILABLE";
  }

  return "UPSTREAM_UNAVAILABLE";
}

function keyForError(error: unknown): AuthErrorKey {
  if (error instanceof AuthSubmissionError) {
    return authErrorKeys.find((key) => key === error.code) ?? "UPSTREAM_UNAVAILABLE";
  }

  return "network";
}

function validatedReturnTo(returnTo: string | null | undefined): string {
  return safeReturnTo(returnTo, fallbackPath);
}

function buildSwitchHref(baseHref: string, returnTo: string | null | undefined) {
  const validated = validatedReturnTo(returnTo);

  if (validated === fallbackPath && returnTo !== fallbackPath) {
    return baseHref;
  }

  return `${baseHref}?returnTo=${encodeURIComponent(validated)}`;
}

class AuthSubmissionError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
