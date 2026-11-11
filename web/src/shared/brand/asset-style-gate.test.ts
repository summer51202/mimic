import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { inspectPng } from "./png-inspection";

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
const wordmarkLineageAuditPath = path.resolve(
  path.dirname(reviewManifestPath),
  "wordmark-lineage-audit.md",
);
const iconsCalibrationReviewPath = path.resolve(
  path.dirname(reviewManifestPath),
  "icons-calibration-review.html",
);
const taskBoardVariantsReviewPath = path.resolve(
  path.dirname(reviewManifestPath),
  "task-board-variants-review.html",
);
const modesCalibrationReviewPath = path.resolve(
  path.dirname(reviewManifestPath),
  "modes-calibration-review.html",
);
const recordExpenseActionReviewPath = path.resolve(
  path.dirname(reviewManifestPath),
  "record-expense-action-review.html",
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

const approvedFamilies = [
  "wordmark",
  "icons",
  "mimiku-states",
  "avatar-classes",
  "scenes",
  "frames",
  "props",
] as const;
const pngSignature = "89504e470d0a1a0a";
const repository = path.resolve(process.cwd(), "..");
const approvedDirectory = "docs/design/assets/approved/page-visual-v1";
const portraitsCroppedThroughCorner = new Set([
  "alchemist", "bard", "cartographer", "mage", "physician", "ranger", "warrior",
]);

interface ProductionAsset {
  path: string;
  sources: Array<{ path: string; sha256: string }>;
  export_method: string;
  canvas?: { width: number; height: number; crop: [number, number, number, number]; x: number; y: number };
  sha256: string;
  width: number | null;
  height: number | null;
  frames: number;
  frame_width: number | null;
  frame_height: number | null;
  alpha: boolean | null;
  css_size: string;
  consumer: string;
  loading: string;
  accessibility: string;
  fallback: string;
  reduced_motion: string;
  runtime_target: string | null;
  disposition: string;
}

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

it.each([
  ["display", [28, 67, 900, 265], "240–640 CSS px wide"],
  ["compact", [936, 302, 240, 70], "96–220 CSS px wide"],
] as const)("stages the %s wordmark with exactly eight pixels of transparent padding", async (id, crop, cssSize) => {
  const { assets } = JSON.parse(await readFile(
    path.join(repository, approvedDirectory, "production-asset-manifest.json"), "utf8",
  )) as { assets: ProductionAsset[] };
  const file = `wordmark/mimic-wordmark-${id}.png`;
  const width = crop[2] + 16;
  const height = crop[3] + 16;
  expect(assets.find((asset) => asset.path === file)).toMatchObject({
    width, height, frames: 1, frame_width: width, frame_height: height,
    canvas: { width, height, crop, x: 8, y: 8 },
    css_size: cssSize,
  });

  const png = PNG.sync.read(await readFile(path.join(repository, approvedDirectory, file)));
  expect([png.width, png.height]).toEqual([width, height]);
  const visible = { left: width, top: height, right: -1, bottom: -1 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (png.data[(y * width + x) * 4 + 3] === 0) continue;
      visible.left = Math.min(visible.left, x);
      visible.top = Math.min(visible.top, y);
      visible.right = Math.max(visible.right, x);
      visible.bottom = Math.max(visible.bottom, y);
    }
  }
  expect(visible).toEqual({ left: 8, top: 8, right: width - 9, bottom: height - 9 });
});

