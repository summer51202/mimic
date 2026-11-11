"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { PixelDialogue } from "@/shared/ui/pixel-dialogue";
import { sceneFit, sceneImageRendering } from "../scene/geometry";
import { ScenePauseButton } from "../scene/scene-pause-button";
import { brand } from "./brand";
import { useLandingAnimation } from "./landing-animation";
import { useLandingInteractions } from "./landing-interactions";
import { LandingRoom } from "./landing-room";
import { landingDesktopMedia, landingScene } from "./landing-scene";
import styles from "./landing-stage.module.css";

function snapPoints(viewport: HTMLElement) {
  const { width, initialViewportX, layers } = landingScene.phone;
  const actor = layers.find(({ id }) => id === "mimiku")!;
  const vw = viewport.clientWidth;
  return [0, Math.max(initialViewportX, actor.x + actor.width - vw), width - vw];
}

function nearestSnap(viewport: HTMLElement) {
  const points = snapPoints(viewport);
  return points.reduce((nearest, point, index) =>
    Math.abs(point - viewport.scrollLeft) < Math.abs(points[nearest] - viewport.scrollLeft)
      ? index : nearest, 0);
}

export function LandingStage({ authenticated }: { authenticated: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogueRef = useRef<HTMLDivElement>(null);
  const textScaleRef = useRef<HTMLSpanElement>(null);
  const [segment, setSegment] = useState(1);
  const interactions = useLandingInteractions();
  const paused = useLandingAnimation(stageRef);

  function explore(direction: number) {
    const viewport = stageRef.current!.querySelector<HTMLElement>('[data-landing-viewport="phone"]')!;
    const points = snapPoints(viewport);
    const next = Math.min(points.length - 1, Math.max(0, nearestSnap(viewport) + direction));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollTo({ left: points[next], behavior: reduced ? "auto" : "smooth" });
  }

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const stage = stageRef.current!;
    const viewport = stage.querySelector<HTMLDivElement>('[data-landing-viewport="phone"]')!;
    const dialogueBox = dialogueRef.current!;
    const textScale = textScaleRef.current!;
    const header = stage.closest("main")?.previousElementSibling;
    const desktopMedia = window.matchMedia(landingDesktopMedia);
    let previousVariant: "desktop" | "phone" | undefined;
    let previousWidth = 0;

    function syncSegment() {
      viewport.style.setProperty("--room-scroll-x", `${viewport.scrollLeft}px`);
      setSegment(nearestSnap(viewport));
    }

    function layout() {
      const variant = desktopMedia.matches ? "desktop" : "phone";
      const scene = landingScene[variant];
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const fit = sceneFit(scene.viewportWidth, scene.height, stage.clientWidth, window.innerHeight - headerHeight);
      const scale = variant === "desktop" ? fit.scale : 1;
      stage.style.setProperty("--scene-scale", String(scale));
      stage.style.setProperty("--header-height", `${headerHeight}px`);
      stage.dataset.scale = String(scale);
      stage.toggleAttribute("data-width-limited", variant === "desktop" && fit.widthLimited);

      if (variant === "desktop") {
        stage.style.setProperty("--fit-width", `${Math.round(scene.width * scale)}px`);
        stage.style.setProperty("--fit-height", `${Math.round(scene.height * scale)}px`);
        stage.style.setProperty("--desktop-image-rendering", sceneImageRendering(scale));
        stage.style.setProperty("--dialogue-inline-inset", `${Math.round(54 * scale)}px`);
        stage.style.setProperty("--dialogue-block-inset", `${Math.round(34 * scale)}px`);
      } else {
        stage.style.removeProperty("--dialogue-inline-inset");
        stage.style.removeProperty("--dialogue-block-inset");
        if (previousVariant !== variant || previousWidth !== viewport.clientWidth) {
          const index = previousVariant === variant ? nearestSnap(viewport) : 1;
          stage.dataset.scrollReady = "";
          viewport.scrollLeft = snapPoints(viewport)[index];
          previousWidth = viewport.clientWidth;
          syncSegment();
        }
      }
      previousVariant = variant;

      const safeHeight = Math.floor(scene.safeZones.dialogue.height * scale);
      const needsFlow = dialogueBox.getBoundingClientRect().height > safeHeight
        || dialogueBox.scrollWidth > dialogueBox.clientWidth
        || textScale.getBoundingClientRect().width >= 32;
      stage.dataset.dialogue = needsFlow ? "flow" : "overlay";
    }

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(stage);
    observer.observe(dialogueBox);
    observer.observe(textScale);
    if (header) observer.observe(header);
    window.addEventListener("resize", layout);
    viewport.addEventListener("scroll", syncSegment, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", layout);
      viewport.removeEventListener("scroll", syncSegment);
    };
  }, []);

  return (
    <div ref={stageRef} className={styles.stage} data-landing-stage data-scale="1" data-dialogue="overlay"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (!(event.target instanceof Element) || !event.target.closest('[data-landing-viewport="phone"]')) return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        explore(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <LandingRoom name="desktop" interactions={interactions} />
      <LandingRoom name="phone" interactions={interactions} />
      <div className={styles.arrows}>
        <button type="button" className={styles.control} aria-label="往左探索" aria-disabled={segment === 0}
          onClick={() => { if (segment !== 0) explore(-1); }}>◀</button>
        <button type="button" className={styles.control} aria-label="往右探索" aria-disabled={segment === 2}
          onClick={() => { if (segment !== 2) explore(1); }}>▶</button>
      </div>
      <span ref={textScaleRef} className={styles.textScale} aria-hidden="true" />
      <div ref={dialogueRef} className={styles.dialogueBox}>
        <PixelDialogue
          speaker={`${brand.characterNameZh} / ${brand.characterNameEn}`}
          actions={<Link className={styles.cta} href={authenticated ? "/app" : "/register"}>
            {authenticated ? "返回基地" : "開始冒險"}
          </Link>}
        >
          <p className={styles.line}>
            {!interactions.line && <span>{brand.tagline}</span>}
            <span aria-live="polite" aria-atomic="true">
              {interactions.line && <span key={interactions.line.id}>{interactions.line.text}</span>}
            </span>
          </p>
        </PixelDialogue>
      </div>
      <div className={styles.pauseBox}>
        <ScenePauseButton data-landing-pause="" className={styles.control} paused={paused} />
      </div>
    </div>
  );
}
