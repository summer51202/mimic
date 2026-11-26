"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { AvatarClass } from "@/shared/avatar/avatar-classes";
import { PixelButton } from "@/shared/ui/pixel-button";

import { AvatarPicker } from "../avatar/avatar-picker";
import { AvatarPortrait } from "../avatar/avatar-portrait";
import styles from "./settings.module.css";

/** Phase Avatar: the current class and the only place to change it. */
export function SettingsAvatar({ initialClass }: { initialClass: AvatarClass | null }) {
  const t = useTranslations("avatar");
  const [avatarClass, setAvatarClass] = useState(initialClass);
  const [picking, setPicking] = useState(false);

  return (
    <section className={styles.identity} aria-labelledby="account-avatar-title">
      <h2 id="account-avatar-title">{t("settingsHeading")}</h2>
      <div className={styles.avatarRow}>
        <AvatarPortrait avatarClass={avatarClass} size={96} />
        <p className={styles.avatarName} data-avatar-name>
          {avatarClass ? t(`class.${avatarClass}`) : t("none")}
        </p>
        <PixelButton emphasis="secondary" onClick={() => setPicking(true)} type="button">
          {avatarClass ? t("change") : t("choose")}
        </PixelButton>
      </div>
      {picking ? (
        <AvatarPicker
          initialClass={avatarClass}
          mode="change"
          onChosen={(chosen) => { setAvatarClass(chosen); setPicking(false); }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </section>
  );
}
