import { useId, type CSSProperties, type ReactNode } from "react";
import frames from "../../../public/pixel-ui/v1/frames/frames.json";
import styles from "./pixel-dialogue.module.css";

type PixelDialogueProps = {
  speaker: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  as?: "section" | "div";
  className?: string;
};

const { file, slice, scale, repeat, minPadding } = frames.frames.dialogue;
const frameWidth = slice * scale;
const frameStyle = {
  "--dialogue-frame": `url(/pixel-ui/v1/frames/${file}) ${slice} fill / ${frameWidth}px / 0 ${repeat}`,
  "--dialogue-phone-inset": `${frameWidth + minPadding.phone}px`,
  "--dialogue-desktop-inset": `${frameWidth + minPadding.desktop}px`,
} as CSSProperties;

export function PixelDialogue({
  speaker,
  children,
  actions,
  as: Element = "section",
  className,
}: PixelDialogueProps) {
  const speakerId = useId();
  return (
    <Element
      aria-labelledby={Element === "section" ? speakerId : undefined}
      className={[styles.dialogue, className].filter(Boolean).join(" ")}
      style={frameStyle}
    >
      <div className={styles.copy}>
        <p id={speakerId} className={styles.speaker}>{speaker}</p>
        {children}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </Element>
  );
}
