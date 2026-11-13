"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import timing from "../../../public/pixel-ui/v1/motion/motion-timing.json";
import { sceneAssetRoot } from "./geometry";
import { homeActivityStorageKey, isNewerHomeActivity } from "./home-activity";
import { drawFrame, loadSheet, playSceneFrames } from "./sprite";
import { pauseKey, type SceneVariant } from "./use-scene-motion";
import styles from "./record-ledger-companion.module.css";

const desktopMedia = "(min-width: 768px)";
const duration = 2000;
const loadTimeout = 600;
const sheetLoaded = "record-ledger-sheet-loaded";
const variants = ["desktop", "phone"] as const;
const assetUrl = (variant: SceneVariant) => `${sceneAssetRoot}/${timing.variants[variant].ledger.asset_id}`;
const currentVariant = (): SceneVariant => window.matchMedia?.(desktopMedia).matches ? "desktop" : "phone";

function isPaused() {
  try {
    return localStorage.getItem(pauseKey) === "true";
  } catch {
    return false;
  }
}

function markActivitySeen(context: string, activityKey: string) {
  try {
    const key = homeActivityStorageKey(context);
    const previous = localStorage.getItem(key);
    if (previous === null || isNewerHomeActivity(activityKey, previous)) localStorage.setItem(key, activityKey);
  } catch {
    // The companion can still play when browser storage is unavailable.
  }
}

export function useRecordLedgerCompanion() {
  const container = useRef<HTMLDivElement>(null);
  const loads = useRef(new Map<SceneVariant, () => void>());
  const stop = useRef<(() => void) | undefined>(undefined);

  const preload = useCallback((variant = currentVariant()) => {
    const layer = container.current?.querySelector<HTMLElement>(`[data-variant="${variant}"]`);
    if (!layer) return;
    if (!layer.hasAttribute("data-loaded") && !loads.current.has(variant)) {
      loads.current.set(variant, loadSheet(layer, assetUrl(variant), () => {
        loads.current.delete(variant);
        layer.dispatchEvent(new Event(sheetLoaded));
      }));
    }
    return layer;
  }, []);

  useEffect(() => {
    const pendingLoads = loads.current;
    const media = window.matchMedia?.(desktopMedia);
    function visibilityChanged() {
      if (document.hidden) stop.current?.();
    }
    function viewportChanged() {
      stop.current?.();
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    media?.addEventListener("change", viewportChanged);
    return () => {
      document.removeEventListener("visibilitychange", visibilityChanged);
      media?.removeEventListener("change", viewportChanged);
      stop.current?.();
      for (const cancel of pendingLoads.values()) cancel();
      pendingLoads.clear();
    };
  }, []);

  function celebrate({ context, activityKey }: { context: string; activityKey: string }) {
    const host = container.current;
    if (!host || isPaused() || document.hidden || stop.current) return;
    const variant = currentVariant();
    const layer = preload(variant);
    if (!layer) return;

    function show() {
      if (!host || !layer || document.hidden || isPaused()) return;
      const { frame_ms, reduced_motion_final } = timing.variants[variant].ledger;
      const draw = (frame: number) => drawFrame(layer, frame);
      const finalFrame = Number(reduced_motion_final.split(" ").at(-1));
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      layer.style.backgroundImage = `url(${assetUrl(variant)})`;
      layer.hidden = false;
      host.hidden = false;
      let stopFrames: (() => void) | undefined;
      if (reduced) draw(finalFrame);
      else stopFrames = playSceneFrames(frame_ms, draw, () => draw(finalFrame));
      const timer = setTimeout(() => stop.current?.(), duration);
      stop.current = () => {
        clearTimeout(timer);
        stopFrames?.();
        host.hidden = true;
        layer.hidden = true;
        draw(0);
        stop.current = undefined;
      };
      markActivitySeen(context, activityKey);
    }

    if (layer.hasAttribute("data-loaded")) {
      show();
    } else {
      const timer = setTimeout(() => {
        stop.current?.();
        loads.current.get(variant)?.();
        loads.current.delete(variant);
      }, loadTimeout);
      const ready = () => {
        stop.current?.();
        show();
      };
      stop.current = () => {
        clearTimeout(timer);
        layer.removeEventListener(sheetLoaded, ready);
        stop.current = undefined;
      };
      layer.addEventListener(sheetLoaded, ready);
    }
  }

  const companion = <div ref={container} className={styles.companion} data-record-ledger-companion aria-hidden="true" hidden>
    {variants.map(variant => <div key={variant} className={styles.sheet} data-variant={variant} hidden style={{
      "--sheet-frames": timing.variants[variant].ledger.frame_ms.length,
    } as CSSProperties} />)}
  </div>;

  return { celebrate, companion, preload };
}
