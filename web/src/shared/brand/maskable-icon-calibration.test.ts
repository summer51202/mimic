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
const manifestPath = path.join(reviewDirectory, "maskable-icons.manifest.json");
const reviewPath = path.join(reviewDirectory, "maskable-icons-review.html");

const expectedOutputs = [
  ["maskable-512", 512, "maskable-master"],
  ["maskable-192", 192, "maskable"],
] as const;

interface ManifestOutput {
  id: string;
  path: string;
  width: number;
  height: number;
  purpose: string;
  opaque: boolean;
  derivedFrom: string | null;
  resizeKernel: string;
  sha256: string;
}

interface Manifest {
  decision: string;
  strategy: string;
  canonicalMasterId: string;
  resizeKernel: string;
  safeZone: { shape: string; diameterPercent: number };
  reviewOnly: boolean;
  source: { path: string; sha256: string };
  outputs: ManifestOutput[];
}

describe("maskable icon calibration", () => {
  it("publishes two opaque outputs from one dedicated canonical master", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;

    expect(manifest).toMatchObject({
      decision: "approved",
      strategy: "dedicated-maskable-master",
      canonicalMasterId: "maskable-512",
      resizeKernel: "nearest",
      safeZone: { shape: "circle", diameterPercent: 80 },
      reviewOnly: true,
    });
    expect(manifest.source.path.replaceAll("\\", "/")).toMatch(
      /^docs\/design\/assets\/reviews\//,
    );
    expect(manifest.outputs.map(({ id }) => id)).toEqual(
      expectedOutputs.map(([id]) => id),
    );

    const hashes = new Set<string>();
    for (const [id, size, purpose] of expectedOutputs) {
      const output = manifest.outputs.find((candidate) => candidate.id === id);
      expect(output).toBeDefined();
      if (!output) throw new Error(`Missing output ${id}`);

      expect(output).toMatchObject({
        width: size,
        height: size,
        purpose,
        opaque: true,
        derivedFrom: id === "maskable-512" ? null : "maskable-512",
        resizeKernel: "nearest",
      });
      const normalizedPath = output.path.replaceAll("\\", "/");
      expect(normalizedPath).toMatch(/^docs\/design\/assets\/reviews\//);
      expect(normalizedPath).not.toMatch(/^web\/public\//);

      const bytes = await readFile(path.resolve(process.cwd(), "..", output.path));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(output.sha256);
      hashes.add(output.sha256);

      const png = PNG.sync.read(bytes);
      expect([png.width, png.height]).toEqual([size, size]);
      expect(isOpaque(png)).toBe(true);
      expect(rgbRange(png)).toBeGreaterThan(48);
    }
    expect(hashes.size).toBe(expectedOutputs.length);
  });

  it("presents safe-zone, platform-mask, context, and boundary evidence", async () => {
    const html = await readFile(reviewPath, "utf8");

    expect(html).toContain("Maskable Icons");
    expect(html).toContain("Maskable exact hashes approved");
    expect(html).not.toContain("Maskable, the complete Icons family, and Gate A remain awaiting calibration");
    for (const [id, size] of expectedOutputs) {
      expect(html).toContain(`data-output="${id}"`);
      expect(html).toContain(`data-true-size="${size}"`);
    }
    expect(html.match(/data-grayscale-preview/g)).toHaveLength(2);
    expect(html).toContain('data-safe-zone="80"');
    expect(html).toContain("80% safe zone");
    expect(html).toContain('data-mask-preview="circle"');
    expect(html).toContain('data-mask-preview="rounded-square"');
    expect(html).toContain('data-mask-preview="squircle"');
    expect(html).toContain('data-mask-preview="aggressive"');
    expect(html).toContain("Approved Install / Favicon context");
    expect(html).toContain("mask preview only");
    expect(html).toContain("no runtime asset changes");
  });
});

function isOpaque(png: PNG): boolean {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] !== 255) return false;
  }
  return true;
}

function rgbRange(png: PNG): number {
  let minimum = 255;
  let maximum = 0;
  for (let offset = 0; offset < png.data.length; offset += 4) {
    minimum = Math.min(minimum, png.data[offset], png.data[offset + 1], png.data[offset + 2]);
    maximum = Math.max(maximum, png.data[offset], png.data[offset + 1], png.data[offset + 2]);
  }
  return maximum - minimum;
}
