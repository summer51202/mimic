import type { ComponentProps } from "react";

export function ScenePauseButton({ paused, ...props }: ComponentProps<"button"> & { paused: boolean }) {
  return <button {...props} data-scene-pause type="button" aria-pressed={paused}>
    {paused ? "播放動畫" : "暫停動畫"}
  </button>;
}
