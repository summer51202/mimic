import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

export function ScenePauseButton({ paused, ...props }: ComponentProps<"button"> & { paused: boolean }) {
  const t = useTranslations("shell");
  return <button {...props} data-scene-pause type="button" aria-pressed={paused}>
    {t(paused ? "play" : "pause")}
  </button>;
}
