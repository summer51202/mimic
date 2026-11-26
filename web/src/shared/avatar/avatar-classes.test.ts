/* @vitest-environment node */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import layout from "../../../public/pixel-ui/v1/scenes/home/layout.json";
import { avatarClassFieldSchema, avatarClasses, avatarFullBounds, avatarFullSize } from "./avatar-classes";

function opaqueBounds(png: PNG) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

describe("avatar classes", () => {
  it("matches the approved Home slots exactly", () => {
    for (const variant of ["desktop", "phone"] as const) {
      expect(Object.keys(layout[variant].avatarSlots).sort()).toEqual([...avatarClasses].sort());
      for (const avatarClass of avatarClasses) {
        expect(layout[variant].avatarSlots[avatarClass].asset_id).toBe(`avatars/${avatarClass}-full.png`);
      }
    }
  });

  it.each(avatarClasses)("records the promoted %s master's opaque bounds", async (avatarClass) => {
    const directory = path.resolve("public/pixel-ui/v1/avatars");
    const png = PNG.sync.read(await readFile(path.join(directory, `${avatarClass}-full.png`)));
    expect([png.width, png.height]).toEqual([avatarFullSize, avatarFullSize]);
    expect(opaqueBounds(png)).toEqual(avatarFullBounds[avatarClass]);
    const portrait = PNG.sync.read(await readFile(path.join(directory, `${avatarClass}-portrait.png`)));
    expect([portrait.width, portrait.height]).toEqual([96, 96]);
  });

  it("keeps a missing field distinct from not chosen", () => {
    expect(avatarClassFieldSchema.parse(undefined)).toBeUndefined();
    expect(avatarClassFieldSchema.parse(null)).toBeNull();
    expect(avatarClassFieldSchema.parse("bard")).toBe("bard");
    expect(avatarClassFieldSchema.parse("knight")).toBeNull();
  });
});
