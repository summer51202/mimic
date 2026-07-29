import type { ButtonHTMLAttributes } from "react";

type PixelButtonEmphasis = "primary" | "secondary" | "danger" | "ghost";

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  emphasis?: PixelButtonEmphasis;
  iconOnlyLabel?: string;
};

export function PixelButton({
  className,
  emphasis = "primary",
  iconOnlyLabel,
  ...props
}: PixelButtonProps) {
  const classes = ["pixel-button", className].filter(Boolean).join(" ");

  return (
    <button
      {...props}
      aria-label={iconOnlyLabel ?? props["aria-label"]}
      className={classes}
      data-emphasis={emphasis}
      data-focus-ring="visible"
      data-icon-only={iconOnlyLabel ? "true" : undefined}
    />
  );
}
