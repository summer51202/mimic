import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import frames from "../../../public/pixel-ui/v1/frames/frames.json";
import { NavigationIcon } from "@/shared/navigation/navigation-icon";
import styles from "./pixel-notebook.module.css";

function getFrameStyle(variant: "notebook" | "wood") {
const { file, slice, scale, repeat } = frames.frames[variant];
const { minPadding } = frames.frames.notebook;
const frameWidth = slice * scale;
return {
  "--notebook-frame": `url(/pixel-ui/v1/frames/${file}) ${slice} fill / ${frameWidth}px / 0 ${repeat}`,
  "--notebook-phone-inset": `${frameWidth + minPadding.phone}px`,
  "--notebook-desktop-inset": `${frameWidth + minPadding.desktop}px`,
} as CSSProperties;
}

export function PixelNotebook({ titleId, children, className, variant = "notebook" }: {
  titleId: string;
  variant?: "notebook" | "wood";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={titleId} className={[styles.notebook, variant === "wood" && "board", className].filter(Boolean).join(" ")} style={getFrameStyle(variant)}>
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
  const t = useTranslations("common");
  return (
    <p role="status" className={styles.withIcon}>
      <LedgerIcon name="status-offline" size={32} />
      {t("notebookOffline")}
    </p>
  );
}
