import type { HTMLAttributes } from "react";

type PixelNoticeVariant = "info" | "success" | "warning" | "error";

type PixelNoticeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: PixelNoticeVariant;
};

export function PixelNotice({
  className,
  variant = "info",
  ...props
}: PixelNoticeProps) {
  const isUrgent = variant === "error" || variant === "warning";
  const classes = ["pixel-notice", className].filter(Boolean).join(" ");

  return (
    <div
      {...props}
      aria-live={isUrgent ? "assertive" : "polite"}
      className={classes}
      data-variant={variant}
      role={isUrgent ? "alert" : "status"}
    />
  );
}
