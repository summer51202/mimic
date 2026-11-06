import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(process.cwd(), "..");
const reviewDirectory = path.join(
  repositoryRoot,
  "docs/design/assets/reviews/2026-09-18-page-visual-phase-1",
);
const manifestPath = path.join(reviewDirectory, "avatar-classes.manifest.json");
const reviewPath = path.join(reviewDirectory, "avatar-classes-review.html");

const expectedIds = [
  "warrior",
  "mage",
  "ranger",
  "rogue",
  "physician",
  "bard",
  "alchemist",
  "cartographer",
] as const;

interface RasterRecord {
  path: string;
  width: number;
  height: number;
  sha256: string;
  transparentBackground: boolean;
}

interface CharacterRecord {
  id: (typeof expectedIds)[number];
  label: string;
  role: string;
  reference: RasterRecord;
  source: RasterRecord & { lineage: "imagegen-transparent-edit" };
  master: RasterRecord & {
    normalization: "nearest-contain-alpha-clean-v1";
  };
  optical128: RasterRecord & {
    normalization: "nearest-neighbor-optical-v1";
  };
  optical64: RasterRecord & {
    normalization: "nearest-neighbor-optical-v1";
  };
}

interface Manifest {
  approvedOn: string;
  decision: string;
  reviewOnly: boolean;
  runtimePromotion: boolean;
  masterSize: number;
  opticalSizes: number[];
  characters: CharacterRecord[];
  sheet: RasterRecord;
}

describe("Avatar / Classes calibration", () => {
  it("publishes the fixed review-only roster with clean deterministic rasters", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;

    expect(manifest).toMatchObject({
      approvedOn: "2026-10-04",
      decision: "approved",
      reviewOnly: true,
      runtimePromotion: false,
      masterSize: 512,
      opticalSizes: [128, 64],
    });
    expect(manifest.characters.map(({ id }) => id)).toEqual(expectedIds);
    expect(manifest.characters).toHaveLength(8);

    const masterHashes = new Set<string>();
    for (const character of manifest.characters) {
      expect(character.reference.path.replaceAll("\\", "/")).toMatch(
        /^docs\/design\/assets\/reviews\/2026-09-18-page-visual-phase-1\/samples\/derivations\/avatar-classes\/references\//,
      );
      expect(character.source).toMatchObject({
        lineage: "imagegen-transparent-edit",
        transparentBackground: true,
      });
      expect(character.source.path.replaceAll("\\", "/")).toMatch(
        /^docs\/design\/assets\/reviews\/2026-09-18-page-visual-phase-1\/samples\/derivations\/avatar-classes\/sources\//,
      );
      expect(character.master).toMatchObject({
        width: 512,
        height: 512,
        transparentBackground: true,
        normalization: "nearest-contain-alpha-clean-v1",
      });
      expect(character.optical128).toMatchObject({
        width: 128,
        height: 128,
        transparentBackground: true,
        normalization: "nearest-neighbor-optical-v1",
      });
      expect(character.optical64).toMatchObject({
        width: 64,
        height: 64,
        transparentBackground: true,
        normalization: "nearest-neighbor-optical-v1",
      });

      const reference = await verifyRaster(character.reference);
      expect(reference.width).toBeGreaterThan(0);
      expect(reference.height).toBeGreaterThan(0);

      const source = await verifyRaster(character.source);
      expect(source.width).toBe(source.height);
      expect(source.width).toBeGreaterThanOrEqual(1024);
      expect(hasTransparentPixel(source)).toBe(true);
      expect(hasNonzeroTransparentPixel(source)).toBe(false);

      for (const raster of [
        character.master,
        character.optical128,
        character.optical64,
      ]) {
        const png = await verifyRaster(raster);
        expect(hasTransparentPixel(png)).toBe(true);
        expect(hasNonzeroTransparentPixel(png)).toBe(false);
      }

      expect(masterHashes.has(character.master.sha256)).toBe(false);
      masterHashes.add(character.master.sha256);
    }

    expect(manifest.sheet).toMatchObject({
      width: 2048,
      height: 1024,
      transparentBackground: true,
    });
    const sheet = await verifyRaster(manifest.sheet);
    expect(hasTransparentPixel(sheet)).toBe(true);
    expect(hasNonzeroTransparentPixel(sheet)).toBe(false);
  });

  it("shows family, identity, optical, hash, and review-boundary evidence", async () => {
    const html = await readFile(reviewPath, "utf8");

    for (const id of expectedIds) {
      expect(html).toContain(`data-character="${id}"`);
      expect(html).toContain(`data-reference="${id}"`);
      expect(html).toContain(`data-master="${id}"`);
      expect(html).toContain(`data-lineage-master="${id}"`);
      expect(html).toContain(`data-reference-filename="${id}"`);
    }
    expect(html.match(/data-optical-size="128"/g)).toHaveLength(8);
    expect(html.match(/data-optical-size="64"/g)).toHaveLength(8);
    expect(html.match(/data-grayscale-preview/g)).toHaveLength(8);
    expect(html.match(/data-silhouette-preview/g)).toHaveLength(8);
    expect(html).toContain("Exact master SHA-256");
    expect(html).toContain("Live role labels");
    expect(html).toContain("2.25-head");
    expect(html).toContain("Portrait controls identity");
    expect(html).toContain("Full body controls pose and silhouette");
    expect(html).toContain("Warrior family anchor");
    expect(html).toContain("approved visual calibration");
    expect(html).toContain("no runtime asset changes");
  });
});

async function verifyRaster(record: RasterRecord): Promise<PNG> {
  const bytes = await readFile(path.resolve(repositoryRoot, record.path));
  const png = PNG.sync.read(bytes);
  expect([png.width, png.height]).toEqual([record.width, record.height]);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256);
  return png;
}

function hasTransparentPixel(png: PNG): boolean {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] < 255) return true;
  }
  return false;
}

function hasNonzeroTransparentPixel(png: PNG): boolean {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (
      png.data[offset + 3] === 0 &&
      (png.data[offset] !== 0 ||
        png.data[offset + 1] !== 0 ||
        png.data[offset + 2] !== 0)
    ) return true;
  }
  return false;
}
