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
const manifestPath = path.join(reviewDirectory, "icon-optical-evidence.manifest.json");
const reviewPath = path.join(reviewDirectory, "icon-optical-evidence-review.html");

const expectedIds = [
  "nav-home",
  "nav-adventure-log",
  "nav-guild",
  "nav-tasks",
  "nav-settings",
  "mode-personal",
  "mode-shared",
  "mode-pooled",
  "action-record-expense",
] as const;

interface RasterRecord {
  path: string;
  width: number;
  height: number;
  sha256: string;
}

interface IconRecord {
  id: string;
  source: { path: string; sha256: string };
  master: RasterRecord;
  optical48: RasterRecord & { derivedFrom: string; resizeKernel: string };
}

describe("final icon optical evidence", () => {
  it("publishes nine review-only 192px masters and direct 48px exports", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      decision: string;
      reviewOnly: boolean;
      icons: IconRecord[];
    };

    expect(manifest).toMatchObject({
      decision: "approved",
      reviewOnly: true,
    });
    expect(manifest.icons.map(({ id }) => id)).toEqual(expectedIds);

    const seenHashes = new Set<string>();
    for (const entry of manifest.icons) {
      expect(entry.source.path.replaceAll("\\", "/")).toMatch(
        /^docs\/design\/assets\/reviews\//,
      );
      expect(entry.master.path.replaceAll("\\", "/")).not.toMatch(/^web\/public\//);
      expect(entry.optical48).toMatchObject({
        width: 48,
        height: 48,
        derivedFrom: entry.master.path,
        resizeKernel: "nearest",
      });

      for (const [record, size] of [
        [entry.master, 192],
        [entry.optical48, 48],
      ] as const) {
        const bytes = await readFile(path.resolve(process.cwd(), "..", record.path));
        const png = PNG.sync.read(bytes);
        expect([png.width, png.height]).toEqual([size, size]);
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256);
        expect(hasTransparentPixel(png)).toBe(true);
        expect(hasNonzeroTransparentPixel(png)).toBe(false);
        expect(seenHashes.has(record.sha256)).toBe(false);
        seenHashes.add(record.sha256);
      }
    }
  });

  it("shows the complete 48px UI-icon family with live labels and grayscale evidence", async () => {
    const html = await readFile(reviewPath, "utf8");

    for (const id of expectedIds) {
      expect(html).toContain(`data-icon="${id}"`);
    }
    expect(html.match(/data-preview-size="48"/g)).toHaveLength(18);
    expect(html.match(/data-grayscale-preview/g)).toHaveLength(18);
    expect(html).toContain("Complete 48px UI icon evidence");
    expect(html).toContain("Event / Status exact-hash context");
    expect(html).toContain("Live semantic labels remain required");
    expect(html).toContain("no runtime asset changes");
    expect(html).toContain("Exact-hash optical evidence approved");
    expect(html).toContain("Icons family calibration approved");
    expect(html).not.toContain("Icons family remains awaiting calibration");
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
