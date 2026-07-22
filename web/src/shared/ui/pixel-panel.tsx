import type { HTMLAttributes } from "react";

type PixelPanelProps = HTMLAttributes<HTMLDivElement>;

export function PixelPanel({ className, ...props }: PixelPanelProps) {
  const classes = ["pixel-panel", className].filter(Boolean).join(" ");

  return <div {...props} className={classes} />;
}
