import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const approved = join(root, "docs/design/assets/approved/page-visual-v1");
const manifestPath = join(approved, "production-asset-manifest.json");
const runtime = "web/public/pixel-ui/v1";
const phase2a = [
  "frames/frame-dialogue.png",
  "props/landing/torch-high-desktop.png",
  "props/landing/torch-low-desktop.png",
  "props/landing/torch-phone.png",
  ...["desktop", "phone"].flatMap((variant) => [
    `scenes/landing/${variant}-architecture.png`,
    `scenes/landing/${variant}-ground-light.png`,
    ...["mimiku", "ranger", "warrior"].map(
      (actor) => `scenes/landing/actors/${actor}-${variant}.png`,
    ),
    ...["bats", "wall-carving-hidden", "chest-closed", "map-crate", "sign"].map(
      (prop) => `props/landing/${prop}-${variant}.png`,
    ),
    `props/shared/campfire-${variant}.png`,
    `motion/title-blink-${variant}.png`,
  ]),
];

const phase2b = ["desktop", "phone"].flatMap((variant) => [
  ...["latch-release", "unlatched", "cracked", "half-open", "opening-wide", "near-open", "open"]
    .map((frame) => `props/landing/chest-${frame}-${variant}.png`),
  `props/landing/wall-carving-revealed-${variant}.png`,
  `motion/campfire-${variant}.png`,
]);
const phase2c = ["desktop", "phone"].flatMap((variant) => [
  `scenes/home/${variant}-architecture.png`,
  `scenes/home/${variant}-ground-light.png`,
  `scenes/home/actors/mimiku-${variant}.png`,
  `motion/mimiku-idle-${variant}.png`,
  `motion/mimiku-record-ledger-${variant}.png`,
]);
const phase2d = [
  ...["nav-home", "nav-adventure-log", "nav-guild", "nav-tasks", "nav-settings", "action-record-expense"]
    .map((name) => `icons/ui/${name}.png`),
];
const installIcons = ["favicon-16", "favicon-32", "icon-192", "icon-512", "icon-maskable-192", "icon-maskable-512"];
const phase2e = installIcons.map((name) => `icons/install-warm/${name}.png`);

const phase2e1 = [
  "frames/frames.json",
  "motion/motion-timing.json",
  "scenes/home/layout.json",
  "scenes/landing/layout.json",
];

const dispositions = new Map([
  ...phase2a.map((path) => [path, "promoted-phase-2a"]),
  ...phase2b.map((path) => [path, "promoted-phase-2b"]),
  ...phase2c.map((path) => [path, "promoted-phase-2c"]),
  ...phase2d.map((path) => [path, "promoted-phase-2d"]),
  ...phase2e1.map((path) => [path, "promoted-phase-2e1"]),
  ...phase2e.map((path) => [path, "promoted-phase-2e"]),
]);
const selections = new Map([
  ["--phase-2d", { paths: phase2d, label: "Phase 2D" }],
  ["--phase-2e1", { paths: phase2e1, label: "Phase 2E-1" }],
  ["--phase-2e", { paths: phase2e, label: "Phase 2E" }],
]);
const args = process.argv.slice(2);
const selection = args.length ? selections.get(args[0]) : {
  paths: [...dispositions.keys()],
  label: "Phase 2A–2E",
};
if (args.length > 1 || !selection) {
  throw new Error("Usage: npm run assets:promote -- [--phase-2d|--phase-2e1|--phase-2e]");
}

const manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
const assets = selection.paths.map((path) => {
  const asset = manifest.assets.find((entry) => entry.path === path);
  if (!asset) throw new Error(`Missing approved manifest entry: ${path}`);
  return asset;
});

async function verifyHash(file, asset) {
  const hash = createHash("sha256").update(await readFile(file)).digest("hex");
  if (hash !== asset.sha256) throw new Error(`SHA-256 mismatch: ${file}`);
}

// Validate every source before changing any runtime file.
for (const asset of assets) await verifyHash(join(approved, asset.path), asset);

for (const asset of assets) {
  const target = `${runtime}/${asset.path}`;
  const destination = join(root, target);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(approved, asset.path), destination);
  await verifyHash(destination, asset);
  asset.runtime_target = target;
  asset.disposition = dispositions.get(asset.path);
}

const updated = JSON.stringify(manifest, null, 2) + "\n";
const formatted = manifestText.includes("\r\n") ? updated.replaceAll("\n", "\r\n") : updated;
if (formatted !== manifestText) await writeFile(manifestPath, formatted);
if (selection.paths.includes(phase2e[0])) {
  for (const name of installIcons) {
    await rm(join(root, runtime, "icons/install", `${name}.png`), { force: true });
  }
}
console.log(`Verified SHA-256 for ${assets.length} ${selection.label} assets.`);
