import type { RefObject } from "react";
import { useSceneMotion } from "../scene/use-scene-motion";
import { drawFrame, loadSheet } from "../scene/sprite";
import { landingAssetRoot, landingDesktopMedia } from "./landing-scene";
import { landingMotion, playLandingFrames } from "./landing-motion";

export function useLandingAnimation(stageRef: RefObject<HTMLDivElement | null>) {
  return useSceneMotion(stageRef, landingDesktopMedia, landingPlayback);
}

const landingPlayback = {
  viewport: "data-landing-viewport",
  scene: "data-landing-scene",
  load(scene: HTMLElement, variant: "desktop" | "phone") {
    return loadSheet(scene.querySelector<HTMLElement>("[data-campfire-sheet]")!,
    `${landingAssetRoot}/${landingMotion[variant].fire.asset_id}`);
  },
  play(scene: HTMLElement, variant: "desktop" | "phone", reduced: boolean) {
    if (reduced) return;
    const fire = scene.querySelector<HTMLElement>("[data-campfire-sheet]")!;
    const title = scene.querySelector<HTMLElement>('[data-layer="wordmark"]')!;
    const timing = landingMotion[variant];

    const stopFire = playLandingFrames(timing.fire.frame_ms, (index) => drawFrame(fire, index));
    let timer: ReturnType<typeof setTimeout>;
    let stopTitle: (() => void) | undefined;
    function scheduleBlink() {
      const [min, max] = landingMotion.titleInterval;
      timer = setTimeout(() => {
        stopTitle = playLandingFrames(timing.title.frame_ms, (index) => drawFrame(title, index), () => {
          drawFrame(title, 0);
          scheduleBlink();
        });
      }, min + Math.random() * (max - min));
    }
    scheduleBlink();

    return () => {
      clearTimeout(timer);
      stopTitle?.();
      stopFire();
      drawFrame(title, 0);
      drawFrame(fire, 0);
    };
  },
};
