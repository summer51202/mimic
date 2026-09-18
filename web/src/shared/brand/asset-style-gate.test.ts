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
const reviewIndexPath = path.resolve(
  path.dirname(reviewManifestPath),
  "review-index.html",
);
const assetLineageAuditPath = path.resolve(
  path.dirname(reviewManifestPath),
  "asset-lineage-audit.md",
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
  "scenes",
  "frames",
  "props",
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
      expect(family.decision).toBe(
        family.id === "mimiku-states"
          ? "rejected/superseded"
          : "awaiting-calibration",
      );
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

  it("defines the accessible motion and reduced-motion calibration contract", async () => {
    const manifest = JSON.parse(
      await readFile(reviewManifestPath, "utf8"),
    ) as ReviewManifest;
    const motion = manifest.families.find(({ id }) => id === "motion");

    expect(motion).toBeDefined();

    const samplePath = path.resolve(process.cwd(), "..", motion!.sample.path);
    const sample = await readFile(samplePath);
    const html = sample.toString("utf8");

    expect(motion!.sample.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash("sha256").update(sample).digest("hex")).toBe(
      motion!.sample.sha256,
    );

    for (const example of [
      "wordmark-glance",
      "base-idle",
      "action-once",
      "celebration-once",
      "typewriter-final",
    ]) {
      expect(html).toContain(`data-motion-example="${example}"`);
    }

    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).not.toMatch(/pointermove|mousemove|clientX|clientY/);
    expect(html).toMatch(
      /role="status"[^>]*data-accessible-dialogue[^>]*>[^<]+<\/[^>]+>/,
    );
  });

  it("assembles all families into the responsive live-caption review index", async () => {
    const manifest = JSON.parse(
      await readFile(reviewManifestPath, "utf8"),
    ) as ReviewManifest;
    const html = await readFile(reviewIndexPath, "utf8");

    for (const family of manifest.families) {
      expect(html, family.id).toContain(path.basename(family.sample.path));
      expect(html, `${family.id} section`).toContain(
        `data-family="${family.id}"`,
      );
    }

    expect(html.match(/<p data-live-caption>/g)).toHaveLength(8);
    expect(html).toContain('data-backdrop="navy"');
    expect(html).toContain('data-backdrop="parchment"');
    expect(html.match(/data-fallback/g)?.length).toBeGreaterThanOrEqual(8);
    expect(html).toContain("320");
    expect(html).toContain("390");
    expect(html).toContain("768");
    expect(html).toContain("1440");
  });

  it("records the canonical Mimiku lineage before recalibration", async () => {
    const audit = await readFile(assetLineageAuditPath, "utf8");
    const reviewIndex = await readFile(reviewIndexPath, "utf8");

    for (const source of [
      "docs/design/assets/sources/mimiku/mimiku-master.png",
      "docs/design/assets/sources/mimiku/mimiku-model-sheet.png",
      "docs/design/assets/sources/mimiku/mimiku-states.png",
      "web/public/brand/mimiku-hero.png",
      "web/public/pixel-ui/characters/mimiku-idle.png",
      "web/public/pixel-ui/characters/mimiku-happy.png",
      "web/public/pixel-ui/characters/mimiku-thinking.png",
      "web/public/pixel-ui/characters/mimiku-reminder.png",
      "web/public/pixel-ui/characters/mimiku-serious.png",
      "web/public/pixel-ui/characters/mimiku-lost.png",
    ]) {
      expect(audit).toContain(`\`${source}\``);
    }

    expect(audit).toContain("mimiku-states-calibration.png");
    expect(audit).toContain("rejected/superseded");
    expect(audit).toContain("reuse");
    expect(audit).toContain("derive");
    expect(audit).toContain("new");
    expect(reviewIndex).toContain('data-family="mimiku-states"');
    expect(reviewIndex).toContain("Rejected/superseded");
    expect(reviewIndex).toContain("[data-live-caption] a {");
    expect(reviewIndex).toContain("[data-live-caption] a:focus-visible {");
    expect(reviewIndex).toContain("Decisions are recorded per family");
    expect(reviewIndex).toContain("Mimiku superseded");
    expect(reviewIndex).not.toContain("no decision is recorded yet");
  });
});

function hasTransparentPixel(png: PNG): boolean {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] < 255) return true;
  }
  return false;
}
