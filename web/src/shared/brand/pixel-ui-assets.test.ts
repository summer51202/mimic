import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { pixelUiFiles, pixelUiRoles } from "./pixel-ui-assets";
import { inspectPng } from "./png-inspection";

const pngSignature = "89504e470d0a1a0a";
const execFileAsync = promisify(execFile);

const expectedDimensions = new Map<string, readonly [number, number]>([
  ["mimiku-idle.png", [512, 512]],
  ["mimiku-happy.png", [512, 512]],
  ["mimiku-thinking.png", [512, 512]],
  ["mimiku-reminder.png", [512, 512]],
  ["mimiku-serious.png", [512, 512]],
  ["mimiku-lost.png", [512, 512]],
  ["treasury-mobile.png", [512, 1024]],
  ["treasury-desktop.png", [1024, 620]],
  ["avatar-01.png", [96, 96]],
  ["avatar-02.png", [96, 96]],
  ["avatar-03.png", [96, 96]],
  ["avatar-04.png", [96, 96]],
  ["frames-ui.png", [256, 166]],
]);

const expectedCharacterHashes = new Map([
  ["mimiku-idle.png", "1cc0e72cd73f12f8dbe75a00c2253aec08fd8a27e9ab92430be41ec958eeaea2"],
  ["mimiku-happy.png", "397431082776b3ec037c90b8bfd5a7c144a0dbc730f6b753c782b3836b6727f3"],
  ["mimiku-thinking.png", "d9d60a813500188f95e0391192c34e3943d1dfda2983eb8228baaebb37907b3b"],
  ["mimiku-reminder.png", "2fa3d8b6d27a08b4f98ddfd6f30786c9f0a4fd9757a5ad244c2c56f35484aaec"],
  ["mimiku-serious.png", "2c89947f952dd76aa55c5ddf1f79dc4a501c530458b10355a5214ff6c8d1a442"],
  ["mimiku-lost.png", "4d107876216acac17aa14c80e545e29700373ed5f6c9ac8ae52023991f4e5284"],
]);

describe("pixelUiAssets", () => {
  it("exposes canonical physical files and semantic role aliases", () => {
    expect(pixelUiFiles.characters).toEqual({
      idle: "/pixel-ui/characters/mimiku-idle.png",
      happy: "/pixel-ui/characters/mimiku-happy.png",
      thinking: "/pixel-ui/characters/mimiku-thinking.png",
      reminder: "/pixel-ui/characters/mimiku-reminder.png",
      serious: "/pixel-ui/characters/mimiku-serious.png",
      lost: "/pixel-ui/characters/mimiku-lost.png",
    });
    expect(pixelUiRoles).toEqual({
      dashboard: pixelUiFiles.characters.idle,
      emptyGroup: pixelUiFiles.characters.thinking,
      emptyFund: pixelUiFiles.characters.lost,
      invitation: pixelUiFiles.characters.reminder,
      success: pixelUiFiles.characters.happy,
      blockingError: pixelUiFiles.characters.serious,
    });
    expect(pixelUiFiles.avatars).toEqual([
      "/pixel-ui/avatars/avatar-01.png",
      "/pixel-ui/avatars/avatar-02.png",
      "/pixel-ui/avatars/avatar-03.png",
      "/pixel-ui/avatars/avatar-04.png",
    ]);
  });

  it.each([...allRuntimePixelUiPaths()])(
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

  it.each(pixelUiFiles.avatars)(
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

  it.each(Object.values(pixelUiFiles.characters))(
    "exports %s with a transparent exterior and no connected neutral matte",
    async (publicPath) => {
      const inspection = await inspectPng(publicFile(publicPath));

      expect(inspection).toMatchObject({
        exteriorCornerTransparent: true,
        connectedNeutralPixels: 0,
        hasTransparentPixel: true,
      });
    },
  );

  it.each(Object.values(pixelUiFiles.characters))(
    "preserves the approved bytes for %s",
    async (publicPath) => {
      const image = await readFile(publicFile(publicPath));
      expect(sha256(image)).toBe(expectedCharacterHashes.get(path.basename(publicPath)));
    },
  );

  it("exports a clean transparent frame without resampling", async () => {
    const inspection = await inspectPng(publicFile(pixelUiFiles.deferred.frame));

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
    const inspection = await inspectPng(publicFile(pixelUiFiles.deferred.frame));
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
    const inspection = await inspectPng(publicFile(pixelUiFiles.avatars[0]));

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
    const committedFiles = new Map([
      ...pixelUiFiles.avatars.map((publicPath) => [
        path.basename(publicPath),
        path.join(process.cwd(), "public", publicPath),
      ] as const),
      [
        path.basename(pixelUiFiles.deferred.frame),
        path.join(process.cwd(), "public", pixelUiFiles.deferred.frame),
      ] as const,
    ]);
    const filenames = [...committedFiles.keys()];
    const committedHashes = new Map(
      await Promise.all(
        [...committedFiles].map(async ([filename, filenamePath]) => [
          filename,
          sha256(await readFile(filenamePath)),
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

function* allRuntimePixelUiPaths(): Generator<string> {
  yield* Object.values(pixelUiFiles.characters);
  yield* pixelUiFiles.avatars;
  yield* Object.values(pixelUiFiles.deferred.scenes);
  yield pixelUiFiles.deferred.frame;
}
