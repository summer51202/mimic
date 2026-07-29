"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useMemo, useRef, useState } from "react";
import { ZodError } from "zod";

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

type FieldErrors = Partial<Record<"displayName" | "email" | "password", string>>;

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

const authErrorMessages: Record<string, string> = {
  CSRF_INVALID:
    "驗證已過期，請重新送出一次。咪咪庫會幫你重新確認安全狀態。",
  EMAIL_ALREADY_REGISTERED:
    "這個電子郵件已經註冊，請改用登入。咪咪庫幫你守住原本填好的資料。",
  INVALID_CREDENTIALS:
    "請重新檢查電子郵件和密碼。咪咪庫會在這裡陪你再試一次。",
  INVALID_JSON:
    "資料格式暫時無法送出，請重新整理後再試。咪咪庫先幫你停一下。",
  UPSTREAM_UNAVAILABLE:
    "服務暫時沒有回應，請稍後再送出一次。咪咪庫先幫你保留表單內容。",
  VALIDATION_ERROR:
    "資料有欄位需要調整，請檢查後再送出。咪咪庫正在旁邊看著。",
};

export function AuthForm({ mode, returnTo }: AuthFormProps) {
  const router = useRouter();
  const formId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [hasAuthError, setHasAuthError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = useMemo(() => authCopy[mode], [mode]);
  const formErrorId = `${formId}-form-error`;
  const emailErrorId = `${formId}-email-error`;
  const passwordErrorId = `${formId}-password-error`;
  const displayNameErrorId = `${formId}-display-name-error`;
  const switchHref = buildSwitchHref(copy.switchHref, returnTo);

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

      router.replace(validatedReturnTo(returnTo));
    } catch (error) {
      setHasAuthError(true);
      clearPassword();
      setFormError(messageForError(error));
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
                ? "/brand/mimiku-serious.png"
                : "/brand/mimiku-idle.png"
            }
            alt={
              hasAuthError
                ? "咪咪庫正在認真確認登入狀態"
                : "咪咪庫在入口等你"
            }
            width={512}
            height={512}
            priority
          />
        </div>

        <div className={styles.content}>
          <p className={styles.kicker}>咪咪庫 / Mimiku</p>
          <h1 id={`${formId}-title`} className={styles.title}>
            {copy.title}
          </h1>
          <p className={styles.description} id={`${formId}-description`}>
            {copy.description}
          </p>

          {formError ? (
            <div
              className={styles.formError}
              id={formErrorId}
              role="alert"
              aria-live="polite"
            >
              {formError}
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
                error={fieldErrors.displayName}
                errorId={displayNameErrorId}
                id={`${formId}-display-name`}
                label="顯示名稱"
                name="displayName"
                type="text"
              />
            ) : null}

            <Field
              autoComplete="email"
              error={fieldErrors.email}
              errorId={emailErrorId}
              id={`${formId}-email`}
              label="電子郵件"
              name="email"
              type="email"
            />

            <Field
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              description={mode === "register" ? "至少 6 個字元。" : undefined}
              error={fieldErrors.password}
              errorId={passwordErrorId}
              id={`${formId}-password`}
              inputRef={passwordRef}
              label="密碼"
              name="password"
              type="password"
            />

            <PixelButton
              className={styles.submit}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? copy.submittingLabel : copy.submitLabel}
            </PixelButton>
          </form>

          <p className={styles.switchPrompt}>
            {copy.switchPrompt}{" "}
            <Link href={switchHref}>{copy.switchLabel}</Link>
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
      fieldErrors[field] = issue.message;
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

function messageForError(error: unknown): string {
  if (error instanceof AuthSubmissionError) {
    return authErrorMessages[error.code] ?? authErrorMessages.UPSTREAM_UNAVAILABLE;
  }

  return "連線暫時失敗，請稍後再送出一次。咪咪庫先把密碼欄清空，其他資料已保留。";
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

const authCopy = {
  login: {
    description: "登入後繼續整理你的 mimic 共享紀錄。",
    submitLabel: "登入 mimic",
    submittingLabel: "登入中...",
    switchHref: "/register",
    switchLabel: "建立帳號",
    switchPrompt: "還沒有帳號嗎？",
    title: "登入 mimic",
  },
  register: {
    description: "建立帳號後，咪咪庫會幫你接住共享紀錄的第一步。",
    submitLabel: "建立帳號",
    submittingLabel: "建立中...",
    switchHref: "/login",
    switchLabel: "前往登入",
    switchPrompt: "已經有帳號了？",
    title: "建立 mimic 帳號",
  },
} as const;
