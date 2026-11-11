"use client";

import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import layout from "../../../../docs/design/assets/approved/page-visual-v1/scenes/home/layout.json";
import type { HomeCard } from "@/shared/api/home-contracts";
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

function HomeRoom({ variant }: { variant: SceneVariant }) {
  const scene = layout[variant];
  return <div data-home-viewport={variant} className={styles.viewport} aria-hidden="true">
    <div data-home-scene={variant} className={styles.scene} style={{ width: scene.width, height: scene.height }}>
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

export function HomeScene({ cards, online, taskCount, context, activity, adventure, openQuick }: {
  cards: HomeCard[];
  online: boolean;
  taskCount: number;
  context: string;
  activity?: { id: string; occurred_on: string };
  adventure: ReactNode;
  openQuick: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogueRef = useRef<HTMLDivElement>(null);
  const textScaleRef = useRef<HTMLSpanElement>(null);
  const activityKey = activity ? `${activity.occurred_on}/${activity.id}` : "";
  const playback = useMemo(() => homePlayback(context, activityKey), [context, activityKey]);
  const paused = useSceneMotion(stageRef, null, playback);
  const line = !online ? "現在離線，我先幫你看著最後的狀態。"
    : !cards.length ? "這裡還空空的，先建立一個寶箱吧！"
      : taskCount > 0 ? `有 ${taskCount} 件事等你確認喔。` : "今天要記點什麼嗎？";

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
      const nextContentTop = desktop ? dy
        : Math.min(...scene.layers.filter(({ id }) => id === "fire" || id === "mimiku").map((layer) => layer.y));
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
  }, []);

  return (
    <div className={styles.content} data-home-content style={dimensions}>
      <div ref={stageRef} data-home-stage className={styles.stage}>
        <HomeRoom variant="desktop" />
        <HomeRoom variant="phone" />
        <span ref={textScaleRef} className={styles.textScale} aria-hidden="true" />
        <div ref={cardRef} className={styles.card} data-home-card>{adventure}</div>
        <div ref={dialogueRef} className={styles.dialogue} data-home-dialogue>
          <PixelDialogue speaker="咪咪庫 / Mimiku" actions={<QuickExpense cards={cards} initiallyOpen={openQuick} />}>
            <p className={styles.line}>{line}</p>
          </PixelDialogue>
        </div>
        <ScenePauseButton className={styles.pause} paused={paused} />
      </div>
    </div>
  );
}
