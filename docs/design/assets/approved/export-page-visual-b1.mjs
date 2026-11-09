import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
const review = "docs/design/assets/reviews/2026-09-18-page-visual-phase-1";
const output = path.join(here, "page-visual-v1");
const check = process.argv.includes("--check");
const { PNG } = createRequire(path.join(root, "web/package.json"))("pngjs");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (file) => readFileSync(path.join(root, file));
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const qualify = (file) => file.startsWith("docs/") ? file : review + "/" + file;

function source(record) {
  const ref = typeof record === "string" ? { path: record } : record;
  const file = qualify(ref.path);
  assert.ok(file.startsWith(review + "/") && !file.split("/").includes(".."), file);
  const bytes = read(file);
  const sha256 = hash(bytes);
  if (ref.sha256) assert.equal(sha256, ref.sha256, file);
  return { path: file, sha256, bytes };
}

function reviewJson(file, sha256) {
  return JSON.parse(source({ path: file, sha256 }).bytes);
}

const gate = reviewJson("review-manifest.json");
const assets = new Map();
const payloads = new Map();
const hashes = new Set();

function stage(file, inputs, options = {}) {
  assert.ok(!assets.has(file), file);
  const sources = inputs.map(source);
  let bytes = options.data ? json(options.data) : sources[0].bytes;
  let method = options.data ? "project-review-metadata" : "copy";
  let width = null, height = null, frameWidth = null, frameHeight = null, alpha = null;
  let frames = 0;
  if (file.endsWith(".png")) {
    const images = sources.map(({ bytes }) => PNG.sync.read(bytes));
    const first = images[0];
    frames = images.length;
    frameWidth = options.canvas?.width ?? first.width;
    frameHeight = options.canvas?.height ?? first.height;
    width = frameWidth * frames;
    height = frameHeight;
    let image = first;
    if (options.canvas) {
      const { crop, x, y } = options.canvas;
      image = new PNG({ width, height });
      image.data.fill(0);
      PNG.bitblt(first, image, ...crop, x, y);
      method = "crop-and-pad";
    } else if (frames > 1) {
      image = new PNG({ width, height });
      for (const [index, frame] of images.entries()) {
        assert.deepEqual([frame.width, frame.height], [frameWidth, frameHeight], file);
        PNG.bitblt(frame, image, 0, 0, frameWidth, frameHeight, index * frameWidth, 0);
      }
      method = "horizontal-sprite-sheet";
    }
    if (options.size) assert.deepEqual([width, height], options.size, file);
    if (method !== "copy") bytes = PNG.sync.write(image);
    if (hashes.has(hash(bytes)) && method === "copy") {
      // Preserve separately named scene layers and chest states even when their pixels match.
      for (let filterType = 0; filterType <= 4 && hashes.has(hash(bytes)); filterType++) {
        bytes = PNG.sync.write(image, { filterType });
      }
      method = "lossless-png-reencode";
    }
    alpha = image.data.some((value, index) => index % 4 === 3 && value < 255);
    assert.equal(alpha, options.alpha ?? true, file);
  }
  const sha256 = hash(bytes);
  assert.ok(!hashes.has(sha256), `Duplicate export bytes: ${file}`);
  hashes.add(sha256);
  const familyId = { mimiku: "mimiku-states" }[file.split("/")[0]] ?? file.split("/")[0];
  const family = gate.families.find(({ id }) => id === familyId);
  const record = {
    path: file,
    sources: sources.map(({ path, sha256 }) => ({ path, sha256 })),
    export_method: method,
    ...(options.canvas ? { canvas: options.canvas } : {}),
    sha256, width, height, frames, frame_width: frameWidth, frame_height: frameHeight, alpha,
    css_size: options.css ?? (frames ? `${frameWidth} × ${frameHeight} logical px` : "data only"),
    consumer: options.consumer ?? family.consumers.join(", "),
    loading: options.loading ?? "Load only with the named consumer after promotion.",
    accessibility: options.accessibility ?? family.accessibility,
    fallback: family.fallback,
    reduced_motion: options.reducedMotion ?? "Static asset.",
    runtime_target: null,
    disposition: "staged-only-until-consumer-plan",
  };
  assets.set(file, record);
  payloads.set(file, bytes);
  return record;
}

function visibleCrop(image, startX, endX) {
  let left = endX, top = image.height, right = -1, bottom = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = startX; x < endX; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  assert.ok(right >= left, "Wordmark region has no visible pixels");
  return [left, top, right - left + 1, bottom - top + 1];
}

