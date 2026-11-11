import timing from "../../../public/pixel-ui/v1/motion/motion-timing.json";
import { sceneAssetRoot } from "@/shared/scene/geometry";
import { drawFrame, loadSheet, playSceneFrames } from "@/shared/scene/sprite";
import type { ScenePlayback } from "@/shared/scene/use-scene-motion";

export const homeMotion = timing.variants;

export function homePlayback(context: string, activityKey: string): ScenePlayback {
  let entered = false;
  let pendingLedger = false;
  return {
    viewport: "data-home-viewport",
    scene: "data-home-scene",
    enter(paused) {
      if (entered) return;
      entered = true;
      try {
        const key = `mimic.home.latest-activity.${context}`;
        const previous = localStorage.getItem(key);
        localStorage.setItem(key, activityKey);
        pendingLedger = !paused && previous !== null && activityKey > previous;
      } catch {
        // The scene still works when browser storage is unavailable.
      }
    },
    load(scene, variant) {
      const cancel = (["fire", "idle", "ledger"] as const).map((name) => {
        const sheet = scene.querySelector<HTMLElement>(`[data-home-sheet="${name}"]`)!;
        return loadSheet(sheet, `${sceneAssetRoot}/${homeMotion[variant][name].asset_id}`,
          name === "ledger" ? () => sheet.dispatchEvent(new Event("scene-sheet-loaded")) : undefined);
      });
      return () => cancel.forEach((unload) => unload());
    },
    play(scene, variant, reduced) {
      const { fire, idle, ledger } = homeMotion[variant];
      const fireSheet = scene.querySelector<HTMLElement>('[data-home-sheet="fire"]')!;
      const idleSheet = scene.querySelector<HTMLElement>('[data-home-sheet="idle"]')!;
      const ledgerSheet = scene.querySelector<HTMLElement>('[data-home-sheet="ledger"]')!;
      const stopFire = reduced ? undefined : playSceneFrames(fire.frame_ms, (frame) => drawFrame(fireSheet, frame));
      let stopIdle: (() => void) | undefined;
      let stopLedger: (() => void) | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;

      function startIdle() {
        if (reduced) return;
        stopIdle = playSceneFrames(idle.frame_ms.slice(0, 2), (frame) => drawFrame(idleSheet, frame));
        const [min, max] = timing.playback.idle.blink_interval_ms;
        timer = setTimeout(() => {
          stopIdle?.();
          const blink = timing.playback.idle.blink_frame;
          drawFrame(idleSheet, blink);
          timer = setTimeout(startIdle, idle.frame_ms[blink]);
        }, min + Math.random() * (max - min));
      }

      function endLedger() {
        delete scene.dataset.ledger;
        startIdle();
      }

      function startLedger() {
        pendingLedger = false;
        clearTimeout(timer);
        stopIdle?.();
        drawFrame(idleSheet, 0);
        scene.dataset.ledger = "";
        if (reduced) {
          drawFrame(ledgerSheet, Number(ledger.reduced_motion_final.split(" ").at(-1)));
          timer = setTimeout(endLedger, 1500);
        } else {
          stopLedger = playSceneFrames(ledger.frame_ms, (frame) => drawFrame(ledgerSheet, frame), endLedger);
        }
      }

      if (pendingLedger && ledgerSheet.hasAttribute("data-loaded")) {
        startLedger();
      } else {
        startIdle();
        if (pendingLedger) ledgerSheet.addEventListener("scene-sheet-loaded", startLedger, { once: true });
      }

      return () => {
        ledgerSheet.removeEventListener("scene-sheet-loaded", startLedger);
        clearTimeout(timer);
        stopIdle?.();
        stopLedger?.();
        stopFire?.();
        delete scene.dataset.ledger;
        for (const sheet of [fireSheet, idleSheet, ledgerSheet]) drawFrame(sheet, 0);
      };
    },
  };
}
