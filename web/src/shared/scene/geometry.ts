import type { CSSProperties } from "react";

type Box = { x: number; y: number; width: number; height: number };

export function boxStyle(box: Box) {
  return {
    "--layer-x": box.x,
    "--layer-y": box.y,
    "--layer-width": box.width,
    "--layer-height": box.height,
  } as CSSProperties;
}


export const sceneAssetRoot = "/pixel-ui/v1";

export function layersWithArchitecture<T>({ architecture, width, height, layers }: {
  architecture: { asset_id: string; sha256: string };
  width: number;
  height: number;
  layers: T[];
}) {
  return [{ ...architecture, id: "architecture", x: 0, y: 0, width, height, depth: -101 }, ...layers];
}

export function sceneFit(width: number, height: number, availableWidth: number, availableHeight: number) {
  const widthScale = availableWidth / width;
  const heightScale = Math.max(0, availableHeight) / height;
  return { scale: Math.min(widthScale, heightScale), widthLimited: widthScale < heightScale };
}

export function sceneImageRendering(scale: number) {
  return scale < 1 ? "auto" : "pixelated";
}
