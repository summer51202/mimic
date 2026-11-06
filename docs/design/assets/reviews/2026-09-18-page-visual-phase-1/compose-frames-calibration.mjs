import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(new URL("../../../../../web/package.json", import.meta.url));
const { PNG } = require("pngjs");
const output = process.argv[2] ?? new URL("./samples/frames/", import.meta.url);
mkdirSync(output, { recursive: true });

const size = 36;
const slice = 10;
const scale = 2;
const brass = "#a18453";
const lightBrass = "#b79556";
const iron = "#322a24";
const dark = "#211a18";

// Rails run from the silhouette toward the field. Grain is confined to the rail.
const materials = {
  parchment: {
    field: "#eddbb3", rails: [null, null, "#4c3725", "#93734b", "#ba9965", "#d7ba83", "#e1c895"],
    grain: ["#ceaf78", "#e1c895"], grainRow: 5,
  },
  wood: {
    field: "#39271e", rails: [null, "#241a16", "#594031", "#946748", "#674632", "#5b3d2e", "#54382a", "#704c34", "#32241d"],
    grain: ["#754d36", "#82593f"], grainRow: 5,
  },
  stone: {
    field: "#ddd2bd", rails: [null, "#312b28", "#67574a", "#887462", "#756458", "#6a5a50", "#6d5d51", "#54463c", "#9c8973"],
    grain: ["#605146", "#7c6a5b"], grainRow: 5,
  },
  dialogue: {
    field: dark, rails: [null, null, "#322923", "#776044", "#a48858", "#49392c", "#352821"],
    grain: ["#836945", "#987c50"], grainRow: 4,
  },
  notebook: {
    field: "#ead7ac", rails: [null, "#30221c", "#684b37", "#956b47", "#775137", "#55392a", "#493129", "#b89763", "#d1b482"],
    grain: ["#6b4932", "#8a6040"], grainRow: 4,
  },
};

function drawFrame(id, { field, rails, grain, grainRow }) {
  const png = new PNG({ width: size, height: size });
  const rect = (x, y, w, h, color, flipX = false, flipY = false) => {
    if (!color) return;
    const rgb = Number.parseInt(color.slice(1), 16);
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        const index = ((flipY ? size - 1 - row : row) * size + (flipX ? size - 1 - col : col)) * 4;
        png.data.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, 255], index);
      }
    }
  };

  const profile = [...rails, ...Array(slice - rails.length).fill(field)];
  for (const flip of [false, true]) {
    profile.forEach((color, depth) => {
      rect(slice, depth, size - 2 * slice, 1, color, false, flip);
      rect(depth, slice, 1, size - 2 * slice, color, flip);
    });
    for (const [offset, length, color] of [[3, 4, grain[0]], [9, 3, grain[1]]]) {
      rect(slice + offset, grainRow, length, 1, color, false, flip);
      rect(grainRow, slice + offset, 1, length, color, flip);
    }
  }
  if (id === "notebook") {
    // Two stitches along the spine, outside the writing area.
    rect(6, 14, 2, 1, brass);
    rect(6, 16, 2, 1, brass);
  }

  for (const flipX of [false, true]) {
    for (const flipY of [false, true]) {
      const corner = (x, y, w, h, color) => rect(x, y, w, h, color, flipX, flipY);
      for (let y = 0; y < slice; y++) {
        for (let x = 0; x < slice; x++) {
          if (x + y >= 5) corner(x, y, 1, 1, profile[Math.min(x, y)]);
        }
      }
      if (id === "dialogue" || id === "parchment") {
        corner(2, 4, 2, 4, iron);
        corner(4, 2, 4, 2, iron);
        corner(3, 3, 2, 2, lightBrass);
        corner(5, 5, 1, 1, brass);
      } else {
        corner(2, 4, 7, 4, iron);
        corner(4, 2, 4, 7, iron);
        corner(3, 4, 1, 3, "#665345");
        corner(4, 3, 3, 1, "#665345");
        corner(5, 5, 2, 2, brass);
        corner(5, 5, 1, 1, lightBrass);
      }
    }
  }
  return PNG.sync.write(png);
}

const frames = {};
for (const [id, material] of Object.entries(materials)) {
  const file = `frame-${id}.png`;
  const bytes = drawFrame(id, material);
  writeFileSync(output instanceof URL ? new URL(file, output) : resolve(output, file), bytes);
  frames[id] = {
    file, sha256: createHash("sha256").update(bytes).digest("hex"),
    width: size, height: size, slice, scale, repeat: "repeat",
    centerToken: `--frame-${id}-field`, centerColor: material.field,
    minPadding: { phone: 16, desktop: 24 },
  };
}
const metadata = output instanceof URL ? new URL("frames.json", output) : resolve(output, "frames.json");
writeFileSync(metadata, JSON.stringify({ decision: "awaiting-visual-review", frames }, null, 2) + "\n");
