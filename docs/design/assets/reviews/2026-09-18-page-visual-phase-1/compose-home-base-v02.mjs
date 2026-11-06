import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { bounds, nearest } from "./landing-chest-raster.mjs";

const dir = import.meta.dirname;
const repo = path.resolve(dir, "../../../../..");
const { PNG } = createRequire(path.join(repo, "web/package.json"))("pngjs");
const check = process.argv.includes("--check");
const read = file => readFile(path.join(dir, file));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const json = async file => JSON.parse(await read(file));
const png = async file => PNG.sync.read(await read(file));
const asset = async file => ({ path: file, sha256: hash(await read(file)) });
const relative = file => path.relative(dir, path.join(repo, file)).replaceAll("\\", "/");
const v01 = await json("home-base.manifest.json");
const landing = await json("landing-prop-placement-application.manifest.json");
const classes = Object.keys(v01.frames.desktop.slots);
assert.equal(classes.length, 8);
let outputs = 0;

async function output(file, bytes) {
  const target = path.join(dir, file);
  if (check) assert.ok((await read(file)).equals(bytes), file + " differs");
  else {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  return { path: file, sha256: hash(bytes), output: ++outputs };
}

async function raster(file, image) {
  const { path, sha256 } = await output(file, PNG.sync.write(image));
  return { path, sha256, width: image.width, height: image.height };
}

function cardMetrics(image, [x, y, width, height]) {
  const luma = (a, b) => {
    const i = (b * image.width + a) * 4;
    return (2126 * image.data[i] + 7152 * image.data[i + 1] + 722 * image.data[i + 2]) / 10000;
  };
  let sum = 0, squared = 0, edges = 0;
  for (let b = y; b < y + height; b++) {
    for (let a = x; a < x + width; a++) {
      const value = luma(a, b);
      sum += value;
      squared += value * value;
      if ((a + 1 < x + width && Math.abs(value - luma(a + 1, b)) >= 16) ||
          (b + 1 < y + height && Math.abs(value - luma(a, b + 1)) >= 16)) edges++;
    }
  }
  const count = width * height;
  return { deviation: Math.sqrt(squared / count - (sum / count) ** 2), density: edges / count };
}

const measure = ([x1, y1, x2, y2]) => Math.abs(x2 - x1) + Math.abs(y2 - y1);
const frames = {};
for (const [view, setup] of Object.entries({
  desktop: { avatar: [390, 366], pet: [672, 384], helmet: [77, 22, 77, 66], eye: [30, 28, 46, 28] },
  phone: { avatar: [96, 366], pet: [290, 388], helmet: [61, 18, 61, 53], eye: [23, 23, 36, 23] },
})) {
  const previous = v01.frames[view];
  const { width, height, zones, fire, groundLight } = previous;
  const base = "samples/home-base-v02/" + view + "-";
  const source = "samples/derivations/home-base-v02/" + view;
  const attempt = await asset(source + "-source.png");
  const prompt = await asset(source + "-prompt.md");
  const before = await png(previous.architecture.path);
  const backdrop = nearest(await png(attempt.path), width, height);
  assert.ok(backdrop.data.every((value, index) => index % 4 !== 3 || value === 255));

  // Move the top of the workbench supplies below the desktop card boundary.
  // The stone floor starts below this narrow wall band and is unchanged.
  const desktopWallBand = view === "desktop" ? { top: 176, bottom: 252, from: 192, to: 199 } : null;
  if (desktopWallBand) {
    const { top, bottom, from, to } = desktopWallBand;
    const edited = Buffer.from(backdrop.data);
    const stride = width * 4;
    for (let y = top; y < bottom; y++) {
      const sourceY = y < to
        ? top + Math.round((y - top) * (from - top) / (to - top))
        : from + Math.round((y - to) * (bottom - from) / (bottom - to));
      edited.copy(backdrop.data, y * stride, sourceY * stride, (sourceY + 1) * stride);
    }
  }

  // Preserve the full mobile card strip, then blend into the edited wall.
  if (view === "phone") {
    const end = zones.card[1] + zones.card[3];
    for (let y = 0; y < end + 24; y++) {
      const weight = Math.min(1, (end + 24 - y) / 24);
      for (let i = y * width * 4; i < (y + 1) * width * 4; i++) {
        backdrop.data[i] = Math.round(before.data[i] * weight + backdrop.data[i] * (1 - weight));
      }
    }
    assert.ok(before.data.subarray(0, end * width * 4).equals(backdrop.data.subarray(0, end * width * 4)));
  }

  const referencePath = relative(previous.architectureReference.path);
  assert.equal((await asset(referencePath)).sha256, previous.architectureReference.sha256);
  const reference = await png(referencePath);
  const limit = cardMetrics(reference, zones.card);
  const actual = cardMetrics(backdrop, zones.card);
  assert.ok(actual.deviation <= limit.deviation && actual.density <= limit.density, JSON.stringify({ view, actual, limit }));
  const architecture = await raster(base + "architecture.png", backdrop);

  const fit = async (id, previousLayer, [groundX, groundY], scale) => {
    const input = await png(previousLayer.source.path);
    const box = bounds(input);
    const sprite = nearest(input, Math.round(box.width * scale), Math.round(box.height * scale), box, true);
    const x = groundX - Math.floor(sprite.width / 2);
    const y = groundY - sprite.height;
    assert.ok(x >= 0 && x + sprite.width <= width && y >= 0 && groundY <= zones.dialogue[1]);
    const [cx, cy, cw, ch] = zones.card;
    assert.ok(x >= cx + cw || x + sprite.width <= cx || y >= cy + ch || groundY <= cy, id + " intersects card");
    const spriteBounds = bounds(sprite);
    assert.equal(spriteBounds.y + spriteBounds.height, sprite.height);
    return { ...await raster(base + id + ".png", sprite), x, y, ground: [groundX, groundY], scale, source: previousLayer.source };
  };
  // Calibrate against the desktop v01 rendition of the same master, then apply
  // one common master-to-scene scale to all eight classes in each frame.
  const desktop = v01.frames.desktop;
  const landmarks = { helmet: [44, 15, 44, 48], eye: [58, 16, 70, 16] };
  const scaleFor = async (layer, from, target) => {
    const box = bounds(await png(layer.source.path));
    const factor = measure(target) / measure(from);
    return { factor, masterScale: layer.height / box.height * factor };
  };
  const avatarScale = await scaleFor(desktop.slots.warrior, landmarks.helmet, setup.helmet);
  const petScale = await scaleFor(desktop.mimiku, landmarks.eye, setup.eye);
  const slots = {};
  for (const id of classes) slots[id] = await fit(id, previous.slots[id], setup.avatar, avatarScale.masterScale);
  const mimiku = await fit("mimiku", previous.mimiku, setup.pet, petScale.masterScale);
  const mapped = (line, scale) => line.map(value => Math.round(value * scale.factor));
  const proof = {
    warrior: { label: "Warrior · 頭盔頂到下巴（不含羽飾）", landing: setup.helmet, home: mapped(landmarks.helmet, avatarScale) },
    mimiku: { label: "Mimiku · 對應眼球寬（含瞳孔）", landing: setup.eye, home: mapped(landmarks.eye, petScale) },
  };
  for (const [id, evidence] of Object.entries(proof)) {
    const ref = landing.scenes[view].fixed.find(layer => layer.id === id);
    assert.equal((await asset(relative(ref.path))).sha256, ref.sha256);
    evidence.reference = { ...ref, path: relative(ref.path) };
    assert.ok(Math.abs(measure(evidence.home) - measure(evidence.landing)) <= 1);
  }
  for (const layer of [fire, groundLight]) assert.equal((await asset(layer.path)).sha256, layer.sha256);
  for (const avatar of Object.values(slots)) {
    assert.ok(avatar.x + avatar.width <= fire.x, "avatar envelope overlaps fire");
  }
  assert.ok(mimiku.x + proof.mimiku.home[0] >= fire.x + fire.width, "Mimiku eye overlaps fire");
  const delta = (point, before) => point.map((value, index) => value - before[index]);
  frames[view] = { width, height, zones, architecture, fire, groundLight, slots, mimiku, proof,
    anchorDelta: { avatar: delta(setup.avatar, previous.avatar), mimiku: delta(setup.pet, previous.mimiku.ground) },
    lineage: { attempt, prompt, editTarget: previous.architecture, styleReference: previous.architectureReference },
    card: { actual, limit, reference: previous.architectureReference, desktopDimming: 0, desktopWallBand, phonePreserved: view === "phone" },
    comparison: { ...previous.comparison, path: relative(previous.comparison.path) }, previous,
  };
}
const wall = await output("samples/home-base-v02/blank-parchment.svg", Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 61" shape-rendering="crispEdges"><path fill="#241811" d="M9 11h94v45H9z"/><path fill="#65412a" d="M7 7h92v45H7z"/><path fill="#997047" d="M10 10h85v35H10z"/><path fill="#7b5233" d="M10 42h85v6H10zM52 12h2v29h-2z"/><path fill="#b78b58" d="M13 13h3v25h-3zM86 14h5v5h-5z"/><path fill="#573a2a" d="M12 11h5v5h-5zM87 11h5v5h-5z"/></svg>\n'));
const manifest = { decision: "awaiting-home-v02-visual-review", reviewOnly: true, runtimePromotion: false,
  wall: { ...wall, id: "blank-parchment", family: "Props", x: 482, y: 108, width: 112, height: 61 },
  metric: { luma: "BT.709 weighted RGB (0–255)", deviation: "population standard deviation",
    density: "fraction of pixels with in-zone right or lower neighbor differing by at least 16 luma units",
    threshold: "both metrics <= same-frame Landing architecture values" }, frames };

function renderScene(frame, version, view) {
  const { width, height } = frame;
  const rect = ([x, y, w, h]) => "left:" + 100*x/width + "%;top:" + 100*y/height + "%;width:" + 100*w/width + "%;height:" + 100*h/height + "%";
  const layer = (item, label, kind = "", attrs = "") =>
    '<img class="layer ' + kind + '" style="' + rect([item.x,item.y,item.width,item.height]) +
    '" src="' + item.path + '" alt="' + label + '" ' + attrs + '>';
  const zone = (id, label) => '<div class="zone" style="' + rect(frame.zones[id]) + '">' + label + '</div>';
  const current = version === "v02";
  return [
    '<figure><div class="scene" data-version="' + version + '" data-frame="' + view + '">',
    '<img class="background" src="' + frame.architecture.path + '" width="' + width + '" height="' + height + '" alt="秘密基地底圖">',
    current && view === "desktop" ? layer(manifest.wall, "空白掛紙", "wall", "hidden") : "",
    layer(frame.groundLight, ""), layer(frame.fire, "篝火"),
    ...(current ? classes : ["warrior"]).map(id => layer(frame.slots[id], id, "avatar",
      'data-avatar="' + id + '"' + (id === "warrior" ? "" : " hidden"))),
    layer(frame.mimiku, "Mimiku"),
    current ? zone("card","最近冒險") + zone("dialogue","Mimiku · 回來啦。先在火邊坐一會兒。") + zone("nav","導覽列") : "",
    '</div><figcaption>Home ' + version + '</figcaption></figure>',
  ].join("\n");
}

function marked(item, line, name) {
  const [x1, y1, x2, y2] = line;
  return '<figure><div class="sprite" style="width:' + item.width * 2 + 'px">' +
    '<img class="background" src="' + item.path + '" width="' + item.width + '" height="' + item.height + '" alt="' + name + '">' +
    '<svg viewBox="0 0 ' + item.width + ' ' + item.height + '" aria-hidden="true"><line x1="' + x1 +
    '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/><circle cx="' + x1 + '" cy="' + y1 +
    '" r="1"/><circle cx="' + x2 + '" cy="' + y2 + '" r="1"/></svg></div>' +
    '<figcaption>' + name + ' · ' + measure(line) + ' px</figcaption></figure>';
}

const sections = Object.entries(frames).map(([view, frame]) => [
  "<section><h2>" + (view === "desktop" ? "桌機" : "手機") + " · " + frame.width + " × " + frame.height + "</h2>",
  '<div class="triptych ' + view + '">', renderScene(frame, "v02", view), renderScene(frame.previous, "v01", view),
  '<figure><img class="background" src="' + frame.comparison.path + '" width="' + frame.width + '" height="' + frame.height +
    '" alt="已核准的 Landing"><figcaption>Landing</figcaption></figure></div>',
  '<details open><summary>比例量測 · 圖層同倍率</summary><div class="measurements">',
  ...Object.entries(frame.proof).map(([id, proof]) => '<article><h3>' + proof.label + '</h3><div class="proof">' +
    marked(proof.reference, proof.landing, "Landing") +
    marked(id === "warrior" ? frame.slots.warrior : frame.mimiku, proof.home, "Home v02") + '</div></article>'),
  '</div></details></section>',
].join("\n"));

const html = [
  '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Home v02 · 視覺審核</title><style>',
  '*{box-sizing:border-box}body{margin:auto;max-width:2928px;padding:16px;background:#19110d;color:#f6e3cc;font:16px/1.5 system-ui,sans-serif}',
  'fieldset{display:flex;flex-wrap:wrap;gap:12px;border:1px solid #a37c51}select{font:inherit}figure{margin:0;min-width:0}figcaption{padding-top:6px}',
  '.triptych,.proof,.measurements{display:grid;gap:12px;align-items:start}.triptych{grid-template-columns:repeat(3,minmax(0,1fr))}.triptych.phone{max-width:1194px}.proof,.measurements{grid-template-columns:repeat(2,minmax(0,1fr))}.measurements{max-width:1120px}',
  '.scene,.sprite{position:relative}.scene{container-type:inline-size}.sprite{max-width:100%}.background{display:block;width:100%;height:auto}.layer,.zone,.sprite svg{position:absolute}.sprite svg{inset:0;width:100%;height:100%;overflow:visible}.sprite line{stroke:#00fff0;stroke-width:1}.sprite circle{fill:#00fff0;stroke:#181511;stroke-width:.35}img{image-rendering:pixelated}',
  '.zone{display:none;padding:1.2cqw;background:#17110de8;color:#ffe5bf;outline:1px dashed #d5a567;outline-offset:-1px;font-size:clamp(6px,2.5cqw,14px);overflow:hidden}body:has(#guides:checked) .zone{display:block}',
  'body:has(#gray:checked) img{filter:grayscale(1)}@media(max-width:620px){.measurements{grid-template-columns:1fr}.triptych{gap:4px}}',
  '</style></head><body><h1>Home 秘密基地 v02</h1><p>Phase 1 · 待視覺審核</p><fieldset><legend>審核預覽</legend>',
  '<label for="avatar">頭像</label><select id="avatar">' + classes.map(id => '<option>' + id + '</option>').join("") + '</select>',
  '<label><input type="checkbox" id="guides"> 安全區</label><label><input type="checkbox" id="wall"> 掛紙（桌機）</label><label><input type="checkbox" id="gray"> 灰階</label>',
  '</fieldset>', ...sections,
  '<script>const avatar=document.querySelector("#avatar");const wall=document.querySelector("#wall");',
  'function update(){for(const item of document.querySelectorAll(\'[data-version="v02"] [data-avatar]\')) item.hidden=item.dataset.avatar!==avatar.value;document.querySelector(".wall").hidden=!wall.checked;}',
  'avatar.addEventListener("change",update);wall.addEventListener("change",update);update();</script></body></html>\n',
].join("\n");
await output("home-base-v02-review.html", Buffer.from(html));
await output("home-base-v02.manifest.json", Buffer.from(JSON.stringify({ ...manifest, reviewHash: hash(html) }, null, 2) + "\n"));
console.log(JSON.stringify({ frames: Object.keys(frames).length, classes: classes.length, outputs, byteIdentical: check }));
