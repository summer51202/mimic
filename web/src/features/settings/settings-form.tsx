"use client";

import { type FormEvent, useRef, useState } from "react";

import { AppClientError, appFetch } from "@/shared/api/app-fetch";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { displayNameSchema, type SettingsProfile } from "./settings-schema";
import styles from "./settings.module.css";

const invalidDisplayName =
  "Enter a display name between 1 and 100 characters.";

interface SettingsFormProps {
  profile: SettingsProfile;
  onLogout?: (path: string) => void;
}

type Notice = {
  message: string;
  variant: "error" | "success";
};

export function SettingsForm({ profile, onLogout }: SettingsFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
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
      setDisplayNameError(invalidDisplayName);
      setNotice(null);
      displayNameRef.current?.focus();
      return;
    }

    setDisplayNameError(null);
    setNotice(null);
    setSaving(true);

    try {
      const result = await appFetch<{ data: SettingsProfile }>("/api/app/me", {
        body: JSON.stringify({ display_name: parsed.data.displayName }),
        method: "PATCH",
      });
      setDisplayName(result.data.display_name);
      setNotice({ message: "Profile saved.", variant: "success" });
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
        setNotice({ message: "Mimic ID copied.", variant: "success" });
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
      message: "Mimic ID selected. Copy it from the page.",
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
        message: "Unable to sign out right now. Please retry.",
        variant: "error",
      });
      setLoggingOut(false);
    }
  }

  return (
    <div className={styles.settingsContent}>
      {notice ? (
        <PixelNotice variant={notice.variant}>{notice.message}</PixelNotice>
      ) : null}

      <section className={styles.identity} aria-labelledby="account-identity-title">
        <div>
          <p className={styles.kicker}>account identity</p>
          <h2 id="account-identity-title">Your Mimic ID</h2>
          <p>Use this stable ID to tell members apart when display names change.</p>
        </div>
        <div className={styles.mimicIdRow}>
          <code ref={mimicIdRef} className={styles.mimicId} tabIndex={-1}>
            {profile.mimic_id}
          </code>
          <PixelButton emphasis="secondary" onClick={copyMimicId} type="button">
            Copy ID
          </PixelButton>
        </div>
      </section>

      <form className={styles.form} noValidate onSubmit={saveProfile}>
        <PixelField
          label="Email"
          name="email"
          readOnly
          value={profile.email}
        />
        <PixelField
          ref={displayNameRef}
          error={displayNameError}
          label="Display name"
          maxLength={100}
          name="displayName"
          onChange={(event) => {
            setDisplayName(event.target.value);
            setDisplayNameError(null);
          }}
          required
          value={displayName}
        />
        <PixelButton disabled={saving || loggingOut} type="submit">
          {saving ? "Saving..." : "Save changes"}
        </PixelButton>
      </form>

      <section className={styles.session} aria-labelledby="session-title">
        <div>
          <h2 id="session-title">Session</h2>
          <p>Sign out of Mimic on this device.</p>
        </div>
        <PixelButton
          disabled={saving || loggingOut}
          emphasis="danger"
          onClick={logout}
          type="button"
        >
          {loggingOut ? "Signing out..." : "Sign out"}
        </PixelButton>
      </section>
    </div>
  );
}

function profileErrorMessage(error: unknown): string {
  if (error instanceof AppClientError && error.status === 401) {
    return "Your session expired. Sign in again, then retry.";
  }

  return "The service is temporarily unavailable. Mimiku kept your changes.";
}

function navigate(onLogout: SettingsFormProps["onLogout"], path: string) {
  if (onLogout) {
    onLogout(path);
    return;
  }

  window.location.assign(path);
}
