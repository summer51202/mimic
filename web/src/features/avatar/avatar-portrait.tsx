import Image from "next/image";

import { avatarPortraitSrc, type AvatarClass } from "@/shared/avatar/avatar-classes";

import styles from "./avatar-slot.module.css";

/**
 * A class portrait, or the neutral dashed slot when no class is chosen. With `alt`
 * omitted the portrait is decorative; the empty slot is always `aria-hidden`.
 */
export function AvatarPortrait({ avatarClass, size, alt = "" }: {
  avatarClass: AvatarClass | null | undefined;
  size: 48 | 96;
  alt?: string;
}) {
  if (!avatarClass) {
    return <span aria-hidden="true" className={`${styles.empty} ${styles[`size${size}`]}`} data-avatar-slot="empty" />;
  }
  return (
    <Image
      alt={alt}
      className={styles.portrait}
      data-avatar-slot={avatarClass}
      data-pixel-avatar
      height={size}
      src={avatarPortraitSrc(avatarClass)}
      unoptimized
      width={size}
    />
  );
}