const wordmark = gate.families.find(({ id }) => id === "wordmark").sample;
const wordmarkImage = PNG.sync.read(source(wordmark).bytes);
// The calibration sheet places the display at left and the compact at right.
const wordmarkSplit = 932;
const padding = 8;
for (const [id, startX, endX, css] of [
  ["display", 0, wordmarkSplit, "240–640 CSS px wide"],
  ["compact", wordmarkSplit, wordmarkImage.width, "96–220 CSS px wide"],
]) {
  const crop = visibleCrop(wordmarkImage, startX, endX);
  const canvas = {
    width: crop[2] + 2 * padding, height: crop[3] + 2 * padding, crop,
    x: padding, y: padding,
  };
  stage(`wordmark/mimic-wordmark-${id}.png`, [wordmark], { canvas, css });
}

for (const name of ["install-favicon", "maskable-icons"]) {
  for (const icon of reviewJson(name + ".manifest.json").outputs) {
    if (icon.id === "icon-48") continue;
    const id = name === "maskable-icons" ? "icon-" + icon.id : icon.id;
    stage(`icons/install/${id}.png`, [icon], {
      size: [icon.width, icon.height], alpha: !icon.opaque,
      consumer: id.startsWith("favicon") ? "Browser favicon" : "Web app install manifest",
      css: "Browser-managed native icon size",
    });
  }
}
for (const name of ["icon-optical-evidence", "event-status-icons"]) {
  for (const icon of reviewJson(name + ".manifest.json").icons) {
    stage(`icons/ui/${icon.id}.png`, [icon.optical48], { size: [48, 48] });
  }
}
for (const { id, master } of reviewJson("mimiku-states-actions.manifest.json").poses) {
  if (id.startsWith("state-")) stage(`mimiku/${id}.png`, [master], { size: [512, 512] });
}

const landingRef = {
  path: "landing-prop-placement-application.manifest.json",
  sha256: "8084940578e2409aae4c59ffea6adfc7ac17e416ca61367a205c1e85105e0e8c",
};
const stripRef = {
  path: "landing-phone-exploration-3r3.manifest.json",
  sha256: "a933d9a6a2d667dbc92e489c01465cbe7e152771a019bf6f82486097a07d516e",
};
const homeRef = {
  path: "home-base-v02.manifest.json",
  sha256: "35e1b6abfb065f9466f49c40805d5c0ab57254ac537ecbabe1d01878592da371",
};
const carvingRef = {
  path: "props-calibration-v04.manifest.json",
  sha256: "bcee8473f6041f81bef4adf875980c8c98831665ebc937afacf7a3962b377bc6",
};
const motionRef = {
  path: "motion-calibration-v02r.manifest.json",
  sha256: "53c0ea3dd812b52b5e882d2b5031383e575e9c5c7a5ff47ba1b226658fb4f0a3",
};
const landing = reviewJson(landingRef.path, landingRef.sha256);
const strip = reviewJson(stripRef.path, stripRef.sha256).layout;
const home = reviewJson(homeRef.path, homeRef.sha256);
const motion = reviewJson(motionRef.path, motionRef.sha256);
const carving = reviewJson(carvingRef.path, carvingRef.sha256);
const variants = ["desktop", "phone"];
const actors = ["warrior", "ranger", "mimiku"];
const motionNames = {
  title: "title-blink", idle: "mimiku-idle", ledger: "mimiku-record-ledger",
  celebration: "mimiku-adventure-complete", fire: "campfire",
};
const sheetPath = (id, view) => `motion/${motionNames[id]}-${view}.png`;
const desktop = landing.scenes.desktop;
const desktopChest = { ...landing.chestOrigin, ground: { x: 294, y: 340 }, depth: 340 };
const landingLayers = {
  desktop: [
    ...desktop.fixed.filter(({ id }) => id !== "carving"),
    { id: "mapCrate", ...desktop.crate.sprite, x: desktop.crate.x, y: desktop.crate.y,
      ground: desktop.crate.ground, depth: desktop.crate.ground.y },
    { id: "chest", ...desktopChest },
  ],
  phone: strip.layers,
};
const propNames = {
  torchHigh: "torch-high", torchLow: "torch-low", torch: "torch", bats: "bats",
  explorationBats: "bats", mapCrate: "map-crate", sign: "sign",
};
const landingLayout = {};
const homeLayout = {};
const timing = {};
const featureRef = {
  path: "props-calibration-v02.manifest.json",
  sha256: "af36437fbddd592e6c74160c3a6c7722b0b7e1f24770bd2bb49db955b65597a5",
};
const feature = reviewJson(featureRef.path, featureRef.sha256);

function ref(file) {
  const { sha256 } = assets.get(file);
  return { asset_id: file, sha256 };
}

