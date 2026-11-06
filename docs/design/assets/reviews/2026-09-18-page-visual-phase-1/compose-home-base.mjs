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
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const read = file => readFile(path.join(dir, file));
const json = async file => JSON.parse(await read(file));
const landing = await json("landing-prop-placement-application.manifest.json");
const avatars = await json("avatar-classes.manifest.json");
const classes = avatars.characterOrder;
const frames = {};

async function output(file, bytes) {
  if (check) assert.ok((await read(file)).equals(bytes), file + " differs");
  else {
    const target = path.join(dir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
}

async function asset(file) {
  const bytes = await read(file);
  return { path: file, sha256: digest(bytes) };
}

async function raster(file, image) {
  const bytes = PNG.sync.write(image);
  await output(file, bytes);
  return { path: file, sha256: digest(bytes), width: image.width, height: image.height };
}

for (const [view, frame] of Object.entries({
  desktop: { width: 960, height: 540, fire: [486, 255], avatar: [417, 359], mimiku: [659, 373], size: 112, pet: 92,
    zones: { card: [16, 56, 300, 140], dialogue: [0, 421, 960, 119], nav: [0, 0, 960, 40] } },
  phone: { width: 390, height: 600, fire: [158, 290], avatar: [111, 359], mimiku: [274, 381], size: 82, pet: 68,
    zones: { card: [12, 16, 366, 120], dialogue: [0, 432, 390, 168], nav: [0, 558, 390, 42] } },
})) {
  const base = "samples/home-base/" + view + "-";
  const source = "samples/derivations/home-base/" + view;
  const original = await asset(source + "-source.png");
  const prompt = await asset(source + "-prompt.md");
  const comparison = (view === "desktop" ? landing.chestFrames.closed.scene : landing.scenes.phone.scene);
  const architectureReference = landing.scenes[view].architecture;
  const image = PNG.sync.read(await read(original.path));
  assert.ok(image.data.every((value, index) => index % 4 !== 3 || value === 255));
  const background = nearest(image, frame.width, frame.height);
  const [cardX, cardY, cardWidth, cardHeight] = frame.zones.card;
  const feather = 28;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const outside = Math.max(cardX - x, x - cardX - cardWidth, cardY - y, y - cardY - cardHeight, 0);
      if (outside >= feather) continue;
      const brightness = 1 - 0.40 * (1 - outside / feather);
      const offset = (y * frame.width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        background.data[offset + channel] = Math.round(background.data[offset + channel] * brightness);
      }
    }
  }
  const architecture = await raster(base + "architecture.png", background);
  const fromLanding = async id => {
    const layer = landing.scenes[view].fixed.find(item => item.id === id);
    const relative = path.relative(dir, path.join(repo, layer.path)).replaceAll("\\", "/");
    const sourceAsset = await asset(relative);
    assert.equal(sourceAsset.sha256, layer.sha256);
    return { ...layer, ...sourceAsset };
  };
  const fire = await fromLanding("fire");
  const groundLight = await fromLanding("groundLight");
  groundLight.x += frame.fire[0] - fire.x;
  groundLight.y += frame.fire[1] - fire.y;
  fire.depth += frame.fire[1] - fire.y;
  [fire.x, fire.y] = frame.fire;

  async function fitted(id, input, size, [groundX, groundY]) {
    const originalSprite = PNG.sync.read(await read(input));
    const box = bounds(originalSprite);
    const scale = size / Math.max(box.width, box.height);
    const sprite = nearest(originalSprite, Math.round(box.width * scale), Math.round(box.height * scale), box, true);
    const layer = await raster(base + id + ".png", sprite);
    const x = groundX - Math.floor(layer.width / 2);
    const y = groundY - layer.height;
    assert.ok(x >= 0 && x + layer.width <= frame.width && y >= (view === "phone" ? 220 : 196));
    assert.ok(groundY <= (view === "phone" ? 420 : 421));
    assert.equal(bounds(sprite).y + bounds(sprite).height, layer.height);
    return { ...layer, x, y, ground: [groundX, groundY], source: await asset(input) };
  }
  const mimiku = await fitted("mimiku", "samples/mimiku-states-actions/masters/state-idle.png", frame.pet, frame.mimiku);
  const slots = {};
  for (const id of classes) {
    slots[id] = await fitted(id, "samples/avatar-classes/masters/" + id + ".png", frame.size, frame.avatar);
  }
  assert.ok(frame.fire[1] + fire.height <= frame.zones.dialogue[1]);
  frames[view] = { ...frame, architecture, original, prompt, architectureReference, comparison, fire, groundLight, mimiku, slots };
}
const manifest = { decision: "awaiting-home-visual-review", reviewOnly: true, runtimePromotion: false,
  contentReference: await asset("samples/scenes-calibration.png"), frames };
