import { useEffect, useState, type RefObject } from "react";
import { landingAssetRoot, landingDesktopMedia } from "./landing-scene";
import { landingMotion, playLandingFrames } from "./landing-motion";

const motionQuery = "(prefers-reduced-motion: reduce)";
const pauseKey = "mimic.landing.animation-paused";

export function useLandingAnimation(stageRef: RefObject<HTMLDivElement | null>) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const stage = stageRef.current!;
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(landingDesktopMedia);
    const reduced = window.matchMedia(motionQuery);
    let visible = typeof IntersectionObserver === "undefined";
    let userPaused = false;
    try {
      userPaused = localStorage.getItem(pauseKey) === "true";
    } catch {
      // Storage is optional.
    }
    let stop: (() => void) | undefined;

    function update() {
      stop?.();
      stop = undefined;
      if (userPaused || reduced.matches || document.hidden || !visible) return;

      const variant = media.matches ? "desktop" : "phone";
      const scene = stage.querySelector(`[data-landing-scene="${variant}"]`)!;
      const fire = scene.querySelector<HTMLElement>("[data-campfire-sheet]")!;
      const title = scene.querySelector<HTMLElement>('[data-layer="wordmark"]')!;
      const timing = landingMotion[variant];

      function frame(layer: HTMLElement, index: number) {
        layer.style.setProperty("--frame", String(index));
      }

      const stopFire = playLandingFrames(timing.fire.frame_ms, (index) => frame(fire, index));
      let timer: ReturnType<typeof setTimeout>;
      let stopTitle: (() => void) | undefined;
      function scheduleBlink() {
        const [min, max] = landingMotion.titleInterval;
        timer = setTimeout(() => {
          stopTitle = playLandingFrames(timing.title.frame_ms, (index) => frame(title, index), () => {
            frame(title, 0);
            scheduleBlink();
          });
        }, min + Math.random() * (max - min));
      }
      scheduleBlink();

      stop = () => {
        clearTimeout(timer);
        stopTitle?.();
        stopFire();
        frame(title, 0);
        frame(fire, 0);
      };
    }

    let fireImage: HTMLImageElement | undefined;
    function loadFireSheet() {
      if (fireImage) fireImage.onload = null;
      const variant = media.matches ? "desktop" : "phone";
      const sheet = stage.querySelector<HTMLElement>(
        `[data-landing-scene="${variant}"] [data-campfire-sheet]`,
      )!;
      const image = new Image();
      fireImage = image;
      image.onload = () => { sheet.dataset.loaded = ""; };
      image.src = `${landingAssetRoot}/${landingMotion[variant].fire.asset_id}`;
    }

    function switchVariant() {
      loadFireSheet();
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

    const pause = stage.querySelector<HTMLButtonElement>("[data-landing-pause]")!;
    const sceneObserver = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver((entries) => {
      const variant = media.matches ? "desktop" : "phone";
      const active = entries.find((entry) => (entry.target as HTMLElement).dataset.landingViewport === variant);
      if (active) {
        visible = active.isIntersecting;
        update();
      }
    });
    stage.querySelectorAll("[data-landing-viewport]").forEach((viewport) => sceneObserver?.observe(viewport));
    pause.addEventListener("click", togglePause);
    pause.dataset.ready = "";
    media.addEventListener("change", switchVariant);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    setPaused(userPaused);
    loadFireSheet();
    update();
    return () => {
      sceneObserver?.disconnect();
      pause.removeEventListener("click", togglePause);
      delete pause.dataset.ready;
      media.removeEventListener("change", switchVariant);
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      if (fireImage) fireImage.onload = null;
      stop?.();
    };
  }, [stageRef]);

  return paused;
}
