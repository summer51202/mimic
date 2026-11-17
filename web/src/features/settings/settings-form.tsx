"use client";

import { useTranslations, type Messages } from "next-intl";
import { type FormEvent, useRef, useState } from "react";

import { AppClientError, appFetch } from "@/shared/api/app-fetch";
import { LanguageSettings } from "@/shared/i18n/language-switch";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { displayNameSchema, type SettingsProfile } from "./settings-schema";
import styles from "./settings.module.css";

interface SettingsFormProps {
  profile: SettingsProfile;
  onLogout?: (path: string) => void;
}

type Notice = {
  message: keyof Messages["settings"];
  variant: "error" | "success";
};

export function SettingsForm({ profile, onLogout }: SettingsFormProps) {
  const t = useTranslations("settings");
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [displayNameInvalid, setDisplayNameInvalid] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const mimicIdRef = useRef<HTMLElement>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || loggingOut) {
      return;
    }

    const parsed = displayNameSchema.safeParse({ displayName });

    if (!parsed.success) {
      setDisplayNameInvalid(true);
      setNotice(null);
      displayNameRef.current?.focus();
      return;
    }

    setDisplayNameInvalid(false);
    setNotice(null);
    setSaving(true);

    try {
      const result = await appFetch<{ data: SettingsProfile }>("/api/app/me", {
        body: JSON.stringify({ display_name: parsed.data.displayName }),
        method: "PATCH",
      });
      setDisplayName(result.data.display_name);
      setNotice({ message: "saved", variant: "success" });
    } catch (error) {
      setNotice({ message: profileErrorMessage(error), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function copyMimicId() {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(profile.mimic_id);
        setNotice({ message: "copied", variant: "success" });
        return;
      } catch {
        selectMimicId();
        return;
      }
    }

    selectMimicId();
  }

  function selectMimicId() {
    const identity = mimicIdRef.current;
    const selection = window.getSelection();

    if (identity && selection) {
      const range = document.createRange();
      range.selectNodeContents(identity);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    identity?.focus();
    setNotice({
      message: "selected",
      variant: "success",
    });
  }

  async function logout() {
    if (saving || loggingOut) {
      return;
    }

    setNotice(null);
    setLoggingOut(true);

    try {
      await appFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
      navigate(onLogout, "/login");
    } catch {
      setNotice({
        message: "logoutError",
        variant: "error",
      });
      setLoggingOut(false);
    }
  }

  return (
    <div className={styles.settingsContent}>
      {notice ? (
        <PixelNotice variant={notice.variant}>{t(notice.message)}</PixelNotice>
      ) : null}

      <section className={styles.identity} aria-labelledby="account-identity-title">
        <div>
          <p className={styles.kicker}>{t("identity")}</p>
          <h2 id="account-identity-title">{t("idTitle")}</h2>
          <p>{t("idHelp")}</p>
        </div>
        <div className={styles.mimicIdRow}>
          <code ref={mimicIdRef} className={styles.mimicId} tabIndex={-1}>
            {profile.mimic_id}
          </code>
          <PixelButton emphasis="secondary" onClick={copyMimicId} type="button">
            {t("copyId")}
          </PixelButton>
        </div>
      </section>

      <form className={styles.form} noValidate onSubmit={saveProfile}>
        <PixelField
          label={t("email")}
          name="email"
          readOnly
          value={profile.email}
        />
        <PixelField
          ref={displayNameRef}
          error={displayNameInvalid ? t("invalidDisplayName") : undefined}
          label={t("displayName")}
          maxLength={100}
          name="displayName"
          onChange={(event) => {
            setDisplayName(event.target.value);
            setDisplayNameInvalid(false);
          }}
          required
          value={displayName}
        />
        <PixelButton disabled={saving || loggingOut} type="submit">
          {t(saving ? "saving" : "save")}
        </PixelButton>
      </form>

      <LanguageSettings className={styles.language} />

      <section className={styles.session} aria-labelledby="session-title">
        <div>
          <h2 id="session-title">{t("session")}</h2>
          <p>{t("signoutInfo")}</p>
        </div>
        <PixelButton
          disabled={saving || loggingOut}
          emphasis="danger"
          onClick={logout}
          type="button"
        >
          {t(loggingOut ? "signingOut" : "signout")}
        </PixelButton>
      </section>
    </div>
  );
}

function profileErrorMessage(error: unknown): keyof Messages["settings"] {
  if (error instanceof AppClientError && error.status === 401) {
    return "expired";
  }

  return "service";
}

function navigate(onLogout: SettingsFormProps["onLogout"], path: string) {
  if (onLogout) {
    onLogout(path);
    return;
  }

  window.location.assign(path);
}
