"use client";

import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import layout from "../../../public/pixel-ui/v1/scenes/home/layout.json";
import type { HomeCard } from "@/shared/api/home-contracts";
import { avatarFullBounds, avatarFullSize, avatarFullSrc, type AvatarClass } from "@/shared/avatar/avatar-classes";
import { boxStyle, layersWithArchitecture, sceneAssetRoot } from "@/shared/scene/geometry";
import { ScenePauseButton } from "@/shared/scene/scene-pause-button";
import { useSceneMotion, type SceneVariant } from "@/shared/scene/use-scene-motion";
import { PixelDialogue } from "@/shared/ui/pixel-dialogue";
import { QuickExpense } from "../quick-expense/quick-expense";
import { homeMotion, homePlayback } from "./home-scene-motion";
import styles from "./home-scene.module.css";

const desktopVariant = layout.desktop;
const phoneVariant = layout.phone;
const dimensions = Object.fromEntries(Object.entries(layout).flatMap(([variant, scene]) => {
  const [x, y, width] = scene.safeZones.card;
  const [, dialogueY, , dialogueHeight] = scene.safeZones.dialogue;
  return Object.entries({
    width: scene.width, height: scene.height, "card-x": x, "card-y": y,
    "card-width": width, "dialogue-y": dialogueY, "dialogue-height": dialogueHeight,
  }).map(([key, value]) => [`--${variant}-${key}`, `${value}px`]);
})) as CSSProperties;

// The slot box in layout.json is the class's opaque area in scene pixels; map the
// master's opaque bounds onto it so the approved placement and safe zones hold.
function avatarStyle(avatarClass: AvatarClass, variant: SceneVariant): CSSProperties {
  const slot = layout[variant].avatarSlots[avatarClass];
  const bounds = avatarFullBounds[avatarClass];
  const sx = slot.width / bounds.width;
  const sy = slot.height / bounds.height;
  return {
    ...boxStyle(slot),
    zIndex: slot.depth,
    backgroundImage: `url(${avatarFullSrc(avatarClass)})`,
    backgroundSize: `${avatarFullSize * sx}px ${avatarFullSize * sy}px`,
    backgroundPosition: `${-bounds.x * sx}px ${-bounds.y * sy}px`,
  };
}

function HomeRoom({ variant, avatarClass }: { variant: SceneVariant; avatarClass: AvatarClass | null }) {
  const scene = layout[variant];
  return <div data-home-viewport={variant} className={styles.viewport} aria-hidden="true">
    <div data-home-scene={variant} className={styles.scene} style={{ width: scene.width, height: scene.height }}>
      {avatarClass && <div data-layer="avatar" data-avatar-class={avatarClass}
        className={`${styles.layer} ${styles.avatar}`} style={avatarStyle(avatarClass, variant)} />}
      {layersWithArchitecture(scene).map((layer) => {
        const sheets = layer.id === "mimiku" ? ["idle", "ledger"] as const
          : layer.id === "fire" ? ["fire"] as const : [];
        return <div key={layer.id} data-layer={layer.id} className={styles.layer} style={{
          ...boxStyle(layer),
          zIndex: layer.depth,
          backgroundImage: `url(${sceneAssetRoot}/${layer.asset_id})`,
        }}>
          {sheets.map((name) => <div key={name} className={styles.sheet} data-home-sheet={name} style={{
            "--sheet-frames": homeMotion[variant][name].frames,
            backgroundImage: `url(${sceneAssetRoot}/${homeMotion[variant][name].asset_id})`,
          } as CSSProperties} />)}
        </div>;
      })}
    </div>
  </div>;
}

export function HomeScene({ avatarClass = null, cards, online, taskCount, context, activityKey, adventure, openQuick }: {
  avatarClass?: AvatarClass | null;
  cards: HomeCard[];
  online: boolean;
  taskCount: number;
  context: string;
  activityKey: string | null;
  adventure: ReactNode;
  openQuick: boolean;
}) {
  const t = useTranslations();
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogueRef = useRef<HTMLDivElement>(null);
  const textScaleRef = useRef<HTMLSpanElement>(null);
  const playback = useMemo(() => homePlayback(context, activityKey), [context, activityKey]);
  const paused = useSceneMotion(stageRef, null, playback);
  const line = !online ? t("home.scene.offline")
    : !cards.length ? t("home.scene.empty")
      : taskCount > 0 ? t("home.scene.quests", { count: taskCount }) : t("home.scene.ready");

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const stage = stageRef.current!;
    const card = cardRef.current!;
    const dialogue = dialogueRef.current!;
    const textScale = textScaleRef.current!;
    const desktopRoom = stage.querySelector<HTMLElement>('[data-home-scene="desktop"]')!;

    function syncLayout() {
      const desktop = desktopRoom.getClientRects().length > 0;
      const scene = desktop ? desktopVariant : phoneVariant;
      const scale = desktop ? desktopRoom.getBoundingClientRect().width / scene.width : 1;
      const [, y, , cardHeight] = scene.safeZones.card;
      const [, dy, , dh] = scene.safeZones.dialogue;
      stage.toggleAttribute("data-pixelated", scale >= 1);
      stage.dataset.scale = String(scale);

      const enlargedText = textScale.getBoundingClientRect().width >= 32;
      // Desktop actors are beside the card. On mobile the card is above them.
      // The chosen class stands left of the fire, above it: keep the card clear of it too.
      const nextContentTop = desktop ? dy
        : Math.min(...scene.layers.filter(({ id }) => id === "fire" || id === "mimiku").map((layer) => layer.y),
          ...(avatarClass ? [scene.avatarSlots[avatarClass].y] : []));
      const cardLimit = Math.max(cardHeight, nextContentTop - y - 8) * scale;
      stage.toggleAttribute("data-card-flow", enlargedText || card.getBoundingClientRect().height > cardLimit);
      stage.toggleAttribute("data-dialogue-flow", enlargedText || dialogue.getBoundingClientRect().height > dh * scale + 0.05);
    }

    syncLayout();
    const observer = new ResizeObserver(syncLayout);
    for (const target of [stage.parentElement!, stage, card, dialogue, textScale]) observer.observe(target);
    window.addEventListener("resize", syncLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncLayout);
    };
  }, [avatarClass]);

  return (
    <div className={styles.content} data-home-content style={dimensions}>
      <div ref={stageRef} data-home-stage className={styles.stage}>
        <HomeRoom variant="desktop" avatarClass={avatarClass} />
        <HomeRoom variant="phone" avatarClass={avatarClass} />
        <span ref={textScaleRef} className={styles.textScale} aria-hidden="true" />
        <div ref={cardRef} className={styles.card} data-home-card>{adventure}</div>
        <div ref={dialogueRef} className={styles.dialogue} data-home-dialogue>
          <PixelDialogue speaker={t("brand.speaker")} actions={<QuickExpense cards={cards} initiallyOpen={openQuick} />}>
            <p className={styles.line}>{line}</p>
          </PixelDialogue>
        </div>
        <ScenePauseButton className={styles.pause} paused={paused} />
      </div>
    </div>
  );
}
