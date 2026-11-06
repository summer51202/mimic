import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const review = path.join(root, "docs/design/assets/reviews/2026-09-18-page-visual-phase-1");

interface Asset {
  path: string;
  sha256: string;
  width: number;
  height: number;
}

interface Manifest {
  decision: string;
  reviewOnly: boolean;
  runtimePromotion: boolean;
  sources: Record<string, Asset>;
  references: Record<string, Asset>;
  uiAssets: { wordmark: Asset };
  derivedLayers: Record<"desktop" | "phone", Asset[]>;
  outputs: { desktop: Asset; phone: Asset };
  wordmarkPlacement: Record<"desktop" | "phone", [number, number, number]>;
  wordmarkWallSpan: Record<"desktop" | "phone", [number, number]>;
  wordmarkAttachment: string;
  wordmarkSurface: Record<"desktop" | "phone", [number, number, number, number]>;
  placements: Record<"desktop" | "phone", { id: string; x: number; y: number; width: number; height: number }[]>;
}

describe("Landing war room review", () => {
  it("keeps the warming warrior out of the actual flame and stone-ring pixels", async () => {
    const manifest = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8")) as Manifest;
    for (const view of ["desktop", "phone"] as const) {
      const warrior = manifest.placements[view].find(({ id }) => id === "warrior")!;
      const fire = manifest.placements[view].find(({ id }) => id === "fire")!;
      const warriorLayer = manifest.derivedLayers[view].find((asset) => asset.path.endsWith("/warrior.png"))!;
      const fireLayer = manifest.derivedLayers[view].find((asset) => asset.path.endsWith("/fire.png"))!;
      const warriorPng = PNG.sync.read(await readFile(path.join(root, warriorLayer.path)));
      const firePng = PNG.sync.read(await readFile(path.join(root, fireLayer.path)));
      let overlap = 0;
      for (let y = 0; y < warriorPng.height; y++) {
        for (let x = 0; x < warriorPng.width; x++) {
          const fx = warrior.x + x - fire.x, fy = warrior.y + y - fire.y;
          if (fx < 0 || fy < 0 || fx >= firePng.width || fy >= firePng.height) continue;
          if (warriorPng.data[(y * warriorPng.width + x) * 4 + 3] && firePng.data[(fy * firePng.width + fx) * 4 + 3]) overlap++;
        }
      }
      expect(overlap).toBe(0);
    }
  });

  it("uses revised role poses with the warrior nearer the fire than the map-reading mage", async () => {
    const manifest = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8")) as Manifest;
    expect(manifest.sources.warrior.path).toContain("warrior-warming-v02-source.png");
    expect(manifest.sources.mage.path).toContain("mage-map-study-v02-source.png");
    for (const view of ["desktop", "phone"] as const) {
      const warrior = manifest.placements[view].find(({ id }) => id === "warrior")!;
      const mage = manifest.placements[view].find(({ id }) => id === "mage")!;
      const fire = manifest.placements[view].find(({ id }) => id === "fire")!;
      const distance = (item: typeof warrior) => Math.hypot(item.x + item.width / 2 - fire.x - fire.width / 2, item.y + item.height / 2 - fire.y - fire.height / 2);
      expect(warrior.x).toBeGreaterThan(mage.x);
      expect(distance(warrior)).toBeLessThan(distance(mage));
      expect(warrior.y + warrior.height).toBeLessThan(view === "desktop" ? 420 : 432);
    }
  });

  it("places the map crate upper-left of the fire and near the seated left party", async () => {
    const manifest = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8")) as Manifest;
    for (const view of ["desktop", "phone"] as const) {
      const crate = manifest.placements[view].find(({ id }) => id === "mapCrate")!;
      const fire = manifest.placements[view].find(({ id }) => id === "fire")!;
      const mage = manifest.placements[view].find(({ id }) => id === "mage")!;
      expect(crate.x + crate.width / 2).toBeLessThan(fire.x + fire.width / 2);
      expect(crate.y + crate.height / 2).toBeLessThan(fire.y + fire.height / 2);
      expect(crate.x).toBeGreaterThan(mage.x);
      expect(crate.x).toBeLessThan(mage.x + mage.width);
      // Preserve faces/upper bodies while allowing a foreground prop by their feet.
      expect(crate.y).toBeGreaterThan(mage.y + mage.height * 0.6);
    }
  });

  it("enlarges the angled map crate by 20 percent without fire or warrior occlusion", async () => {
    const manifest = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8")) as Manifest;
    expect(manifest.sources.mapCrate.path).toContain("map-crate-angle-v02-source.png");
    for (const view of ["desktop", "phone"] as const) {
      const crate = manifest.placements[view].find(({ id }) => id === "mapCrate")!;
      const fire = manifest.placements[view].find(({ id }) => id === "fire")!;
      expect(crate.width).toBe(Math.round((view === "desktop" ? 94 : 66) * 1.2));
      expect(crate.x + crate.width / 2).toBeLessThan(fire.x + fire.width / 2);
      const layer = manifest.derivedLayers[view].find((asset) => asset.path.endsWith("/mapCrate.png"))!;
      const fireLayer = manifest.derivedLayers[view].find((asset) => asset.path.endsWith("/fire.png"))!;
      const mapPng = PNG.sync.read(await readFile(path.join(root, layer.path)));
      const firePng = PNG.sync.read(await readFile(path.join(root, fireLayer.path)));
      let overlap = 0;
      for (let y = 0; y < mapPng.height; y++) {
        for (let x = 0; x < mapPng.width; x++) {
          const fx = crate.x + x - fire.x, fy = crate.y + y - fire.y;
          if (fx < 0 || fy < 0 || fx >= firePng.width || fy >= firePng.height) continue;
          if (mapPng.data[(y * mapPng.width + x) * 4 + 3] && firePng.data[(fy * firePng.width + fx) * 4 + 3]) overlap++;
        }
      }
      expect(overlap).toBe(0);
      const warrior = manifest.placements[view].find(({ id }) => id === "warrior")!;
      const warriorLayer = manifest.derivedLayers[view].find((asset) => asset.path.endsWith("/warrior.png"))!;
      const warriorPng = PNG.sync.read(await readFile(path.join(root, warriorLayer.path)));
      let warriorOverlap = 0;
      for (let y = 0; y < mapPng.height; y++) {
        for (let x = 0; x < mapPng.width; x++) {
          const wx = crate.x + x - warrior.x, wy = crate.y + y - warrior.y;
          if (wx < 0 || wy < 0 || wx >= warriorPng.width || wy >= warriorPng.height) continue;
          if (mapPng.data[(y * mapPng.width + x) * 4 + 3] && warriorPng.data[(wy * warriorPng.width + wx) * 4 + 3]) warriorOverlap++;
        }
      }
      expect(warriorOverlap).toBe(0);
      expect(crate.y + crate.height).toBeLessThan(view === "desktop" ? 420 : 432);
    }
    expect(manifest.sources.fire.sha256).toBe("c520756878800221720d79b350adc148b04b7ea5b389cef765d13372a72377af");
  });

  it("keeps deterministic review rasters and source lineage without runtime promotion", async () => {
    const manifest = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8")) as Manifest;
    expect(manifest).toMatchObject({
      decision: "awaiting-calibration",
      reviewOnly: true,
      runtimePromotion: false,
    });
    expect(Object.keys(manifest.sources)).toEqual([
      "architecture", "warrior", "mage", "ranger", "mimiku", "fire", "mapCrate",
      "chest", "sign", "torchHigh", "torchLow", "bats", "carving", "pressurePlate",
    ]);
    expect(manifest.outputs.desktop).toMatchObject({ width: 1920, height: 1080 });
    expect(manifest.outputs.phone).toMatchObject({ width: 390, height: 600 });
    expect(manifest.uiAssets?.wordmark).toMatchObject({ width: 256 });
    for (const asset of [...Object.values(manifest.sources), ...Object.values(manifest.references), ...Object.values(manifest.outputs), ...Object.values(manifest.uiAssets)]) {
      expect(asset.path).toMatch(/^docs\/design\/assets\/reviews\/2026-09-18-page-visual-phase-1\//);
      const bytes = await readFile(path.join(root, asset.path));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
      const png = PNG.sync.read(bytes);
      expect([png.width, png.height]).toEqual([asset.width, asset.height]);
      if (Object.values(manifest.outputs).includes(asset)) {
        for (let i = 0; i < png.data.length; i += 4) {
          if (png.data[i + 3] === 0) expect([...png.data.subarray(i, i + 3)]).toEqual([0, 0, 0]);
        }
      }
    }
    expect(await readFile(path.join(review, "landing-war-room-review.html"), "utf8")).toContain("awaiting-calibration");
  });

  it("cleans actual transparent layer exports and uses exact 2x desktop pixels", async () => {
    const manifest = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8")) as Manifest;
    expect(manifest.derivedLayers).toBeDefined();
    expect(manifest.derivedLayers.desktop).toHaveLength(13);
    expect(manifest.derivedLayers.phone).toHaveLength(8);
    for (const asset of [...manifest.derivedLayers.desktop, ...manifest.derivedLayers.phone, manifest.uiAssets.wordmark]) {
      const bytes = await readFile(path.join(root, asset.path));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
      const png = PNG.sync.read(bytes);
      expect([png.width, png.height]).toEqual([asset.width, asset.height]);
      let transparent = 0;
      let dirty = 0;
      for (let i = 0; i < png.data.length; i += 4) {
        if (png.data[i + 3] === 0) {
          transparent++;
          if (png.data[i] || png.data[i + 1] || png.data[i + 2]) dirty++;
        }
      }
      expect(transparent).toBeGreaterThan(0);
      expect(dirty).toBe(0);
    }
    const desktop = PNG.sync.read(await readFile(path.join(root, manifest.outputs.desktop.path)));
    let mismatches = 0;
    for (let y = 0; y < desktop.height; y += 2) {
      for (let x = 0; x < desktop.width; x += 2) {
        const i = (y * desktop.width + x) * 4;
        for (const offset of [4, desktop.width * 4, desktop.width * 4 + 4]) {
          if (!desktop.data.subarray(i, i + 4).equals(desktop.data.subarray(i + offset, i + offset + 4))) mismatches++;
        }
      }
    }
    expect(mismatches).toBe(0);
  });

  it("flush-mounts the 20-percent-smaller approved wordmark within one rock face", async () => {
    const manifest = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8")) as Manifest;
    expect(manifest.wordmarkPlacement).toBeDefined();
    expect(manifest.wordmarkAttachment).toBe("flush-mounted-on-continuous-rock-face");
    for (const view of ["desktop", "phone"] as const) {
      const [x, y, width] = manifest.wordmarkPlacement[view];
      expect(manifest.wordmarkWallSpan).toBeDefined();
      const [wallLeft, wallRight] = manifest.wordmarkWallSpan[view];
      expect(width / (view === "desktop" ? 360 : 260)).toBeCloseTo(0.8, 5);
      expect(width / (wallRight - wallLeft)).toBeCloseTo(8 / 15, 2);
      expect(x).toBeGreaterThanOrEqual(wallLeft);
      expect(x + width).toBeLessThanOrEqual(wallRight);
      const height = width * manifest.uiAssets.wordmark.height / manifest.uiAssets.wordmark.width;
      expect(manifest.placements[view].some(({ id }) => id === "wordmarkMount")).toBe(false);
      const [faceX, faceY, faceWidth, faceHeight] = manifest.wordmarkSurface[view];
      expect(Math.abs(x + width / 2 - (faceX + faceWidth / 2))).toBeLessThanOrEqual(1);
      const verticalCenter = (y + height / 2 - faceY) / faceHeight;
      expect(verticalCenter).toBeGreaterThanOrEqual(0.3);
      expect(verticalCenter).toBeLessThanOrEqual(0.4);
      expect(x).toBeGreaterThanOrEqual(faceX + 8);
      expect(y).toBeGreaterThanOrEqual(faceY + 8);
      expect(x + width).toBeLessThanOrEqual(faceX + faceWidth - 8);
      expect(y + height).toBeLessThanOrEqual(faceY + faceHeight - 8);
      const bats = manifest.placements[view].find(({ id }) => id === "bats")!;
      expect(x + width + 8 <= bats.x || x >= bats.x + bats.width + 8 || y + height + 8 <= bats.y || y >= bats.y + bats.height + 8).toBe(true);
      for (const figure of manifest.placements[view].filter(({ id }) => ["warrior", "mage", "ranger", "mimiku", "fire"].includes(id))) {
        expect(y + height + 8).toBeLessThan(figure.y);
      }
    }
    // The wordmark itself must remain the approved derivative, not new generated lettering.
    expect(manifest.uiAssets.wordmark.sha256).toBe("5a1cfc2a7d96c15a467c8fa2f3c869d23a3811a096edd121a76a9f952b59760c");
  });
});
