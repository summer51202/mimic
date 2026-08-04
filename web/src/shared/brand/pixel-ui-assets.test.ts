import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { pixelUiAssetPolicy, pixelUiAssets } from "./pixel-ui-assets";
import { inspectPng } from "./png-inspection";

const pngSignature = "89504e470d0a1a0a";
const execFileAsync = promisify(execFile);

const expectedDimensions = new Map<string, readonly [number, number]>([
  ["mimiku-dashboard.png", [512, 512]],
  ["mimiku-empty-group.png", [512, 512]],
  ["mimiku-empty-fund.png", [512, 512]],
  ["mimiku-invite.png", [512, 512]],
  ["mimiku-success.png", [512, 512]],
  ["mimiku-serious.png", [512, 512]],
  ["treasury-mobile.png", [512, 1024]],
  ["treasury-desktop.png", [1024, 620]],
  ["avatar-01.png", [96, 96]],
  ["avatar-02.png", [96, 96]],
  ["avatar-03.png", [96, 96]],
  ["avatar-04.png", [96, 96]],
  ["icons-ui.png", [1536, 1024]],
  ["frames-ui.png", [256, 166]],
]);

describe("pixelUiAssets", () => {
  it("exposes stable public paths for Mimiku and avatars", () => {
    expect(pixelUiAssets.mimiku.dashboard).toBe(
      "/pixel-ui/mimiku-dashboard.png",
    );
    expect(pixelUiAssets.avatars).toHaveLength(4);
    expect(pixelUiAssets.avatars).toEqual([
      "/pixel-ui/avatar-01.png",
      "/pixel-ui/avatar-02.png",
      "/pixel-ui/avatar-03.png",
      "/pixel-ui/avatar-04.png",
    ]);
  });

  it("keeps source sheets out of the first-screen runtime policy", () => {
    expect(pixelUiAssetPolicy.sourceSheets).toEqual([
      "/pixel-ui/icons-ui.png",
      "/pixel-ui/frames-ui.png",
    ]);
    expect(pixelUiAssetPolicy.runtimeFirstScreen).not.toContain(
      "/pixel-ui/icons-ui.png",
    );
    expect(pixelUiAssetPolicy.runtimeFirstScreen).not.toContain(
      "/pixel-ui/frames-ui.png",
    );
  });

  it.each([...allPixelUiPaths()])(
    "ships %s as the expected PNG under public",
    async (publicPath) => {
      const filename = path.basename(publicPath);
      const dimensions = expectedDimensions.get(filename);

      expect(dimensions).toBeDefined();

      const image = await readFile(
        path.join(process.cwd(), "public", publicPath),
      );

      expect(image.subarray(0, 8).toString("hex")).toBe(pngSignature);
      expect(image.readUInt32BE(16)).toBe(dimensions?.[0]);
      expect(image.readUInt32BE(20)).toBe(dimensions?.[1]);
    },
  );

  it.each(pixelUiAssets.avatars)(
    "exports %s as clean transparent 2x avatar art",
    async (publicPath) => {
      const inspection = await inspectPng(publicFile(publicPath));

      expect(inspection).toMatchObject({
        width: 96,
        height: 96,
        channels: 4,
        hasTransparentPixel: true,
        connectedNeutralPixels: 0,
        opaqueNeutralCheckerPixels: 0,
      });
    },
  );

  it("exports a clean transparent frame without resampling", async () => {
    const inspection = await inspectPng(publicFile(pixelUiAssets.sheets.frames));

    expect(inspection).toMatchObject({
      width: 256,
      height: 166,
      channels: 4,
      exteriorCornerTransparent: true,
      connectedNeutralPixels: 0,
      opaqueNeutralCheckerPixels: 0,
    });
  });

  it("keeps complete frame artwork away from every source crop edge", async () => {
    const exporter = await exporterSource();
    const inspection = await inspectPng(publicFile(pixelUiAssets.sheets.frames));
    const bounds = inspection.nonTransparentBounds;

    expect(exporter).toContain(
      'const frameExport = ["frames-ui.png", 1280, 575, 240, 166];',
    );
    expect(bounds.x).toBeGreaterThan(8);
    expect(bounds.y).toBeGreaterThan(0);
    expect(bounds.x + bounds.width).toBeLessThan(248);
    expect(bounds.y + bounds.height).toBeLessThan(166);
  });

  it("preserves opaque near-neutral pixels in avatar eye artwork", async () => {
    const inspection = await inspectPng(publicFile(pixelUiAssets.avatars[0]));

    expect(inspection.opaqueNearNeutralPixels).toBeGreaterThan(0);
  });

  it("preserves the root icon byte-for-byte", async () => {
    const icon = await readFile(path.join(process.cwd(), "..", "icon.png"));

    expect(createHash("sha256").update(icon).digest("hex")).toBe(
      "f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac",
    );
  });

  it("uses the exact destination temp path for atomic PNG exports", async () => {
    const exporter = await exporterSource();

    expect(exporter).toContain('const temporary = `${filename}.tmp`;');
    expect(exporter).not.toContain("process.pid");
    expect(exporter).not.toContain("Date.now()");
    expect(exporter.indexOf('await rm(temporary, { force: true });')).toBeLessThan(
      exporter.indexOf('handle = await open(temporary, "wx");'),
    );
  });

  it("maps nearest-neighbor pixels from destination cell centers", async () => {
    const { resizeContainNearest } = await import(
      "../../../scripts/export-pixel-runtime-assets.mjs"
    );
    const source = new PNG({ width: 2, height: 2 });
    source.data.set([
      255, 0, 0, 255, 255, 0, 0, 255,
      0, 0, 255, 255, 0, 0, 255, 255,
    ]);

    const resized = resizeContainNearest(
      source,
      { x: 0, y: 0, width: 2, height: 2 },
      2,
      1,
    );

    expect([...resized.data]).toEqual([0, 0, 255, 255]);

    const horizontalSource = new PNG({ width: 3, height: 1 });
    horizontalSource.data.set([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
    ]);
    const horizontalResize = resizeContainNearest(
      horizontalSource,
      { x: 0, y: 0, width: 3, height: 1 },
      2,
      1,
    );

    expect([...horizontalResize.data]).toEqual([
      255, 0, 0, 255,
      0, 0, 255, 255,
    ]);
  });

  it("reproduces committed assets twice without residual temp files", async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), "mimic-pixel-export-"));
    const filenames = pixelUiAssets.avatars
      .map((publicPath) => path.basename(publicPath))
      .concat(path.basename(pixelUiAssets.sheets.frames));
    const committedHashes = new Map(
      await Promise.all(
        filenames.map(async (filename) => [
          filename,
          sha256(
            await readFile(path.join(process.cwd(), "public", "pixel-ui", filename)),
          ),
        ] as const),
      ),
    );

    try {
      const script = path.join(
        process.cwd(),
        "scripts",
        "export-pixel-runtime-assets.mjs",
      );
      const runHashes: Array<Map<string, string>> = [];
      for (let run = 0; run < 2; run += 1) {
        await execFileAsync(process.execPath, [script, "--output-dir", outputDirectory]);
        expect((await readdir(outputDirectory)).sort()).toEqual([...filenames].sort());
        runHashes.push(
          new Map(
            await Promise.all(
              filenames.map(async (filename) => [
                filename,
                sha256(await readFile(path.join(outputDirectory, filename))),
              ] as const),
            ),
          ),
        );
      }
      expect(runHashes[0]).toEqual(committedHashes);
      expect(runHashes[1]).toEqual(runHashes[0]);
    } finally {
      await rm(outputDirectory, { force: true, recursive: true });
    }
  });
});

async function exporterSource(): Promise<string> {
  return readFile(
    path.join(process.cwd(), "scripts", "export-pixel-runtime-assets.mjs"),
    "utf8",
  );
}

function sha256(contents: Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

function publicFile(publicPath: string): string {
  return path.join(process.cwd(), "public", publicPath);
}

function* allPixelUiPaths(): Generator<string> {
  yield* Object.values(pixelUiAssets.mimiku);
  yield* Object.values(pixelUiAssets.scenes);
  yield* pixelUiAssets.avatars;
  yield* Object.values(pixelUiAssets.sheets);
}
