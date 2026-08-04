import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { pixelUiAssetPolicy, pixelUiAssets } from "./pixel-ui-assets";
import { inspectPng } from "./png-inspection";

const pngSignature = "89504e470d0a1a0a";

const expectedDimensions = new Map<string, readonly [number, number]>([
  ["mimiku-dashboard.png", [512, 512]],
  ["mimiku-empty-group.png", [512, 512]],
  ["mimiku-empty-fund.png", [512, 512]],
  ["mimiku-invite.png", [512, 512]],
  ["mimiku-success.png", [512, 512]],
  ["mimiku-serious.png", [512, 512]],
  ["treasury-mobile.png", [512, 1024]],
  ["treasury-desktop.png", [1024, 620]],
  ["avatar-01.png", [96, 96]],
  ["avatar-02.png", [96, 96]],
  ["avatar-03.png", [96, 96]],
  ["avatar-04.png", [96, 96]],
  ["icons-ui.png", [1536, 1024]],
  ["frames-ui.png", [256, 166]],
]);

describe("pixelUiAssets", () => {
  it("exposes stable public paths for Mimiku and avatars", () => {
    expect(pixelUiAssets.mimiku.dashboard).toBe(
      "/pixel-ui/mimiku-dashboard.png",
    );
    expect(pixelUiAssets.avatars).toHaveLength(4);
    expect(pixelUiAssets.avatars).toEqual([
      "/pixel-ui/avatar-01.png",
      "/pixel-ui/avatar-02.png",
      "/pixel-ui/avatar-03.png",
      "/pixel-ui/avatar-04.png",
    ]);
  });

  it("keeps source sheets out of the first-screen runtime policy", () => {
    expect(pixelUiAssetPolicy.sourceSheets).toEqual([
      "/pixel-ui/icons-ui.png",
      "/pixel-ui/frames-ui.png",
    ]);
    expect(pixelUiAssetPolicy.runtimeFirstScreen).not.toContain(
      "/pixel-ui/icons-ui.png",
    );
    expect(pixelUiAssetPolicy.runtimeFirstScreen).not.toContain(
      "/pixel-ui/frames-ui.png",
    );
  });

  it.each([...allPixelUiPaths()])(
    "ships %s as the expected PNG under public",
    async (publicPath) => {
      const filename = path.basename(publicPath);
      const dimensions = expectedDimensions.get(filename);

      expect(dimensions).toBeDefined();

      const image = await readFile(
        path.join(process.cwd(), "public", publicPath),
      );

      expect(image.subarray(0, 8).toString("hex")).toBe(pngSignature);
      expect(image.readUInt32BE(16)).toBe(dimensions?.[0]);
      expect(image.readUInt32BE(20)).toBe(dimensions?.[1]);
    },
  );

  it.each(pixelUiAssets.avatars)(
    "exports %s as clean transparent 2x avatar art",
    async (publicPath) => {
      const inspection = await inspectPng(publicFile(publicPath));

      expect(inspection).toMatchObject({
        width: 96,
        height: 96,
        channels: 4,
        hasTransparentPixel: true,
        connectedNeutralPixels: 0,
        opaqueNeutralCheckerPixels: 0,
      });
    },
  );

  it("exports a clean transparent frame without resampling", async () => {
    const inspection = await inspectPng(publicFile(pixelUiAssets.sheets.frames));

    expect(inspection).toMatchObject({
      width: 256,
      height: 166,
      channels: 4,
      exteriorCornerTransparent: true,
      connectedNeutralPixels: 0,
      opaqueNeutralCheckerPixels: 0,
    });
  });

  it("preserves the root icon byte-for-byte", async () => {
    const icon = await readFile(path.join(process.cwd(), "..", "icon.png"));

    expect(createHash("sha256").update(icon).digest("hex")).toBe(
      "f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac",
    );
  });
});

function publicFile(publicPath: string): string {
  return path.join(process.cwd(), "public", publicPath);
}

function* allPixelUiPaths(): Generator<string> {
  yield* Object.values(pixelUiAssets.mimiku);
  yield* Object.values(pixelUiAssets.scenes);
  yield* pixelUiAssets.avatars;
  yield* Object.values(pixelUiAssets.sheets);
}
