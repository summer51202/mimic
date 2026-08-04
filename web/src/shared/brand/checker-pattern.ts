import { PNG } from "pngjs";

export interface CheckerPatternMatch {
  blockSize: 8 | 16;
  x: number;
  y: number;
}

const checkerBlockSizes = [8, 16] as const;
const gridSize = 3;
const neutralChannelTolerance = 8;
const uniformChannelTolerance = 4;
const minimumNeutralChannel = 190;
const minimumToneDifference = 16;
const maximumToneDifference = 64;

/**
 * Finds a rendered transparency checker, not isolated neutral pixels. A match
 * must be a 3x3 alternating grid of fully opaque, uniformly filled 8px or 16px
 * neutral blocks. Those dimensions cover the source and 2x rendered checker
 * used by common image editors while excluding the app's smaller frame pixels.
 */
export function findBakedTransparencyChecker(
  screenshot: Buffer,
): CheckerPatternMatch | null {
  const png = PNG.sync.read(screenshot);

  for (const blockSize of checkerBlockSizes) {
    const patternSize = blockSize * gridSize;
    for (let y = 0; y <= png.height - patternSize; y += 1) {
      for (let x = 0; x <= png.width - patternSize; x += 1) {
        const light = sampleNeutral(png, x + blockSize / 2, y + blockSize / 2);
        const dark = sampleNeutral(png, x + blockSize + blockSize / 2, y + blockSize / 2);
        if (!light || !dark || !tonesAreCharacteristic(light, dark)) continue;

        if (isUniformAlternatingGrid(png, x, y, blockSize, light, dark)) {
          return { blockSize, x, y };
        }
      }
    }
  }

  return null;
}

type Rgb = readonly [number, number, number];

function sampleNeutral(png: PNG, x: number, y: number): Rgb | null {
  const offset = (y * png.width + x) * 4;
  if (png.data[offset + 3] !== 255) return null;
  const color: Rgb = [png.data[offset], png.data[offset + 1], png.data[offset + 2]];
  return isNeutral(color) ? color : null;
}

function isNeutral(color: Rgb): boolean {
  return Math.min(...color) >= minimumNeutralChannel &&
    Math.max(...color) - Math.min(...color) <= neutralChannelTolerance;
}

function tonesAreCharacteristic(first: Rgb, second: Rgb): boolean {
  const difference = Math.abs(luminance(first) - luminance(second));
  return difference >= minimumToneDifference && difference <= maximumToneDifference;
}

function luminance(color: Rgb): number {
  return (color[0] + color[1] + color[2]) / 3;
}

function isUniformAlternatingGrid(
  png: PNG,
  originX: number,
  originY: number,
  blockSize: number,
  first: Rgb,
  second: Rgb,
): boolean {
  for (let gridY = 0; gridY < gridSize; gridY += 1) {
    for (let gridX = 0; gridX < gridSize; gridX += 1) {
      const expected = (gridX + gridY) % 2 === 0 ? first : second;
      for (let y = 0; y < blockSize; y += 1) {
        for (let x = 0; x < blockSize; x += 1) {
          const offset = (
            (originY + gridY * blockSize + y) * png.width +
            originX + gridX * blockSize + x
          ) * 4;
          if (
            png.data[offset + 3] !== 255 ||
            Math.abs(png.data[offset] - expected[0]) > uniformChannelTolerance ||
            Math.abs(png.data[offset + 1] - expected[1]) > uniformChannelTolerance ||
            Math.abs(png.data[offset + 2] - expected[2]) > uniformChannelTolerance
          ) {
            return false;
          }
        }
      }
    }
  }
  return true;
}
