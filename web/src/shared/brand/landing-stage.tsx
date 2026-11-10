"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { landingDesktopMedia, landingScene } from "./landing-scene";
import styles from "./landing-stage.module.css";

export function LandingStage({ children, dialogue }: { children: ReactNode; dialogue: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogueRef = useRef<HTMLDivElement>(null);
  const textScaleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const stage = stageRef.current!;
    const viewport = stage.querySelector<HTMLDivElement>('[data-landing-viewport="phone"]')!;
    const dialogueBox = dialogueRef.current!;
    const textScale = textScaleRef.current!;
    const header = stage.closest("main")?.previousElementSibling;
    const desktopMedia = window.matchMedia(landingDesktopMedia);
    let previousVariant: "desktop" | "phone" | undefined;
    let previousScale = 1;

    function layout() {
      const variant = desktopMedia.matches ? "desktop" : "phone";
      const scene = landingScene[variant];
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const widthScale = stage.clientWidth / scene.viewportWidth;
      const heightScale = Math.max(0, window.innerHeight - headerHeight) / scene.height;
      const scale = variant === "desktop"
        ? Math.min(widthScale, heightScale)
        : Math.max(1, Math.floor(widthScale));
      stage.style.setProperty("--scene-scale", String(scale));
      stage.style.setProperty("--header-height", `${headerHeight}px`);
      stage.dataset.scale = String(scale);
      stage.toggleAttribute("data-width-limited", variant === "desktop" && widthScale < heightScale);

      if (variant === "desktop") {
        stage.style.setProperty("--fit-width", `${Math.round(scene.width * scale)}px`);
        stage.style.setProperty("--fit-height", `${Math.round(scene.height * scale)}px`);
        stage.style.setProperty("--desktop-image-rendering", scale < 1 ? "auto" : "pixelated");
        stage.style.setProperty("--dialogue-inline-inset", `${Math.round(54 * scale)}px`);
        stage.style.setProperty("--dialogue-block-inset", `${Math.round(34 * scale)}px`);
      } else {
        stage.style.removeProperty("--dialogue-inline-inset");
        stage.style.removeProperty("--dialogue-block-inset");
      }

      // Swap the SSR offset for native scrolling in the same layout pass.
      if (variant === "phone" && (previousVariant !== variant || previousScale !== scale)) {
        const centeredCrop = Math.floor(Math.max(0, scene.viewportWidth - viewport.clientWidth) / 2);
        const logicalX = previousVariant === variant
          ? viewport.scrollLeft / previousScale
          : scene.initialViewportX + centeredCrop;
        stage.dataset.scrollReady = "";
        viewport.scrollLeft = Math.round(logicalX * scale);
      }
      previousVariant = variant;
      previousScale = scale;

      const safeHeight = Math.floor(scene.safeZones.dialogue.height * scale);
      const needsFlow = dialogueBox.getBoundingClientRect().height > safeHeight
        || dialogueBox.scrollWidth > dialogueBox.clientWidth
        || textScale.getBoundingClientRect().width >= 32;
      stage.dataset.dialogue = needsFlow ? "flow" : "overlay";
    }

    function scrollWithArrow(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const step = Math.floor(viewport.clientWidth / 10);
      viewport.scrollLeft += event.key === "ArrowLeft" ? -step : step;
    }

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(stage);
    observer.observe(dialogueBox);
    observer.observe(textScale);
    if (header) observer.observe(header);
    window.addEventListener("resize", layout);
    viewport.addEventListener("keydown", scrollWithArrow);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", layout);
      viewport.removeEventListener("keydown", scrollWithArrow);
    };
  }, []);

  return (
    <div ref={stageRef} className={styles.stage} data-landing-stage data-scale="1" data-dialogue="overlay">
      {children}
      <span ref={textScaleRef} className={styles.textScale} aria-hidden="true" />
      <div ref={dialogueRef} className={styles.dialogueBox}>{dialogue}</div>
    </div>
  );
}
