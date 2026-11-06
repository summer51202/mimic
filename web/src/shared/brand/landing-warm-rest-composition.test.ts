import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const review = path.join(root, "docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
interface Asset { path: string; sha256: string; width: number; height: number }
interface Placed extends Asset { id: string; x: number; y: number }
interface Frame {
  logical: Asset; color: Asset; gray: Asset; layers: Placed[];
  visitor: [number, number, number, number];
}
interface Manifest {
  decision: string; reviewOnly: boolean; runtimePromotion: boolean; stage: string;
  frames: Record<string, Frame>; sources: Record<string, Asset>;
  parents: Record<string, Asset>; references: Record<string, Asset>;
  prompts: { path: string; sha256: string }[];
  lineage: { path: string; sha256: string; entries: Record<string, { path: string; parentPath: string; promptPath: string; generator: string; transparent: boolean }> };
  wordmarkPlacement: Record<"desktop" | "phone", [number, number, number]>;
}
async function load() {
  const file = path.join(review, "landing-warm-rest.manifest.json");
  expect(existsSync(file), "new composition manifest is required").toBe(true);
  return JSON.parse(await readFile(file, "utf8")) as Manifest;
}
async function png(asset: Asset) {
  const bytes = await readFile(path.join(root, asset.path));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
  const image = PNG.sync.read(bytes);
  expect([image.width, image.height]).toEqual([asset.width, asset.height]);
  return image;
}
function overlaps(a: Placed, ap: PNG, b: Placed, bp: PNG, topFraction = 1) {
  let count = 0;
  for (let y = 0; y < Math.ceil(ap.height * topFraction); y++) {
    for (let x = 0; x < ap.width; x++) {
      const bx = a.x + x - b.x, by = a.y + y - b.y;
      if (bx < 0 || by < 0 || bx >= bp.width || by >= bp.height) continue;
      if (ap.data[(y * ap.width + x) * 4 + 3] && bp.data[(by * bp.width + bx) * 4 + 3]) count++;
    }
  }
  return count;
}

it("keeps two unapproved composition drafts and immutable asset lineage", async () => {
  const m = await load();
  expect(m).toMatchObject({ decision: "awaiting-calibration", reviewOnly: true, runtimePromotion: false, stage: "rough-composition" });
  expect(Object.keys(m.frames)).toEqual(["A-desktop", "A-phone", "B-desktop", "B-phone"]);
  for (const asset of [...Object.values(m.sources), ...Object.values(m.parents), ...Object.values(m.references)]) {
    expect(asset.path).toMatch(/^docs\/design\/assets\/reviews\/2026-09-18-page-visual-phase-1\//);
    await png(asset);
  }
  expect(m.prompts).toHaveLength(7);
  for (const prompt of m.prompts) expect(createHash("sha256").update(await readFile(path.join(root, prompt.path))).digest("hex")).toBe(prompt.sha256);
  const lineageBytes = await readFile(path.join(root, m.lineage.path));
  expect(createHash("sha256").update(lineageBytes).digest("hex")).toBe(m.lineage.sha256);
  expect(JSON.parse(lineageBytes.toString())).toEqual(m.lineage.entries);
  expect(Object.keys(m.lineage.entries)).toEqual(["architectureDesktop", "architecturePhone", "warrior", "mage", "ranger", "mimiku", "groundLight"]);
  for (const [id, entry] of Object.entries(m.lineage.entries)) {
    expect(entry.generator).toBe("imagegen");
    expect(entry.path).toBe(m.sources[id].path);
    expect(entry.parentPath).toBe(m.parents[id].path);
    expect(m.prompts.some(p => p.path === entry.promptPath)).toBe(true);
    const image = await png(m.sources[id]);
    let transparent = 0, opaque = 0;
    for (let i = 3; i < image.data.length; i += 4) {
      if (image.data[i] === 0) transparent++;
      if (image.data[i] === 255) opaque++;
    }
    expect(opaque).toBeGreaterThan(0);
    if (entry.transparent) expect(transparent, `${id} raw alpha`).toBeGreaterThan(0);
    else expect(transparent, `${id} opaque architecture`).toBe(0);
  }
  const old = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8"));
  for (const id of ["fire", "mapCrate", "sign"]) expect(m.sources[id].sha256).toBe(old.sources[id].sha256);
  expect(m.references.wordmark.sha256).toBe("5a1cfc2a7d96c15a467c8fa2f3c869d23a3811a096edd121a76a9f952b59760c");
});

it("writes real dimensions, exact 2x pixels, grayscale and clean transparent layers", async () => {
  const m = await load();
  for (const [key, frame] of Object.entries(m.frames)) {
    const phone = key.endsWith("phone");
    expect([frame.logical.width, frame.logical.height]).toEqual(phone ? [390, 600] : [960, 540]);
    expect([frame.color.width, frame.color.height]).toEqual(phone ? [390, 600] : [1920, 1080]);
    const logical = await png(frame.logical), color = await png(frame.color), gray = await png(frame.gray);
    expect([gray.width, gray.height]).toEqual([color.width, color.height]);
    let wrongScale = 0, dirty = 0, notGray = 0;
    for (let y = 0; y < color.height; y++) for (let x = 0; x < color.width; x++) {
      const i = (y * color.width + x) * 4;
      const li = (Math.floor(y / (phone ? 1 : 2)) * logical.width + Math.floor(x / (phone ? 1 : 2))) * 4;
      if (!color.data.subarray(i, i + 4).equals(logical.data.subarray(li, li + 4))) wrongScale++;
      if (gray.data[i] !== gray.data[i + 1] || gray.data[i] !== gray.data[i + 2]) notGray++;
    }
    for (const layer of frame.layers) {
      const image = await png(layer);
      expect(layer.x).toBeGreaterThanOrEqual(0); expect(layer.y).toBeGreaterThanOrEqual(0);
      expect(layer.x + image.width).toBeLessThanOrEqual(logical.width);
      expect(layer.y + image.height).toBeLessThanOrEqual(logical.height);
      let transparent = 0, opaque = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        if (!image.data[i + 3]) { transparent++; if (image.data[i] || image.data[i + 1] || image.data[i + 2]) dirty++; }
        else opaque++;
      }
      expect(transparent).toBeGreaterThan(0); expect(opaque).toBeGreaterThan(0);
    }
    expect(wrongScale).toBe(0); expect(dirty).toBe(0); expect(notGray).toBe(0);
  }
});

it("protects fire, faces, map and an actually empty visitor ground region", async () => {
  const m = await load();
  for (const [key, frame] of Object.entries(m.frames)) {
    const phone = key.endsWith("phone");
    const fire = frame.layers.find(l => l.id === "fire")!, map = frame.layers.find(l => l.id === "mapCrate")!;
    expect(map.width).toBe(phone ? 79 : 113);
    const images = new Map(await Promise.all(frame.layers.map(async l => [l.id, await png(l)] as const)));
    for (const layer of frame.layers.filter(l => !["fire", "groundLight"].includes(l.id))) expect(overlaps(fire, images.get("fire")!, layer, images.get(layer.id)!)).toBe(0);
    const front = frame.layers.filter(l => frame.layers.indexOf(l) > frame.layers.indexOf(map));
    for (const layer of front) expect(overlaps(map, images.get("mapCrate")!, layer, images.get(layer.id)!)).toBe(0);
    for (const figure of frame.layers.filter(l => ["mage", "warrior", "ranger", "mimiku"].includes(l.id))) {
      for (const later of frame.layers.slice(frame.layers.indexOf(figure) + 1)) expect(overlaps(figure, images.get(figure.id)!, later, images.get(later.id)!, 0.7)).toBe(0);
    }
    const [vx, vy, vw, vh] = frame.visitor;
    expect(vw).toBeGreaterThanOrEqual(phone ? 140 : 180); expect(vh).toBeGreaterThanOrEqual(30);
    expect(vy + vh).toBeLessThan(phone ? 432 : 421);
    let blocked = 0;
    for (const layer of frame.layers.filter(l => l.id !== "groundLight")) {
      const image = images.get(layer.id)!;
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        if (layer.x + x >= vx && layer.x + x < vx + vw && layer.y + y >= vy && layer.y + y < vy + vh && image.data[(y * image.width + x) * 4 + 3]) blocked++;
      }
    }
    expect(blocked).toBe(0);
  }
});

it("keeps title clear and compares spacing without changing shared scales", async () => {
  const m = await load();
  for (const view of ["desktop", "phone"] as const) {
    const a = m.frames[`A-${view}`], b = m.frames[`B-${view}`];
    expect(b.visitor[2] * b.visitor[3]).toBeGreaterThan(a.visitor[2] * a.visitor[3]);
    for (const layer of a.layers) expect(b.layers.find(l => l.id === layer.id)!.width).toBe(layer.width);
    for (const frame of [a, b]) {
      const [lx, ly, lw] = m.wordmarkPlacement[view];
      const lh = lw * m.references.wordmark.height / m.references.wordmark.width;
      for (const figure of frame.layers.filter(l => ["mage", "warrior", "ranger", "mimiku", "fire", "bats"].includes(l.id))) {
        expect(lx + lw <= figure.x || lx >= figure.x + figure.width || ly + lh <= figure.y || ly >= figure.y + figure.height).toBe(true);
      }
    }
  }
});
