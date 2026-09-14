import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

import { pixelUiFiles } from "./pixel-ui-assets";
import { inspectPng } from "./png-inspection";

const pngSignature = "89504e470d0a1a0a";

const assets = [
  ["mimiku-master.png", 1024, 1024],
  ["mimiku-hero.png", 1672, 941],
  ["mimiku-states.png", 3072, 512],
  ["mimiku-model-sheet.png", 1536, 1024],
] as const;

const transparentCharacterAssets = Object.values(pixelUiFiles.characters);

const transparentCharacterConsumers = [
  "src/features/auth/auth-form.tsx",
  "src/app/(public)/features/page.tsx",
  "src/app/offline/page.tsx",
  "src/features/invitations/invite-create-panel.tsx",
  "src/features/invitations/invite-accept-panel.tsx",
  "src/shared/ui/app-route-state.tsx",
] as const;

it.each(assets)("ships %s as a valid %ix%i PNG", async (file, width, height) => {
  const image = await readFile(path.join(process.cwd(), "public/brand", file));

  expect(image.subarray(0, 8).toString("hex")).toBe(pngSignature);
  expect(image.readUInt32BE(16)).toBe(width);
  expect(image.readUInt32BE(20)).toBe(height);
});

it.each(transparentCharacterAssets)(
  "ships %s with a transparent exterior and no connected neutral matte",
  async (publicPath) => {
    const inspection = await inspectPng(
      path.join(process.cwd(), "public", publicPath),
    );

    expect(inspection).toMatchObject({
      exteriorCornerTransparent: true,
      connectedNeutralPixels: 0,
      hasTransparentPixel: true,
    });
  },
);

it.each(transparentCharacterConsumers)(
  "loads transparent character art without Next Image resampling in %s",
  async (sourcePath) => {
    const source = await readFile(path.join(process.cwd(), sourcePath), "utf8");
    const imageBlocks = source.match(/<Image[\s\S]*?\/>/g) ?? [];
    const characterImages = imageBlocks.filter((image) =>
      /mimiku|Mimiku|pixelUi(?:Files|Roles)/.test(image),
    );

    expect(characterImages.length).toBeGreaterThan(0);
    expect(characterImages.every((image) => /\bunoptimized\b/.test(image))).toBe(
      true,
    );
  },
);
