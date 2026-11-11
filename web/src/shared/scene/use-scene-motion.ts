import { useEffect, useState, type RefObject } from "react";

export type SceneVariant = "desktop" | "phone";
export type ScenePlayback = {
  viewport: string;
  scene: string;
  enter?: (paused: boolean) => void;
  load: (scene: HTMLElement, variant: SceneVariant) => () => void;
  play: (scene: HTMLElement, variant: SceneVariant, reduced: boolean) => (() => void) | undefined;
};

const pauseKey = "mimic.landing.animation-paused";

export function useSceneMotion(
  stageRef: RefObject<HTMLDivElement | null>,
  desktopMedia: string | null,
  playback: ScenePlayback,
) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const stage = stageRef.current!;
    if (typeof window.matchMedia !== "function") return;
    const media = desktopMedia ? window.matchMedia(desktopMedia) : null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = typeof IntersectionObserver === "undefined";
    let userPaused = false;
    try {
      userPaused = localStorage.getItem(pauseKey) === "true";
    } catch {
      // Storage is optional.
    }
    playback.enter?.(userPaused);
    let stop: (() => void) | undefined;
    let cancelLoad: (() => void) | undefined;

    const viewports = Array.from(stage.querySelectorAll<HTMLElement>(`[${playback.viewport}]`));
    const desktopViewport = viewports.find((viewport) => viewport.getAttribute(playback.viewport) === "desktop")!;
    function activeVariant(): SceneVariant {
      return (media?.matches ?? desktopViewport.getClientRects().length > 0) ? "desktop" : "phone";
    }
    let variant = activeVariant();

    function activeScene() {
      return stage.querySelector<HTMLElement>(`[${playback.scene}="${variant}"]`)!;
    }

    function update() {
      stop?.();
      stop = undefined;
      if (userPaused || document.hidden || !visible) return;
      stop = playback.play(activeScene(), variant, reduced.matches);
    }

    function switchVariant() {
      cancelLoad?.();
      variant = activeVariant();
      cancelLoad = playback.load(activeScene(), variant);
      update();
    }

    function togglePause() {
      userPaused = !userPaused;
      setPaused(userPaused);
      try {
        localStorage.setItem(pauseKey, String(userPaused));
      } catch {
        // Keep the setting for this visit.
      }
      update();
    }

    const pause = stage.querySelector<HTMLButtonElement>("[data-scene-pause]")!;
    const sceneObserver = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver((entries) => {
      const next = activeVariant();
      const active = entries.find((entry) => entry.target.getAttribute(playback.viewport) === next);
      if (!media && variant !== next) {
        visible = active?.isIntersecting ?? false;
        switchVariant();
        return;
      }
      if (active) {
        visible = active.isIntersecting;
        update();
      }
    });
    viewports.forEach((viewport) => sceneObserver?.observe(viewport));
    const variantObserver = !media && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      if (variant !== activeVariant()) {
        visible = !sceneObserver;
        switchVariant();
      }
    }) : undefined;
    viewports.forEach((viewport) => variantObserver?.observe(viewport));
    pause.addEventListener("click", togglePause);
    pause.dataset.ready = "";
    media?.addEventListener("change", switchVariant);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    setPaused(userPaused);
    switchVariant();
    return () => {
      sceneObserver?.disconnect();
      variantObserver?.disconnect();
      pause.removeEventListener("click", togglePause);
      delete pause.dataset.ready;
      media?.removeEventListener("change", switchVariant);
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      cancelLoad?.();
      stop?.();
    };
  }, [desktopMedia, playback, stageRef]);

  return paused;
}
