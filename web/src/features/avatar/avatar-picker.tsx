"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useRef, useState } from "react";

import { appFetch } from "@/shared/api/app-fetch";
import { avatarClasses, avatarPortraitSrc, isAvatarClass, type AvatarClass } from "@/shared/avatar/avatar-classes";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelDialog } from "@/shared/ui/pixel-dialog";
import { NotebookOfflineNotice } from "@/shared/ui/pixel-notebook";
import { PixelNotice } from "@/shared/ui/pixel-notice";

import { useOnline } from "../personal-expenses/use-online";
import styles from "./avatar-picker.module.css";

type AvatarPickerProps = {
  /** "first": Home's one-time prompt with a "later" button. "change": Settings, with "cancel". */
  mode: "first" | "change";
  initialClass: AvatarClass | null;
  /** Closed without saving anything (X, Escape, "cancel"). */
  onClose: () => void;
  onChosen: (avatarClass: AvatarClass) => void;
  /** Only for mode "first": the server recorded the "later" choice. */
  onDismissed?: () => void;
};

type MeResponse = { data: { avatar_class?: unknown } };

export function AvatarPicker({ mode, initialClass, onClose, onChosen, onDismissed }: AvatarPickerProps) {
  const t = useTranslations("avatar");
  const online = useOnline();
  const [selected, setSelected] = useState<AvatarClass | null>(initialClass);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const blocked = pending || !online;
  // Roving tabindex: the selected option, or the first one before anything is chosen.
  const tabStop = selected ?? avatarClasses[0];

  async function save(body: Record<string, unknown>) {
    setPending(true);
    setFailed(false);
    try {
      return await appFetch<MeResponse>("/api/app/me", { method: "PATCH", body: JSON.stringify(body) });
    } catch {
      setFailed(true);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    if (blocked || !selected) return;
    const result = await save({ avatar_class: selected });
    if (result) onChosen(isAvatarClass(result.data.avatar_class) ? result.data.avatar_class : selected);
  }

  async function later() {
    if (blocked) return;
    if (await save({ avatar_prompt_dismissed: true })) onDismissed?.();
  }

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const index = avatarClasses.indexOf(tabStop);
    const next = {
      ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1,
      Home: 0, End: avatarClasses.length - 1,
    }[event.key];
    if (next === undefined || blocked) return;
    event.preventDefault();
    const target = (next + avatarClasses.length) % avatarClasses.length;
    setSelected(avatarClasses[target]);
    options.current[target]?.focus();
  }

  return (
    <PixelDialog
      className={styles.dialog}
      closeDisabled={pending}
      description={t("pickerIntro")}
      onClose={onClose}
      open
      title={t("pickerTitle")}
    >
      {failed ? <PixelNotice variant="error">{t("saveFailed")}</PixelNotice> : null}
      {!online ? <NotebookOfflineNotice /> : null}
      <div aria-label={t("pickerTitle")} className={styles.grid} onKeyDown={move} role="radiogroup">
        {avatarClasses.map((avatarClass, index) => (
          <button
            aria-checked={selected === avatarClass}
            aria-disabled={blocked || undefined}
            className={styles.option}
            data-avatar-option={avatarClass}
            key={avatarClass}
            onClick={() => { if (!blocked) setSelected(avatarClass); }}
            ref={(element) => { options.current[index] = element; }}
            role="radio"
            tabIndex={avatarClass === tabStop ? 0 : -1}
            type="button"
          >
            <Image alt="" height={96} src={avatarPortraitSrc(avatarClass)} unoptimized width={96} />
            <span>{t(`class.${avatarClass}`)}</span>
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <PixelButton disabled={blocked || !selected} onClick={confirm} type="button">
          {t("confirm")}
        </PixelButton>
        {mode === "first" ? (
          <PixelButton disabled={blocked} emphasis="secondary" onClick={later} type="button">
            {t("later")}
          </PixelButton>
        ) : (
          <PixelButton disabled={pending} emphasis="secondary" onClick={onClose} type="button">
            {t("cancel")}
          </PixelButton>
        )}
      </div>
    </PixelDialog>
  );
}
