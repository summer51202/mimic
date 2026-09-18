import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

const reviewManifestPath = path.resolve(
  process.cwd(),
  "..",
  "docs",
  "design",
  "assets",
  "reviews",
  "2026-09-18-page-visual-phase-1",
  "review-manifest.json",
);

const expectedFamilyIds = [
  "wordmark",
  "icons",
  "mimiku-states",
  "avatar-classes",
  "scenes",
  "frames",
  "props",
  "motion",
] as const;

const rasterFamiliesUnderReview = [
  "wordmark",
  "icons",
  "mimiku-states",
  "avatar-classes",
] as const;
const pngSignature = "89504e470d0a1a0a";

interface ReviewFamily {
  id: string;
  consumers: string[];
  live_html_boundaries: string[];
  fallback: string;
  accessibility: string;
  sample: {
    path: string;
    width: number;
    height: number;
    alpha: boolean | null;
    sha256: string | null;
  };
  decision: string;
}

interface ReviewManifest {
  baseline_commit: string;
  families: ReviewFamily[];
}

describe("page visual asset style gate", () => {
  it("locks the eight-family review manifest outside runtime assets", async () => {
    const manifest = JSON.parse(
      await readFile(reviewManifestPath, "utf8"),
    ) as ReviewManifest;

    expect(manifest.baseline_commit).toBe("a157a83");
    expect(manifest.families.map(({ id }) => id)).toEqual(expectedFamilyIds);

    for (const family of manifest.families) {
      expect(family.consumers.length, `${family.id} consumers`).toBeGreaterThan(0);
      expect(
        family.live_html_boundaries.length,
        `${family.id} live HTML boundaries`,
      ).toBeGreaterThan(0);
      expect(family.fallback.trim(), `${family.id} fallback`).not.toBe("");
      expect(family.accessibility.trim(), `${family.id} accessibility`).not.toBe("");
      expect(family.sample.path.trim(), `${family.id} sample path`).not.toBe("");
      expect(family.sample.path.replaceAll("\\", "/")).not.toMatch(
        /^web\/public\//,
      );
      expect(family.decision).toBe("awaiting-calibration");
    }
  });

  it.each(rasterFamiliesUnderReview)(
    "validates the %s calibration PNG",
    async (familyId) => {
      const manifest = JSON.parse(
        await readFile(reviewManifestPath, "utf8"),
      ) as ReviewManifest;
      const family = manifest.families.find(({ id }) => id === familyId);

      expect(family, `${familyId} manifest record`).toBeDefined();

      const samplePath = path.resolve(process.cwd(), "..", family!.sample.path);
      const image = await readFile(samplePath);
      const png = PNG.sync.read(image);

      expect(image.subarray(0, 8).toString("hex")).toBe(pngSignature);
      expect(png.width).toBe(family!.sample.width);
      expect(png.height).toBe(family!.sample.height);
      expect(
        hasTransparentPixel(png),
        `${familyId} transparency expectation`,
      ).toBe(family!.sample.alpha);
      expect(family!.sample.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(createHash("sha256").update(image).digest("hex")).toBe(
        family!.sample.sha256,
      );
    },
  );
});

function hasTransparentPixel(png: PNG): boolean {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] < 255) return true;
  }
  return false;
}
