import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

import { pixelUiFiles } from "./pixel-ui-assets";
import { inspectPng } from "./png-inspection";

const pngSignature = "89504e470d0a1a0a";

const assets = [["mimiku-hero.png", 1672, 941]] as const;

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

it.each([
  ["mimiku/mimiku-master.png", 1024, 1024, "f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac"],
  ["mimiku/mimiku-model-sheet.png", 1536, 1024, "ce5a64f0109db010c87d3a4e3c0c5b90d4d818589394094541d145d38a383120"],
  ["mimiku/mimiku-states.png", 3072, 512, "3daaf12b2ec91f5e7bebdd515c3da0b0e462d2c6c956233f5c22910d8add54a2"],
  ["pixel-ui/icons-ui.png", 1536, 1024, "c8a4cd0a1523a9daab32d778f1c8226a3199dda0b20bd5f16d8f6e795e224bb4"],
] as const)("keeps source asset %s outside public", async (file, width, height, sha256) => {
  const image = await readFile(
    path.join(process.cwd(), "..", "docs", "design", "assets", "sources", file),
  );

  expect(image.subarray(0, 8).toString("hex")).toBe(pngSignature);
  expect(image.readUInt32BE(16)).toBe(width);
  expect(image.readUInt32BE(20)).toBe(height);
  expect(createHash("sha256").update(image).digest("hex")).toBe(sha256);
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
