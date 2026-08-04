import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { findBakedTransparencyChecker } from "./checker-pattern";

describe("findBakedTransparencyChecker", () => {
  it.each([8, 16])("detects a 3x3 neutral checker with %ipx blocks", (blockSize) => {
    const png = makePng(blockSize * 3, blockSize * 3, (x, y) => {
      const light = (Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2 === 0;
      return light ? [238, 238, 238] : [204, 204, 204];
    });

    expect(findBakedTransparencyChecker(PNG.sync.write(png))).toEqual({
      blockSize,
      x: 0,
      y: 0,
    });
  });

  it("rejects a large uniform neutral surface", () => {
    const png = makePng(64, 64, () => [238, 238, 238]);
    expect(findBakedTransparencyChecker(PNG.sync.write(png))).toBeNull();
  });

  it("rejects an alternating colored pixel-art grid", () => {
    const png = makePng(48, 48, (x, y) => {
      const first = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
      return first ? [36, 82, 140] : [244, 194, 62];
    });
    expect(findBakedTransparencyChecker(PNG.sync.write(png))).toBeNull();
  });

  it("rejects two adjacent neutral pixels without repeated square blocks", () => {
    const png = makePng(32, 32, (x) => x < 16 ? [238, 238, 238] : [204, 204, 204]);
    expect(findBakedTransparencyChecker(PNG.sync.write(png))).toBeNull();
  });

  it("detects a checker with mild within-block channel variation", () => {
    const blockSize = 8;
    const png = makePng(24, 24, (x, y) => {
      const light = (Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2 === 0;
      const variation = (x + y) % 3;
      const tone = (light ? 238 : 204) + variation;
      return [tone, tone, tone];
    });
    expect(findBakedTransparencyChecker(PNG.sync.write(png))).toEqual({ blockSize, x: 0, y: 0 });
  });

  it("rejects a partial 2x3 checker", () => {
    const png = makePng(24, 16, (x, y) => {
      const light = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
      return light ? [238, 238, 238] : [204, 204, 204];
    });
    expect(findBakedTransparencyChecker(PNG.sync.write(png))).toBeNull();
  });

  it("rejects an unsupported 12px rescale instead of matching incidental pixels", () => {
    const png = makePng(36, 36, (x, y) => {
      const light = (Math.floor(x / 12) + Math.floor(y / 12)) % 2 === 0;
      return light ? [238, 238, 238] : [204, 204, 204];
    });
    expect(findBakedTransparencyChecker(PNG.sync.write(png))).toBeNull();
  });
});

function makePng(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number],
): PNG {
  const png = new PNG({ height, width });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue] = colorAt(x, y);
      png.data[offset] = red;
      png.data[offset + 1] = green;
      png.data[offset + 2] = blue;
      png.data[offset + 3] = 255;
    }
  }
  return png;
}