const relative = file => path.relative(dir, path.join(repo, file)).replaceAll("\\", "/");
const stage = (view, frame) => {
  const rect = ([x, y, w, h]) => "left:" + 100*x/frame.width + "%;top:" + 100*y/frame.height + "%;width:" + 100*w/frame.width + "%;height:" + 100*h/frame.height + "%";
  const layer = (item, kind, label) => '<img class="layer ' + kind + '" style="' + rect([item.x,item.y,item.width,item.height]) + '" src="' + item.path + '" alt="' + label + '">';
  const zone = (key, label) => '<div class="zone ' + key + '" style="' + rect(frame.zones[key]) + '">' + label + '</div>';
  return [
    "<section><h2>" + (view === "desktop" ? "桌機" : "手機") + " · " + frame.width + " × " + frame.height + "</h2>",
    '<div class="pair"><figure><div class="scene" data-frame="' + view + '">',
    '<img class="background" src="' + frame.architecture.path + '" width="' + frame.width + '" height="' + frame.height + '" alt="暖色地城秘密基地">',
    layer(frame.groundLight, "", ""), layer(frame.fire, "", "篝火"),
    ...["warrior","mage","ranger"].map(id => layer(frame.slots[id], "avatar " + id, id)),
    layer(frame.mimiku, "", "Mimiku"),
    zone("card","最近冒險"), zone("dialogue","Mimiku · 回來啦。先在火邊坐一會兒。"), zone("nav","導覽列"),
    '</div><figcaption>Home · 秘密基地</figcaption></figure>',
    '<figure><img class="background" src="' + relative(frame.comparison.path) + '" width="' + frame.width + '" height="' + frame.height + '" alt="已核准 Landing 場景"><figcaption>Landing · 風格基準</figcaption></figure></div></section>',
  ].join("\n");
};

const html = [
  '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Home 秘密基地 · 視覺審核</title><style>',
  '*{box-sizing:border-box}body{margin:auto;max-width:1984px;padding:16px;background:#19110d;color:#f6e3cc;font:16px/1.5 system-ui,sans-serif}',
  'fieldset{display:flex;flex-wrap:wrap;gap:12px;border:1px solid #a37c51}label{white-space:nowrap}figure{margin:0;min-width:0}figcaption{padding-top:6px}',
  '.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}.scene{position:relative;container-type:inline-size}.background{display:block;width:100%;height:auto}.layer,.zone{position:absolute}.layer{display:block}img{image-rendering:pixelated}',
  '.avatar{display:none}body:has(#warrior:checked) .warrior,body:has(#mage:checked) .mage,body:has(#ranger:checked) .ranger{display:block}',
  '.zone{display:none;padding:1.2cqw;background:#17110de8;color:#ffe5bf;outline:1px dashed #d5a567;outline-offset:-1px;font-size:clamp(8px,2.5cqw,14px);overflow:hidden}body:has(#guides:checked) .zone{display:block}',
  'body:has(#gray:checked) img{filter:grayscale(1)}[data-frame=phone], [data-frame=phone]+figcaption{max-width:390px}section:has([data-frame=phone]) .pair{max-width:792px}',
  '</style></head><body><h1>Home 秘密基地</h1><p>Phase 1 · 待視覺審核</p><fieldset><legend>審核預覽</legend>',
  '<label><input type="checkbox" id="guides" checked> 安全區</label><label><input type="checkbox" id="gray"> 灰階</label>',
  ...["warrior","mage","ranger"].map((id, index) => '<label><input type="radio" name="avatar" id="' + id + '"' + (index ? "" : " checked") + '> ' + id + '</label>'),
  '</fieldset>', ...Object.entries(frames).map(([view, frame]) => stage(view, frame)), '</body></html>\n',
].join("\n");
await output("home-base-review.html", Buffer.from(html));
await output("home-base.manifest.json", Buffer.from(JSON.stringify({ ...manifest, reviewHash: digest(html) }, null, 2) + "\n"));
console.log(JSON.stringify({ frames: Object.keys(frames).length, classes: classes.length, byteIdentical: check }));
