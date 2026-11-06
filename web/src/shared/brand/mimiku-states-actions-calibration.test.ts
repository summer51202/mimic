import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

const reviewDirectory = path.resolve(
  process.cwd(),
  "..",
  "docs/design/assets/reviews/2026-09-18-page-visual-phase-1",
);
const manifestPath = path.join(reviewDirectory, "mimiku-states-actions.manifest.json");
const reviewPath = path.join(reviewDirectory, "mimiku-states-actions-review.html");

const expectedIds = [
  "state-idle",
  "state-working",
  "state-happy",
  "state-reminder",
  "state-serious",
  "state-concerned",
  "action-record-ledger-key",
  "action-adventure-complete-key",
] as const;

interface RasterRecord {
  path: string;
  width: number;
  height: number;
  sha256: string;
}

interface PoseRecord {
  id: string;
  role: "state" | "action-key";
  lineage: "canonical" | "imagegen-repair";
  source: {
    path: string;
    width: number;
    height: number;
    sha256: string;
    transparentBackground: boolean;
  };
  master: RasterRecord & {
    normalization: string;
    transparentBackground: boolean;
  };
}

describe("Mimiku states and actions calibration", () => {
  it("publishes the fixed eight-pose review-only lineage and deterministic rasters", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      approvedOn: string;
      decision: string;
      reviewOnly: boolean;
      runtimePromotion: boolean;
      poses: PoseRecord[];
      sheet: RasterRecord;
    };

    expect(manifest).toMatchObject({
      approvedOn: "2026-10-02",
      decision: "approved",
      reviewOnly: true,
      runtimePromotion: false,
    });
    expect(manifest.poses.map(({ id }) => id)).toEqual(expectedIds);
    expect(manifest.poses.filter(({ lineage }) => lineage === "canonical")).toHaveLength(4);
    expect(
      manifest.poses.filter(({ lineage }) => lineage === "imagegen-repair"),
    ).toHaveLength(4);

    const recordLedger = manifest.poses.find(
      ({ id }) => id === "action-record-ledger-key",
    );
    expect(recordLedger).toBeDefined();
    expect(recordLedger?.source).toMatchObject({
      path: "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/mimiku-states/action-record-ledger-key-v03-source.png",
      sha256: "d17ce8e5d127829ab4d38a4215f2480117080f56478618bda6e51f0ad0ef1c0f",
    });
    expect(recordLedger?.master.sha256).toBe(
      "3e6f930e511404840007c0fc86a2230524b021102adbbb1b29bf8e23b4eed948",
    );

    const hashes = new Set<string>();
    for (const pose of manifest.poses) {
      expect(pose.master.path.replaceAll("\\", "/")).toMatch(
        /^docs\/design\/assets\/reviews\//,
      );
      expect(pose.master.path.replaceAll("\\", "/")).not.toMatch(/^web\/public\//);
      expect(pose.master).toMatchObject({
        width: 512,
        height: 512,
        normalization: "nearest-contain-alpha-clean-v1",
        transparentBackground: true,
      });

      const sourceBytes = await readFile(
        path.resolve(process.cwd(), "..", pose.source.path),
      );
      const source = PNG.sync.read(sourceBytes);
      expect(createHash("sha256").update(sourceBytes).digest("hex")).toBe(
        pose.source.sha256,
      );
      expect([pose.source.width, pose.source.height]).toEqual([
        source.width,
        source.height,
      ]);
      expect(pose.source.transparentBackground).toBe(true);
      expect(hasTransparentPixel(source)).toBe(true);
      if (pose.lineage === "imagegen-repair") {
        expect(pose.source.path.replaceAll("\\", "/")).toMatch(
          /^docs\/design\/assets\/reviews\//,
        );
        expect([source.width, source.height]).toEqual([1254, 1254]);
      } else {
        expect(pose.source.path.replaceAll("\\", "/")).toMatch(
          /^web\/public\/pixel-ui\/characters\//,
        );
        expect([source.width, source.height]).toEqual([512, 512]);
      }

      const masterBytes = await readFile(
        path.resolve(process.cwd(), "..", pose.master.path),
      );
      const master = PNG.sync.read(masterBytes);
      expect([master.width, master.height]).toEqual([512, 512]);
      expect(createHash("sha256").update(masterBytes).digest("hex")).toBe(
        pose.master.sha256,
      );
      expect(hasTransparentPixel(master)).toBe(true);
      expect(hasNonzeroTransparentPixel(master)).toBe(false);
      expect(hashes.has(pose.master.sha256)).toBe(false);
      hashes.add(pose.master.sha256);
    }

    const sheetBytes = await readFile(
      path.resolve(process.cwd(), "..", manifest.sheet.path),
    );
    const sheet = PNG.sync.read(sheetBytes);
    expect(manifest.sheet).toMatchObject({ width: 1536, height: 1024 });
    expect([sheet.width, sheet.height]).toEqual([1536, 1024]);
    expect(createHash("sha256").update(sheetBytes).digest("hex")).toBe(
      manifest.sheet.sha256,
    );
    expect(hasTransparentPixel(sheet)).toBe(true);
    expect(hasNonzeroTransparentPixel(sheet)).toBe(false);
  });

  it("shows masters, optical evidence, semantic comparisons, and the open boundary", async () => {
    const html = await readFile(reviewPath, "utf8");

    for (const id of expectedIds) {
      expect(html).toContain(`data-pose="${id}"`);
    }
    expect(html.match(/data-preview-size="128"/g)).toHaveLength(8);
    expect(html.match(/data-grayscale-preview/g)).toHaveLength(8);
    expect(html).toContain('data-comparison="working-record-ledger"');
    expect(html).toContain('data-comparison="serious-concerned"');
    expect(html).toContain("Canonical controls");
    expect(html).toContain("Live semantic labels");
    expect(html).toContain("Exact master SHA-256");
    expect(html).toContain("prior-entry marks remain visible on the right");
    expect(html).toContain("Mimiku states and actions approved at exact hashes");
    expect(html).toContain("Mimiku calibration approved");
    expect(html).not.toContain("Mimiku remains awaiting calibration");
    expect(html).toContain("no runtime asset changes");
  });
});

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
