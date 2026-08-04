import { readFile } from "node:fs/promises";

import { PNG } from "pngjs";

export interface PngInspection {
  width: number;
  height: number;
  channels: 4;
  hasTransparentPixel: boolean;
  exteriorCornerTransparent: boolean;
  connectedNeutralPixels: number;
  nonTransparentBounds: { x: number; y: number; width: number; height: number };
  opaqueNearNeutralPixels: number;
  opaqueNeutralCheckerPixels: number;
}

export async function inspectPng(filename: string): Promise<PngInspection> {
  const png = PNG.sync.read(await readFile(filename));
  const connectedNeutral = connectedNeutralPixelIndexes(png);
  let hasTransparentPixel = false;
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  let opaqueNearNeutralPixels = 0;
  let opaqueNeutralCheckerPixels = 0;

  for (let index = 0; index < png.width * png.height; index += 1) {
    const offset = index * 4;
    const alpha = png.data[offset + 3];
    hasTransparentPixel ||= alpha === 0;

    if (alpha > 0) {
      const x = index % png.width;
      const y = Math.floor(index / png.width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }

    if (
      alpha === 255 &&
      isNearNeutral(png.data[offset], png.data[offset + 1], png.data[offset + 2])
    ) {
      opaqueNearNeutralPixels += 1;
    }

    if (alpha === 255 && isOpaqueNeutralCheckerPixel(png.data, offset)) {
      opaqueNeutralCheckerPixels += 1;
    }
  }

  return {
    width: png.width,
    height: png.height,
    channels: 4,
    hasTransparentPixel,
    exteriorCornerTransparent: cornerIndexes(png).every(
      (index) => png.data[index * 4 + 3] === 0,
    ),
    connectedNeutralPixels: connectedNeutral.size,
    nonTransparentBounds: {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    },
    opaqueNearNeutralPixels,
    opaqueNeutralCheckerPixels,
  };
}

function connectedNeutralPixelIndexes(png: PNG): Set<number> {
  const connected = new Set<number>();
  const queue: number[] = [];

  for (let x = 0; x < png.width; x += 1) {
    queue.push(x, (png.height - 1) * png.width + x);
  }
  for (let y = 1; y < png.height - 1; y += 1) {
    queue.push(y * png.width, y * png.width + png.width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    if (connected.has(index) || !isNeutralPixel(png, index)) continue;

    connected.add(index);
    const x = index % png.width;
    const y = Math.floor(index / png.width);
    if (x > 0) queue.push(index - 1);
    if (x + 1 < png.width) queue.push(index + 1);
    if (y > 0) queue.push(index - png.width);
    if (y + 1 < png.height) queue.push(index + png.width);
  }

  return connected;
}

function isNeutralPixel(png: PNG, index: number): boolean {
  const offset = index * 4;
  return (
    png.data[offset + 3] > 0 &&
    isNearNeutral(png.data[offset], png.data[offset + 1], png.data[offset + 2])
  );
}

function isNearNeutral(red: number, green: number, blue: number): boolean {
  return Math.max(red, green, blue) - Math.min(red, green, blue) <= 12 &&
    Math.min(red, green, blue) >= 230;
}

function isOpaqueNeutralCheckerPixel(data: Buffer, offset: number): boolean {
  const value = data[offset];
  return (
    value >= 244 &&
    value <= 251 &&
    data[offset + 1] === value &&
    data[offset + 2] === value
  );
}

function cornerIndexes(png: PNG): number[] {
  return [0, png.width - 1, (png.height - 1) * png.width, png.width * png.height - 1];
}
