import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

import { pixelUiFiles } from "./pixel-ui-assets";
import { inspectPng } from "./png-inspection";
import manifest from "../../../../docs/design/assets/approved/page-visual-v1/production-asset-manifest.json";
import homeLayout from "../../../../docs/design/assets/approved/page-visual-v1/scenes/home/layout.json";
import { landingScene } from "./landing-scene";

const pngSignature = "89504e470d0a1a0a";

const assets = [["mimiku-hero.png", 1672, 941]] as const;

it("ships exactly the approved Phase 2A–2E-1 consumers with their SHA-256 values", async () => {
  const runtime = "web/public/pixel-ui/v1";
  const directory = path.resolve(process.cwd(), "../", runtime);
  const expected = new Set([
    "frames/frame-dialogue.png",
    ...Object.values(landingScene).flatMap(({ architecture, layers }) =>
      [architecture, ...layers].map(({ asset_id }) => asset_id),
    ),
  ]);
  expect(expected.size).toBe(28);
  const phase2b = new Set(Object.entries(landingScene).flatMap(([variant, scene]) => [
    `motion/campfire-${variant}.png`,
    ...scene.layers.flatMap((layer) => "variants" in layer && layer.variants
      ? Object.values(layer.variants).map(({ asset_id }) => asset_id).filter((asset) => !expected.has(asset))
      : []),
  ]));
  expect(phase2b.size).toBe(18);
  const phase2c = Object.entries(homeLayout).flatMap(([variant, scene]) => [
    scene.architecture.asset_id,
    ...scene.layers.map(({ asset_id }) => asset_id).filter((asset) => !expected.has(asset)),
    `motion/mimiku-idle-${variant}.png`,
    `motion/mimiku-record-ledger-${variant}.png`,
  ]);
  expect(phase2c).toHaveLength(10);
  const home = manifest.assets.filter(({ disposition }) => disposition === "promoted-phase-2c");
  expect(home.map(({ path }) => path).sort()).toEqual(phase2c.sort());
  const added = manifest.assets.filter(({ disposition }) => disposition === "promoted-phase-2b");
  expect(added.map(({ path }) => path).sort()).toEqual([...phase2b].sort());
  const promoted = manifest.assets.filter(({ disposition }) => disposition === "promoted-phase-2a");
  expect(promoted.map(({ path }) => path).sort()).toEqual([...expected].sort());
  const phase2d = [
    ...["nav-home", "nav-adventure-log", "nav-guild", "nav-tasks", "nav-settings", "action-record-expense"]
      .map((name) => `icons/ui/${name}.png`),
    ...["favicon-16", "favicon-32", "icon-192", "icon-512", "icon-maskable-192", "icon-maskable-512"]
      .map((name) => `icons/install/${name}.png`),
  ];
  const icons = manifest.assets.filter(({ disposition }) => disposition === "promoted-phase-2d");
  expect(icons.map(({ path }) => path).sort()).toEqual(phase2d.sort());
  const phase2e1 = [
    "frames/frames.json",
    "motion/motion-timing.json",
    "scenes/home/layout.json",
    "scenes/landing/layout.json",
  ];
  const configs = manifest.assets.filter(({ disposition }) => disposition === "promoted-phase-2e1");
  expect(configs.map(({ path }) => path).sort()).toEqual(phase2e1);
  const files = (await readdir(directory, { recursive: true, withFileTypes: true }))
    .filter((entry) => !entry.isDirectory())
    .map((entry) => path.relative(directory, path.join(entry.parentPath, entry.name)).replaceAll("\\", "/"));
  expect(files.sort()).toEqual([...expected, ...phase2b, ...phase2c, ...phase2d, ...phase2e1].sort());

  for (const asset of [...promoted, ...added, ...home, ...icons, ...configs]) {
    expect(asset.runtime_target).toBe(`${runtime}/${asset.path}`);
    const bytes = await readFile(path.join(directory, asset.path));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
  }
});

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
