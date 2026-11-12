import type { CSSProperties, ReactNode } from "react";
import frames from "../../../public/pixel-ui/v1/frames/frames.json";
import { NavigationIcon } from "@/shared/navigation/navigation-icon";
import styles from "./pixel-notebook.module.css";

const { file, slice, scale, repeat, minPadding } = frames.frames.notebook;
const frameWidth = slice * scale;
const frameStyle = {
  "--notebook-frame": `url(/pixel-ui/v1/frames/${file}) ${slice} fill / ${frameWidth}px / 0 ${repeat}`,
  "--notebook-phone-inset": `${frameWidth + minPadding.phone}px`,
  "--notebook-desktop-inset": `${frameWidth + minPadding.desktop}px`,
} as CSSProperties;

export function PixelNotebook({ titleId, children, className }: {
  titleId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={titleId} className={[styles.notebook, className].filter(Boolean).join(" ")} style={frameStyle}>
      {children}
    </section>
  );
}

export function LedgerIcon({ name, size }: { name: string; size?: 32 }) {
  return (
    <span className={size ? styles.fixedIcon : styles.icon}>
      <NavigationIcon name={name} size={size ?? 48} />
    </span>
  );
}

export function NotebookOfflineNotice() {
  return (
    <p role="status" className={styles.withIcon}>
      <LedgerIcon name="status-offline" size={32} />
      目前離線；已確認資料維持不變。
    </p>
  );
}
