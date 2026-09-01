import type { HTMLAttributes } from "react";

import styles from "./pixel-frame.module.css";

type PixelFrameVariant = "treasury" | "panel" | "dialog";

type PixelFrameProps = HTMLAttributes<HTMLDivElement> & {
  variant?: PixelFrameVariant;
};

export function PixelFrame({
  className,
  variant = "panel",
  ...props
}: PixelFrameProps) {
  const classes = [styles.frame, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      className={classes}
      data-pixel-frame="true"
      data-variant={variant}
    />
  );
}
