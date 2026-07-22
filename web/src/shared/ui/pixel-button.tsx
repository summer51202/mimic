import type { ButtonHTMLAttributes } from "react";

type PixelButtonEmphasis = "primary" | "secondary" | "danger" | "ghost";

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  emphasis?: PixelButtonEmphasis;
};

export function PixelButton({
  className,
  emphasis = "primary",
  ...props
}: PixelButtonProps) {
  const classes = ["pixel-button", className].filter(Boolean).join(" ");

  return (
    <button {...props} className={classes} data-emphasis={emphasis} />
  );
}