it("keeps all Gate B sources in the approved directory and records production promotions", async () => {
  const { assets, gate, schema_version } = JSON.parse(await readFile(
    path.join(repository, approvedDirectory, "production-asset-manifest.json"), "utf8",
  )) as { assets: ProductionAsset[]; gate: string; schema_version: number };
  expect(gate).toBe("B2-2");
  expect(schema_version).toBe(1);
  expect(assets).toHaveLength(125);
  const decisions = await readFile(path.join(path.dirname(reviewManifestPath), "decision-log.md"), "utf8");
  const b2Decisions = decisions.slice(decisions.indexOf("### Gate B2-1 partial approval"));
  const approvals = new Map([...b2Decisions.matchAll(
    /`([a-z0-9-]+\.png)`(?: \([^\n]*?\))?\s*(?:\|\s*`|\(SHA-256 `)([a-f0-9]{64})`/g,
  )].map(([, name, hash]) => [name, hash]));
  expect(approvals.size).toBe(23);
  const b2Assets = assets.filter((asset) => asset.sources.some(({ path }) => path.includes("/gate-b2-1/")));
  expect(b2Assets).toHaveLength(23);
  expect(new Map(b2Assets.map((asset) => [path.basename(asset.path), asset.sha256]))).toEqual(approvals);
  const paths = assets.map((asset) => asset.path);
  expect(new Set(paths).size).toBe(paths.length);
  for (const purpose of ["any", "maskable"]) {
    for (const size of [192, 512]) {
      const name = purpose === "any" ? "icon" : "icon-maskable";
      expect(assets.find((asset) => asset.path === `icons/install/${name}-${size}.png`))
        .toMatchObject({ width: size, height: size, frames: 1 });
    }
  }
  const stagedFiles = (await readdir(path.join(repository, approvedDirectory), {
    recursive: true, withFileTypes: true,
  })).filter((entry) => entry.isFile() && /\.(png|json)$/.test(entry.name))
    .map((entry) => path.relative(
      path.join(repository, approvedDirectory), path.join(entry.parentPath, entry.name),
    ).split(path.sep).join("/"));
  expect(stagedFiles.sort()).toEqual([...paths, "production-asset-manifest.json"].sort());
  const publicPaths = new Set(await readdir(path.join(repository, "web/public"), {
    recursive: true,
  }));
  const hashes = new Set<string>();
  for (const asset of assets) {
    expect(asset.path).toMatch(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.(png|json)$/);
    expect(publicPaths.has(path.normalize(asset.path))).toBe(false);
    if (["promoted-phase-2a", "promoted-phase-2b", "promoted-phase-2c", "promoted-phase-2d", "promoted-phase-2e1"].includes(asset.disposition)) {
      expect(asset.runtime_target).toBe(`web/public/pixel-ui/v1/${asset.path}`);
    } else {
      expect(asset.runtime_target).toBeNull();
      expect(asset.disposition).toBe("staged-only-until-consumer-plan");
    }
    for (const value of [
      asset.export_method, asset.css_size, asset.consumer, asset.loading,
      asset.accessibility, asset.fallback, asset.reduced_motion,
    ]) {
      expect(value?.trim(), asset.path).toBeTruthy();
    }

    const filename = path.join(repository, approvedDirectory, asset.path);
    const bytes = await readFile(filename);
    expect(sha256(bytes), asset.path).toBe(asset.sha256);
    expect(hashes.has(asset.sha256), asset.path).toBe(false);
    hashes.add(asset.sha256);
    expect(asset.sources.length, asset.path).toBeGreaterThan(0);
    const sources = await Promise.all(asset.sources.map(async (source) => {
      expect(source.path).toMatch(/^docs\/design\/assets\/reviews\//);
      expect(source.path.split("/")).not.toContain("..");
      const sourceBytes = await readFile(path.join(repository, source.path));
      expect(sha256(sourceBytes), source.path).toBe(source.sha256);
      return sourceBytes;
    }));
    if (asset.path.endsWith(".json")) {
      expect(JSON.parse(bytes.toString("utf8"))).toBeTypeOf("object");
      expect([asset.width, asset.height, asset.frame_width, asset.frame_height, asset.alpha])
        .toEqual([null, null, null, null, null]);
      expect(asset.frames).toBe(0);
      if (asset.export_method === "copy") expect(bytes.equals(sources[0])).toBe(true);
      continue;
    }
    expect(bytes.subarray(0, 8).toString("hex")).toBe(pngSignature);
    const png = PNG.sync.read(bytes);
    expect([png.width, png.height], asset.path).toEqual([asset.width, asset.height]);
    expect(png.width).toBe(asset.frame_width! * asset.frames);
    expect(png.height).toBe(asset.frame_height);
    expect(hasTransparentPixel(png), asset.path).toBe(asset.alpha);
    expect(hasNonzeroTransparentPixel(png), asset.path).toBe(false);
    if (asset.alpha) {
      const portrait = /^avatars\/([a-z]+)-portrait\.png$/.exec(asset.path)?.[1];
      const inspection = await inspectPng(filename);
      if (!portrait || !portraitsCroppedThroughCorner.has(portrait)) {
        expect(inspection.exteriorCornerTransparent, asset.path).toBe(true);
      }
      // Record the approved warrior portrait's boundary finding without editing its pixels.
      expect(inspection.connectedNeutralPixels, asset.path)
        .toBe(portrait === "warrior" ? 16 : 0);
    }
    if (asset.export_method === "copy") {
      expect(sources, asset.path).toHaveLength(1);
      expect(bytes.equals(sources[0]), asset.path).toBe(true);
      for (let index = 0; index < asset.frames; index++) {
        const frame = new PNG({ width: asset.frame_width!, height: asset.frame_height! });
        PNG.bitblt(png, frame, index * frame.width, 0, frame.width, frame.height, 0, 0);
        expect(frame.data.some((value, offset) => offset % 4 === 3 && value > 0),
          `${asset.path} frame ${index}`).toBe(true);
      }
      continue;
    }
    expect(sources).toHaveLength(asset.frames);
    for (const [index, source] of sources.entries()) {
      let frame: PNG = PNG.sync.read(source);
      if (asset.canvas) {
        const { width, height, crop, x, y } = asset.canvas;
        const padded = new PNG({ width, height });
        padded.data.fill(0);
        PNG.bitblt(frame, padded, ...crop, x, y);
        frame = padded;
      }
      expect([frame.width, frame.height]).toEqual([asset.frame_width, asset.frame_height]);
      expect(frame.data.some((value, offset) => offset % 4 === 3 && value > 0), asset.path)
        .toBe(true);
      const rowBytes = frame.width * 4;
      for (let y = 0; y < frame.height; y++) {
        const start = (y * png.width + index * frame.width) * 4;
        expect(png.data.subarray(start, start + rowBytes).equals(
          frame.data.subarray(y * rowBytes, (y + 1) * rowBytes),
        ), `${asset.path} frame ${index} row ${y}`).toBe(true);
      }
    }
  }
}, 20_000);

type ReviewSample = {
  path: string;
  sha256: string;
} & (
  | { width: number; height: number; alpha: boolean | null }
  | { width?: never; height?: never; alpha?: never }
);

interface ReviewFamily {
  id: string;
  consumers: string[];
  live_html_boundaries: string[];
  fallback: string;
  accessibility: string;
  sample: ReviewSample;
  additional_samples?: ReviewSample[];
  decision: string;
  staged_files?: Array<{
    path: string;
    width: number;
    height: number;
    frames: number;
  }>;
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
      for (const sample of [family.sample, ...(family.additional_samples ?? [])]) {
        expect(sample.path).toMatch(/^docs\/design\/assets\/reviews\//);
        expect(sample.path.split("/")).not.toContain("..");
      }
      expect(family.decision).toBe(
        approvedFamilies.some((id) => id === family.id)
          ? "approved"
          : "awaiting-calibration",
      );
    }

    const wordmark = manifest.families.find(({ id }) => id === "wordmark");
    expect(wordmark?.staged_files).toEqual([
      {
        path: "docs/design/assets/approved/page-visual-v1/wordmark/mimic-wordmark-display.png",
        width: 1536,
        height: 512,
        frames: 1,
      },
      {
        path: "docs/design/assets/approved/page-visual-v1/wordmark/mimic-wordmark-compact.png",
        width: 768,
        height: 256,
        frames: 1,
      },
      {
        path: "docs/design/assets/approved/page-visual-v1/wordmark/mimic-wordmark-motion-sheet.png",
        width: 4608,
        height: 512,
        frames: 3,
      },
    ]);

    const mimiku = manifest.families.find(({ id }) => id === "mimiku-states");
    expect(mimiku).toMatchObject({
      decision: "approved",
      sample: {
        path: "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-actions/mimiku-states-actions-calibration.png",
        width: 1536,
        height: 1024,
        alpha: true,
        sha256: "eea15ebaff7ccb1f68f44cc7ea12b1484c73836fabf439bf7f639c37c55107f3",
      },
    });

    const avatarClasses = manifest.families.find(
      ({ id }) => id === "avatar-classes",
    );
    expect(avatarClasses).toMatchObject({
      decision: "approved",
      sample: {
        path: "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/avatar-classes/avatar-classes-calibration.png",
        width: 2048,
        height: 1024,
        alpha: true,
        sha256: "4f3cfacfbe20576390c26561025218b4c8dfe083ef921d27a11ecdd7fa2f2b59",
      },
    });
  });

  it.each(approvedFamilies)(
    "validates the %s calibration samples",
    async (familyId) => {
      const manifest = JSON.parse(
        await readFile(reviewManifestPath, "utf8"),
      ) as ReviewManifest;
      const family = manifest.families.find(({ id }) => id === familyId);

      expect(family, `${familyId} manifest record`).toBeDefined();

      for (const sample of [family!.sample, ...(family!.additional_samples ?? [])]) {
        const samplePath = path.resolve(process.cwd(), "..", sample.path);
        const bytes = await readFile(samplePath);
        expect(sample.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(sample.sha256);

        if (samplePath.endsWith(".json")) {
          expect(JSON.parse(bytes.toString("utf8"))).toBeTypeOf("object");
          expect(sample.width).toBeUndefined();
          continue;
        }

        expect(bytes.subarray(0, 8).toString("hex")).toBe(pngSignature);
        const png = PNG.sync.read(bytes);
        expect(png.width).toBe(sample.width);
        expect(png.height).toBe(sample.height);
        expect(hasTransparentPixel(png), sample.path).toBe(sample.alpha);
        if (familyId === "wordmark" || familyId === "mimiku-states") {
          expect(hasNonzeroTransparentPixel(png)).toBe(false);
        }
      }
    },
  );

  it("defines the accessible motion and reduced-motion calibration contract", async () => {
    const manifest = JSON.parse(
      await readFile(reviewManifestPath, "utf8"),
    ) as ReviewManifest;
    const motion = manifest.families.find(({ id }) => id === "motion");

    expect(motion).toBeDefined();

    for (const sample of [motion!.sample, ...(motion!.additional_samples ?? [])]) {
      const bytes = await readFile(path.resolve(process.cwd(), "..", sample.path));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(sample.sha256);
    }
    const html = await readFile(path.resolve(process.cwd(), "..", motion!.sample.path), "utf8");
    const controllerPath = motion!.sample.path.replace(/-review\.html$/, ".js");
    const controller = await readFile(path.resolve(process.cwd(), "..", controllerPath), "utf8");
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain('id="skip"');
    expect(controller).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(controller).not.toMatch(/pointermove|mousemove|clientX|clientY/);
  });

  it("assembles all families into the responsive live-caption review index", async () => {
    const manifest = JSON.parse(
      await readFile(reviewManifestPath, "utf8"),
    ) as ReviewManifest;
    const html = await readFile(reviewIndexPath, "utf8");

    for (const family of manifest.families) {
      for (const sample of [family.sample, ...(family.additional_samples ?? [])]) {
        expect(html, family.id).toContain(path.basename(sample.path));
      }
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

  it("records canonical Mimiku lineage and replacement provenance", async () => {
    const audit = await readFile(assetLineageAuditPath, "utf8");
    const reviewIndex = await readFile(reviewIndexPath, "utf8");
    const reviewDirectory = path.dirname(reviewManifestPath);
    const rejectedSample = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "rejected",
        "mimiku-states-calibration-1278f447.png",
      ),
    );
    const derivedPoseBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "derivations",
        "mimiku-derived-poses.png",
      ),
    );
    const derivedPoses = PNG.sync.read(derivedPoseBytes);
    const concernedPoseBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "derivations",
        "mimiku-concerned-pose.png",
      ),
    );
    const concernedPose = PNG.sync.read(concernedPoseBytes);
    const composer = await readFile(
      path.join(reviewDirectory, "compose-mimiku-calibration.mjs"),
      "utf8",
    );

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
    expect(reviewIndex).toContain(
      "Mimiku calibration approved at exact recorded hashes.",
    );
    expect(reviewIndex).toContain("[data-live-caption] a {");
    expect(reviewIndex).toContain("[data-live-caption] a:focus-visible {");
    expect(reviewIndex).toContain("Decisions are recorded per family");
    expect(reviewIndex).toContain("Mimiku calibration approved");
    expect(reviewIndex).not.toContain("no decision is recorded yet");
    expect(createHash("sha256").update(rejectedSample).digest("hex")).toBe(
      "1278f447346866922f2ae7512dfdea52d52106ef5d01d704bc611ae4b118bbe2",
    );
    expect(derivedPoses.width).toBe(2172);
    expect(derivedPoses.height).toBe(724);
    expect(hasTransparentPixel(derivedPoses)).toBe(true);
    expect(createHash("sha256").update(derivedPoseBytes).digest("hex")).toBe(
      "58ae3b608fa60527014abc4db858b57b5a07efe364fd30916702ec156f9bb8da",
    );
    expect(concernedPose.width).toBe(1254);
    expect(concernedPose.height).toBe(1254);
    expect(hasTransparentPixel(concernedPose)).toBe(true);
    expect(createHash("sha256").update(concernedPoseBytes).digest("hex")).toBe(
      "8e633a8ce64dc36162eff875c702ec0d2ce6fb18e654c662ad3efb4fbf76ab6c",
    );
    expect(composer).toContain("mimiku-idle.png");
    expect(composer).toContain("mimiku-derived-poses.png");
    expect(composer).toContain("mimiku-concerned-pose.png");
    expect(composer).toContain("mimiku-states-calibration.png");
  });

  it("rebuilds the wordmark from the canonical Mimiku pixel lineage", async () => {
    const reviewDirectory = path.dirname(reviewManifestPath);
    const audit = await readFile(wordmarkLineageAuditPath, "utf8");
    const reviewIndex = await readFile(reviewIndexPath, "utf8");
    const rejectedSample = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "rejected",
        "wordmark-calibration-e1dde795.png",
      ),
    );
    const composer = await readFile(
      path.join(reviewDirectory, "compose-wordmark-calibration.mjs"),
      "utf8",
    );
    const selectedV11Bytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "wordmark-synthesis",
        "wordmark-synthesis-v11.png",
      ),
    );
    const selectedV11 = PNG.sync.read(selectedV11Bytes);
    const derivedSourceBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "derivations",
        "wordmark-pixel-source.png",
      ),
    );
    const derivedSource = PNG.sync.read(derivedSourceBytes);

    expect(createHash("sha256").update(rejectedSample).digest("hex")).toBe(
      "e1dde795ca8873543d44cd7735477cc7766459790ecd10a8dac3eec1927a365e",
    );
    expect(audit).toContain(
      "docs/design/assets/sources/mimiku/mimiku-master.png",
    );
    expect(audit).toContain(
      "docs/design/assets/sources/mimiku/mimiku-model-sheet.png",
    );
    expect(audit).toContain("pixel-art style authority");
    expect(audit).toContain("rejected/superseded");
    expect(derivedSource.width).toBe(2172);
    expect(derivedSource.height).toBe(724);
    expect(hasTransparentPixel(derivedSource)).toBe(true);
    expect(createHash("sha256").update(derivedSourceBytes).digest("hex")).toBe(
      "74c2c21e1dcf78732528f205987f572fce96fb5305b7ebd1a4da586157368fa2",
    );
    expect(selectedV11.width).toBe(1947);
    expect(selectedV11.height).toBe(808);
    expect(hasTransparentPixel(selectedV11)).toBe(true);
    expect(createHash("sha256").update(selectedV11Bytes).digest("hex")).toBe(
      "d80f9ef5e4273d05ab8a61fe2da01cb4fc3ebfd68486eaef0157c86623c3b189",
    );
    expect(composer).toContain("wordmark-synthesis-v11.png");
    expect(composer).not.toContain('"derivations"');
    expect(composer).toContain("containNearest");
    expect(composer).toContain("zeroTransparentRgb(output)");
    expect(composer).toContain("wordmark-calibration.png");
    expect(reviewIndex).toContain(
      "Wordmark calibration approved · exact hash and staged canvases recorded.",
    );
    expect(reviewIndex).toContain("wordmark-synthesis-v11.png");
  });

  it("presents the icon calibration with source, runtime, scale, grayscale, and safe-zone controls", async () => {
    const html = await readFile(iconsCalibrationReviewPath, "utf8");
    const taskBoardReview = await readFile(taskBoardVariantsReviewPath, "utf8");
    const reviewDirectory = path.dirname(reviewManifestPath);
    const rejectedBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "rejected",
        "icons-calibration-5d6eb7fa.png",
      ),
    );
    const coarseReplacementBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "rejected",
        "icons-calibration-28a1add6.png",
      ),
    );
    const replacementSourceBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "derivations",
        "icons-calibration-v03-source.png",
      ),
    );
    const replacementSource = PNG.sync.read(replacementSourceBytes);
    const approvedNavigationSourceBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "derivations",
        "icons-navigation-v04-source.png",
      ),
    );
    const approvedNavigationSource = PNG.sync.read(
      approvedNavigationSourceBytes,
    );
    const selectedTaskBoardBytes = await readFile(
      path.join(
        reviewDirectory,
        "samples",
        "task-board-variants",
        "task-board-a-adventurer-contract.png",
      ),
    );
    const selectedTaskBoard = PNG.sync.read(selectedTaskBoardBytes);
    const composer = await readFile(
      path.join(reviewDirectory, "compose-icons-calibration.mjs"),
      "utf8",
    );

    for (const reference of [
      "samples/icons-calibration.png",
      "../../sources/pixel-ui/icons-ui.png",
      "../../../../../icon.png",
      "../../../../../web/public/icons/icon-512.png",
      "../../../../../web/public/icons/icon-maskable-512.png",
    ]) {
      expect(html).toContain(reference);
    }

    for (const size of ["16", "32", "48", "192"]) {
      expect(html).toContain(`data-preview-size="${size}"`);
    }

    expect(html).toContain("data-grayscale-review");
    expect(html).toContain("data-maskable-safe-zone");
    expect(html).toContain("Named future consumers");
    expect(html).toContain("Live-HTML boundary");
    expect(html).toContain("Self-check findings");
    expect(html).toContain(
      "Primary-navigation, Mode, record-expense Action, Event / Status, Install / Favicon, and Maskable directions are approved at exact hashes",
    );
    expect(html).toContain("icons-calibration-5d6eb7fa.png");
    expect(html).toContain("icons-calibration-28a1add6.png");
    expect(createHash("sha256").update(rejectedBytes).digest("hex")).toBe(
      "5d6eb7faef38e2ca371f106036ffe25d4678c2178a6e28433bf27293108713e4",
    );
    expect(createHash("sha256").update(coarseReplacementBytes).digest("hex")).toBe(
      "28a1add69f6a15dcaeb3ffa897659f19c72736750d845de2ec433bb62ad1728c",
    );
    expect(replacementSource.width).toBeGreaterThanOrEqual(1024);
    expect(replacementSource.height).toBe(replacementSource.width);
    expect(hasTransparentPixel(replacementSource)).toBe(true);
    expect(createHash("sha256").update(replacementSourceBytes).digest("hex")).toBe(
      "e3a8fba0c07b2c4e53a9fa8722afbbbfc0c64207050d252dba3a97082a8323c2",
    );
    expect(approvedNavigationSource.width).toBe(2172);
    expect(approvedNavigationSource.height).toBe(724);
    expect(hasTransparentPixel(approvedNavigationSource)).toBe(true);
    expect(
      createHash("sha256")
        .update(approvedNavigationSourceBytes)
        .digest("hex"),
    ).toBe("3e9284c6666723c1d58a437063cd823bfee62d5acfdf682eaf54d5123c618cea");
    expect(selectedTaskBoard.width).toBe(1254);
    expect(selectedTaskBoard.height).toBe(1254);
    expect(hasTransparentPixel(selectedTaskBoard)).toBe(true);
    expect(createHash("sha256").update(selectedTaskBoardBytes).digest("hex")).toBe(
      "3cb0cfd4d0b91e1e58f09ad69777dc72ce89944fc982a3c46c12817e68b72856",
    );
    expect(html).toContain("icons-navigation-v04-source.png");
    expect(html).toContain("task-board-a-adventurer-contract.png");
    expect(html).toContain(
      "Primary navigation direction approved; Icons family calibration approved",
    );
    expect(taskBoardReview).toContain('data-selected="true"');
    expect(taskBoardReview).toContain("A · 冒險委託板 · 已選定");
    expect(composer).toContain("icons-calibration-v03-source.png");
    expect(composer).toContain("icons-navigation-v04-source.png");
    expect(composer).toContain("task-board-a-adventurer-contract.png");
    expect(composer).toContain("selectedTaskBoard");
    expect(composer).toContain("composeNavigationRow");
    expect(composer).toContain("icons-calibration.png");
    expect(composer).toContain("resizeNearest");
    expect(composer).toContain("zeroTransparentRgb(output)");
  });

  it("keeps the selected task board full-sized without sleeve leakage", async () => {
    const reviewDirectory = path.dirname(reviewManifestPath);
    const calibration = PNG.sync.read(
      await readFile(
        path.join(reviewDirectory, "samples", "icons-calibration.png"),
      ),
    );

    expect(
      countBlueDominantPixels(calibration, {
        left: 615,
        top: 486,
        width: 191,
        height: 242,
      }),
    ).toBeLessThanOrEqual(10);
    expect(
      findOpaqueBounds(
        calibration,
        { left: 615, top: 486, width: 191, height: 242 },
        16,
      ).width,
    ).toBeGreaterThanOrEqual(180);
  });

  it("presents the three mode icons at master, 48px, and grayscale scales", async () => {
    const html = await readFile(modesCalibrationReviewPath, "utf8");

    expect(html.match(/data-mode=/g)).toHaveLength(3);
    expect(html.match(/data-decision="approved"/g)).toHaveLength(3);
    expect(html).toContain('data-mode="personal"');
    expect(html).toContain('data-mode="shared"');
    expect(html).toContain('data-mode="pooled"');
    expect(html).toContain("samples/icons-calibration.png");
    expect(html.match(/data-preview-size="48"/g)).toHaveLength(3);
    expect(html.match(/data-grayscale-preview/g)).toHaveLength(3);
    expect(html).toContain(
      "Mode icon directions approved — personal wallet, shared receipts, and pooled open chest.",
    );
    expect(html).toContain(
      "The complete Icons family calibration is approved; no runtime asset changes here.",
    );
  });

  it("records approval of the record-expense Action without promoting it to runtime", async () => {
    const html = await readFile(recordExpenseActionReviewPath, "utf8");

    expect(html).toContain('data-action="record-expense"');
    expect(html).toContain('data-decision="approved"');
    expect(html).toContain("record-expense-action-v01.png");
    expect(html).toContain('data-preview-size="48"');
    expect(html).toContain("data-grayscale-preview");
    expect(html).toContain("data-family-control");
    expect(html).toContain("記一筆支出");
    expect(html).toContain("live HTML");
    expect(html).toContain(
      "Record-expense Action icon approved — quill, loose ledger page, and subordinate coin.",
    );
    expect(html).toContain(
      "The complete Icons family calibration is approved; no runtime asset changes here.",
    );
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
    ) {
      return true;
    }
  }

  return false;
}

function countBlueDominantPixels(
  png: PNG,
  region: { left: number; top: number; width: number; height: number },
): number {
  let count = 0;

  for (let y = region.top; y < region.top + region.height; y += 1) {
    for (let x = region.left; x < region.left + region.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const alpha = png.data[offset + 3];

      if (
        alpha > 0 &&
        blue > 35 &&
        blue > red * 1.18 &&
        blue > green * 1.08
      ) {
        count += 1;
      }
    }
  }

  return count;
}

function findOpaqueBounds(
  png: PNG,
  region: { left: number; top: number; width: number; height: number },
  alphaThreshold: number,
): { width: number; height: number } {
  let minX = region.left + region.width;
  let minY = region.top + region.height;
  let maxX = region.left - 1;
  let maxY = region.top - 1;

  for (let y = region.top; y < region.top + region.height; y += 1) {
    for (let x = region.left; x < region.left + region.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] < alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    width: Math.max(0, maxX - minX + 1),
    height: Math.max(0, maxY - minY + 1),
  };
}
