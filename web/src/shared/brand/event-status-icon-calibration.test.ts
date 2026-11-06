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
const manifestPath = path.join(
  reviewDirectory,
  "event-status-icons.manifest.json",
);
const reviewPath = path.join(
  reviewDirectory,
  "event-status-icons-review.html",
);

const expectedIds = [
  "event-expense",
  "event-contribution",
  "event-reimbursement",
  "event-shortfall",
  "event-return",
  "event-settlement",
  "event-correction",
  "status-lock",
  "status-offline",
] as const;

const approvedMasterHashes: Record<(typeof expectedIds)[number], string> = {
  "event-expense": "e2ae5aca4b4bb82810336fc4f5ff7fb9fc52dc48323c2f25a007670753f66bcc",
  "event-contribution": "fbdb18bcc43ca070422ef3092616d3f9542448a9d28eb9abbcf171a0c497a1ef",
  "event-reimbursement": "c9b63487ae65e81db4994c668143d239310339b83b0b89aa918c1afb448045c2",
  "event-shortfall": "ede2b6d3d407875ef4f67dd9a82d41de008f2b75ccd721d9034aaaf074549011",
  "event-return": "bc3e95c97ead09edc0c6b72115a0e5969a5a808032f0e195320f388a0fccab08",
  "event-settlement": "10346dfa9fc5bda4f510b6623d687e6abd37981655d48c6138ed20f869e9b9ab",
  "event-correction": "d39a3a402bc00c78bb0d55a5eef35e4f597947c969cfb8327447c02b984ae3cd",
  "status-lock": "50bec38d68900b1836306dc6298a2f379339b5e98cabc08977bcfec559c3ac00",
  "status-offline": "bb4632111ef73c4e089a2eef1ece30be11495baf4d1923464d87735c573405a5",
};

interface ManifestEntry {
  id: string;
  source: string;
  master: { path: string; width: number; height: number; sha256: string };
  optical48: { path: string; width: number; height: number; sha256: string };
}

describe("event and status icon calibration", () => {
  it("publishes exactly nine deterministic review-only raster directions", async () => {
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as { approvedOn: string; decision: string; icons: ManifestEntry[] };

    expect(manifest.decision).toBe("approved");
    expect(manifest.approvedOn).toBe("2026-10-01");
    expect(manifest.icons.map(({ id }) => id)).toEqual(expectedIds);

    for (const entry of manifest.icons) {
      expect(entry.source.replaceAll("\\", "/")).toMatch(
        /^docs\/design\/assets\/reviews\//,
      );
      expect(entry.master.path.replaceAll("\\", "/")).not.toMatch(
        /^web\/public\//,
      );

      const masterBytes = await readFile(
        path.resolve(process.cwd(), "..", entry.master.path),
      );
      const master = PNG.sync.read(masterBytes);
      expect([master.width, master.height]).toEqual([192, 192]);
      expect(entry.master).toMatchObject({ width: 192, height: 192 });
      expect(createHash("sha256").update(masterBytes).digest("hex")).toBe(
        entry.master.sha256,
      );
      expect(entry.master.sha256).toBe(
        approvedMasterHashes[entry.id as (typeof expectedIds)[number]],
      );
      expect(hasTransparentPixel(master)).toBe(true);
      expect(hasNonzeroTransparentPixel(master)).toBe(false);

      const bounds = findOpaqueBounds(master, 16);
      expect(Math.max(bounds.width, bounds.height)).toBeGreaterThanOrEqual(134);
      expect(Math.max(bounds.width, bounds.height)).toBeLessThanOrEqual(154);

      const opticalBytes = await readFile(
        path.resolve(process.cwd(), "..", entry.optical48.path),
      );
      const optical = PNG.sync.read(opticalBytes);
      expect([optical.width, optical.height]).toEqual([48, 48]);
      expect(entry.optical48).toMatchObject({ width: 48, height: 48 });
      expect(createHash("sha256").update(opticalBytes).digest("hex")).toBe(
        entry.optical48.sha256,
      );
      expect(hasNonzeroTransparentPixel(optical)).toBe(false);
    }
  });

  it("keeps live labels, grayscale evidence, controls, and the open gate visible", async () => {
    const html = await readFile(reviewPath, "utf8");

    for (const id of expectedIds) {
      expect(html).toContain(`data-icon="${id}"`);
    }
    expect(html.match(/data-preview-size="48"/g)).toHaveLength(9);
    expect(html.match(/data-grayscale-preview/g)).toHaveLength(9);
    expect(html).toContain("samples/icons-calibration.png");
    expect(html).toContain(
      "samples/record-expense-action/record-expense-action-v01.png",
    );
    expect(html).toContain("Event / Status artwork approved at exact hashes");
    expect(html).toContain("Icons family calibration approved");
    expect(html).toContain("Live-HTML boundary");
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

function findOpaqueBounds(png: PNG, alphaThreshold: number) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] < alphaThreshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Icon has no visible pixels");
  return { width: right - left + 1, height: bottom - top + 1 };
}