function layer(input, file) {
  const { id, x = 0, y = 0, depth, ground, opacity } = input;
  const asset = assets.get(file);
  return {
    id, x, y, width: asset.frame_width, height: asset.frame_height, depth,
    ...(ground || depth > 0 ? { ground: ground ?? { x: x + asset.frame_width / 2, y: depth } } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...ref(file),
  };
}

function safeZones(guidance) {
  return {
    floor: guidance.floor,
    dialogue: guidance.dialogue,
    forbidden: guidance.forbidden.map(({ id, x, y, width, height }) => ({
      id, x, y, width, height,
    })),
  };
}

for (const view of variants) {
  const isPhone = view === "phone";
  const scene = isPhone ? strip.scene : desktop.architecture;
  const layers = landingLayers[view];
  const landingPrefix = "scenes/landing";
  const homePrefix = "scenes/home";
  const sharedFire = `props/shared/campfire-${view}.png`;
  const landingArchitecture = `${landingPrefix}/${view}-architecture.png`;
  const homeArchitecture = `${homePrefix}/${view}-architecture.png`;
  const landingGround = `${landingPrefix}/${view}-ground-light.png`;
  const homeGround = `${homePrefix}/${view}-ground-light.png`;
  const homeMimiku = `${homePrefix}/actors/mimiku-${view}.png`;
  const homeFrame = home.frames[view];
  const findLayer = (id) => layers.find((item) => item.id === id);

  stage(landingArchitecture, [scene], { size: [isPhone ? 1170 : 960, isPhone ? 600 : 540], alpha: false });
  stage(homeArchitecture, [homeFrame.architecture], { size: [isPhone ? 390 : 960, isPhone ? 600 : 540], alpha: false });
  stage(landingGround, [findLayer("groundLight")]);
  stage(homeGround, [homeFrame.groundLight]);
  stage(sharedFire, [findLayer("fire")], { consumer: "Landing and Home scene campfire" });
  stage(homeMimiku, [homeFrame.mimiku]);
  const actorPaths = Object.fromEntries(actors.map((id) => {
    const file = `${landingPrefix}/actors/${id}-${view}.png`;
    stage(file, [findLayer(id)]);
    return [id, file];
  }));

  const props = new Map();
  for (const input of layers.filter(({ id }) => id in propNames)) {
    const file = `props/landing/${propNames[input.id]}-${view}.png`;
    if (!assets.has(file)) stage(file, [input]);
    else assert.equal(source(input).sha256, assets.get(file).sources[0].sha256);
    props.set(input.id, file);
  }
  const chestVariants = Object.fromEntries(Object.entries(landing.chestFrames).map(([state, frame]) => {
    const file = `props/landing/chest-${state}-${view}.png`;
    const input = isPhone ? findLayer("chest").variants[state] : frame.sprite;
    stage(file, [input], { size: isPhone ? [110, 126] : [156, 180] });
    return [state, ref(file)];
  }));
  const carvingPlacement = carving.scenes[view].objects.find(({ id }) => id === "carving");
  const carvingVariants = Object.fromEntries(["hidden", "revealed"].map((state) => {
    const file = `props/landing/wall-carving-${state}-${view}.png`;
    const input = carvingPlacement.variants[state];
    stage(file, [input], { size: isPhone ? [54, 36] : [72, 48] });
    return [state, ref(file)];
  }));

  timing[view] = {};
  for (const id of Object.keys(motionNames)) {
    const sequence = motion.sequences[id][view];
    const inputs = id === "idle" ? [...sequence, motion.idleBlink.frames[view]] : sequence;
    const file = sheetPath(id, view);
    const end = { title: "frame 0", idle: "frame 0", fire: "frame 0",
      ledger: "frame 4", celebration: "idle frame 0" }[id];
    stage(file, inputs, {
      consumer: id === "title" ? "Landing title" : id === "fire" ? "Landing and Home campfire" : "Home Mimiku",
      reducedMotion: `Hold ${end}.`,
      loading: id === "ledger" || id === "celebration" ? "On demand with the action." : "With the scene.",
    });
    timing[view][id] = { ...ref(file), frames: inputs.length, frame_ms: inputs.map(({ ms }) => ms),
      reduced_motion_final: end };
  }
  const landingPlaced = layers.map((input) => {
    const { id } = input;
    if (id === "chest") return { ...layer(input, chestVariants.closed.asset_id), variants: chestVariants };
    return layer(input, props.get(id) ?? actorPaths[id] ?? {
      wordmark: sheetPath("title", view), groundLight: landingGround, fire: sharedFire,
    }[id]);
  });
  const hidden = carvingVariants.hidden.asset_id;
  landingPlaced.push({ ...layer({ ...carvingPlacement, depth: -100 }, hidden),
    variants: carvingVariants });
  landingLayout[view] = {
    width: scene.width, height: scene.height, viewportWidth: isPhone ? strip.viewportWidth : scene.width,
    initialViewportX: isPhone ? strip.initialViewportX : 0,
    architecture: ref(landingArchitecture),
    signLabel: isPhone ? strip.signLabel : carving.scenes.desktop.signLabel,
    safeZones: safeZones(carving.scenes[view].guidance),
    layers: landingPlaced.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id, "en")),
  };
  const slots = Object.fromEntries(Object.entries(homeFrame.slots).map(([id, slot]) => [
    id, { asset_id: `avatars/${id}-full.png`, x: slot.x, y: slot.y, width: slot.width,
      height: slot.height, ground: slot.ground, scale: slot.scale, depth: slot.ground[1] },
  ]));
  homeLayout[view] = {
    width: homeFrame.width, height: homeFrame.height, architecture: ref(homeArchitecture),
    safeZones: homeFrame.zones, avatarSlots: slots,
    layers: [
      layer(homeFrame.groundLight, homeGround),
      layer(homeFrame.fire, sharedFire),
      layer({ ...homeFrame.mimiku, id: "mimiku", depth: homeFrame.mimiku.ground[1] }, homeMimiku),
    ],
  };
}
for (const id of ["personal", "shared", "pooled", "tasks"]) {
  stage(`props/feature/${id}.png`, [feature.features[id]], { size: [256, 256] });
}
const framesPath = "samples/frames-2r/frames.json";
const framesHash = "51d1edf28c539c4a751b706dd0a435b6657345b69b828c81812d1387e2a07d6c";
const frames = reviewJson(framesPath, framesHash);
for (const frame of Object.values(frames.frames)) {
  stage(`frames/${frame.file}`, [{ path: `samples/frames-2r/${frame.file}`, sha256: frame.sha256 }], {
    size: [frame.width, frame.height], css: `${frame.slice * frame.scale} CSS px nine-slice corners`,
  });
}
stage("frames/frames.json", [{ path: framesPath, sha256: framesHash }]);
stage("scenes/landing/layout.json", [landingRef, stripRef, carvingRef, motionRef], { data: landingLayout });
stage("scenes/home/layout.json", [homeRef], { data: homeLayout });
stage("motion/motion-timing.json", [motionRef, "motion-calibration-v02r.js"], {
  data: {
    variants: timing,
    playback: {
      title: { trigger: "Visible on Landing or named title button", interval_ms: [8000, 15000], mode: "once", skip: null },
      idle: { trigger: "Home idle", mode: "loop frames 0–1", blink_frame: 2,
        blink_interval_ms: [motion.idleBlink.minMs, motion.idleBlink.maxMs], skip: null },
      fire: { trigger: "Landing or Home scene active", mode: "loop", skip: null },
      ledger: { trigger: "Home record completion", mode: "once", skip: null },
      celebration: { trigger: "First Home adventure completion", mode: "once per visit",
        skip: ["Skip button", "Escape"] },
    },
    primary_exclusion: {
      actions: ["ledger", "celebration"],
      interruption: "Finish the current primary before starting the next one.",
      idle_suppressed_by: ["ledger", "celebration", "chest", "carving"],
    },
    pause: "Pause on hidden page or explicit pause. Reduced motion shows the listed final frames.",
  },
});

function write(file, bytes) {
  const destination = path.join(output, file);
  if (check) {
    assert.ok(readFileSync(destination).equals(bytes), `Rebuild differs: ${file}`);
    return;
  }
  if (existsSync(destination) && readFileSync(destination).equals(bytes)) return;
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
}

const manifestFile = "production-asset-manifest.json";
const manifestPath = path.join(output, manifestFile);
const currentManifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : null;
const b1Manifest = {
  schema_version: 1, gate: "B1",
  assets: [...assets.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
};
if (currentManifest?.gate === "B2-2") {
  assert.ok(check, "The Gate B2-2 manifest is complete. Use --check to verify the B1 subset.");
  assert.equal(currentManifest.schema_version, b1Manifest.schema_version);
  assert.deepEqual(
    currentManifest.assets.filter((asset) => assets.has(asset.path)),
    b1Manifest.assets,
    "B1 entries differ from the complete manifest",
  );
}
for (const [file, bytes] of payloads) write(file, bytes);
if (currentManifest?.gate !== "B2-2") write(manifestFile, json(b1Manifest));
console.log(check
  ? `B1: ${assets.size} assets rebuilt byte-identically and manifest entries verified.`
  : `B1: ${assets.size} assets exported.`);
