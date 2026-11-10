import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const approved = join(root, "docs/design/assets/approved/page-visual-v1");
const manifestPath = join(approved, "production-asset-manifest.json");
const runtime = "web/public/pixel-ui/v1";
const paths = [
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

const manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
const assets = paths.map((path) => {
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
  asset.disposition = "promoted-phase-2a";
}

const updated = JSON.stringify(manifest, null, 2) + "\n";
const formatted = manifestText.includes("\r\n") ? updated.replaceAll("\n", "\r\n") : updated;
if (formatted !== manifestText) await writeFile(manifestPath, formatted);
console.log(`Verified SHA-256 for ${assets.length} Phase 2A assets.`);
