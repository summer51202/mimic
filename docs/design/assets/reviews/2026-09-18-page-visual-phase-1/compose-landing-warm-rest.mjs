import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { config } from "./landing-warm-rest.config.mjs";
import { renderReview } from "./render-landing-warm-rest.mjs";
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, "../../../../..");
const require = createRequire(path.join(repository, "web/package.json"));
const { PNG } = require("pngjs");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const relative = file => path.relative(repository, file).replaceAll("\\", "/");
async function record(file) {
  const bytes = await readFile(file), png = PNG.sync.read(bytes);
  return { path: relative(file), sha256: hash(bytes), width: png.width, height: png.height };
}
async function save(name, png) {
  const file = path.join(directory, "samples/landing-warm-rest", name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, PNG.sync.write(png));
  return record(file);
}
function crop(png) {
  let x = png.width, y = png.height, right = -1, bottom = -1;
  for (let sy = 0; sy < png.height; sy++) for (let sx = 0; sx < png.width; sx++) {
    if (png.data[(sy * png.width + sx) * 4 + 3] < 200) continue;
    x = Math.min(x,sx); y = Math.min(y,sy); right = Math.max(right,sx); bottom = Math.max(bottom,sy);
  }
  if (right < x) throw Error("Empty opaque source");
  return { x, y, width: right-x+1, height: bottom-y+1 };
}
function resize(png, width, height, bounds = { x:0, y:0, width:png.width, height:png.height }, layer) {
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = bounds.x + Math.min(bounds.width-1, Math.floor(x*bounds.width/width));
    const sy = bounds.y + Math.min(bounds.height-1, Math.floor(y*bounds.height/height));
    const si = (sy*png.width+sx)*4, di = (y*width+x)*4;
    if (layer && png.data[si+3] < 200) continue;
    out.data.set(layer?.monochrome ?? png.data.subarray(si,si+3),di);
    out.data[di+3] = layer ? Math.round(255*(layer.opacity ?? 1)) : png.data[si+3];
  }
  return out;
}
function over(canvas,sprite,x,y) {
  if (x < 0 || y < 0 || x+sprite.width > canvas.width || y+sprite.height > canvas.height) throw Error("Clipped sprite");
  for (let sy = 0; sy < sprite.height; sy++) for (let sx = 0; sx < sprite.width; sx++) {
    const si = (sy*sprite.width+sx)*4, di = ((y+sy)*canvas.width+x+sx)*4, a = sprite.data[si+3]/255;
    if (!a) continue;
    for (let c = 0; c < 3; c++) canvas.data[di+c] = Math.round(sprite.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3] = 255;
  }
}
function grayscale(png) {
  const out = new PNG({ width:png.width, height:png.height });
  for (let i = 0; i < png.data.length; i+=4) {
    const value = Math.round((2126*png.data[i]+7152*png.data[i+1]+722*png.data[i+2])/10000);
    out.data.set([value,value,value,png.data[i+3]],i);
  }
  return out;
}
const sources = {}, references = {}, rasters = {}, parents = {}, prompts = [];
for (const [id, file] of Object.entries(config.sources)) {
  sources[id] = await record(path.join(directory,file));
  rasters[id] = PNG.sync.read(await readFile(path.join(directory,file)));
}
for (const [id,file] of Object.entries(config.references)) references[id] = await record(path.join(directory,file));
const lineageBytes = await readFile(path.join(directory,config.lineagePath));
const lineage = JSON.parse(lineageBytes);
for (const [id,item] of Object.entries(lineage)) {
  if (item.path !== sources[id].path || item.generator !== "imagegen") throw Error("Invalid source lineage: "+id);
  parents[id] = await record(path.join(repository,item.parentPath));
  const bytes = await readFile(path.join(repository,item.promptPath));
  prompts.push({ path:item.promptPath, sha256:hash(bytes) });
}
const frames = {};
for (const [variant,layout] of Object.entries(config.variants)) for (const view of ["desktop","phone"]) {
  const size = view === "desktop" ? [960,540] : [390,600];
  const key = `${variant}-${view}`;
  const architecture = rasters[view === "desktop" ? "architectureDesktop" : "architecturePhone"];
  const ratio = size[0]/size[1];
  const aw = architecture.width/architecture.height > ratio ? Math.round(architecture.height*ratio) : architecture.width;
  const ah = architecture.width/architecture.height > ratio ? architecture.height : Math.round(architecture.width/ratio);
  const bounds = { x:Math.floor((architecture.width-aw)/2), y:Math.floor((architecture.height-ah)/2), width:aw, height:ah };
  const canvas = resize(architecture,...size,bounds);
  for (let i = 3; i < canvas.data.length; i+=4) canvas.data[i] = 255;
  const layers = [];
  const [fx,fy] = layout[view].fire;
  const groundLight = { id:"groundLight", [view]:view === "desktop" ? [fx-112,fy+54,326] : [fx-80,fy+40,215] };
  const list = [...config.secondary, groundLight, ...config.layerOrder.map(id => ({ id, [view]:layout[view][id] }))];
  for (const layer of list) {
    if (!layer[view]) continue;
    const [x,y,width] = layer[view], bounds = crop(rasters[layer.id]);
    const height = Math.round(width*bounds.height/bounds.width);
    const sprite = resize(rasters[layer.id],width,height,bounds,layer);
    over(canvas,sprite,x,y);
    layers.push({ id:layer.id, x, y, ...await save(`layers/${key}/${layer.id}.png`,sprite) });
  }
  const colorPng = view === "desktop" ? resize(canvas,1920,1080) : canvas;
  frames[key] = {
    logical:await save(`${key}-logical.png`,canvas), color:await save(`${key}.png`,colorPng),
    gray:await save(`${key}-gray.png`,grayscale(colorPng)), layers, visitor:layout.visitor[view],
  };
}
const manifest = {
  ...config, sources, references, parents, prompts, frames,
  lineage:{ path:relative(path.join(directory,config.lineagePath)), sha256:hash(lineageBytes), entries:lineage },
  spec:"docs/superpowers/specs/2026-10-08-landing-warm-rest-composition-design.md",
};
await writeFile(path.join(directory,"landing-warm-rest.manifest.json"),JSON.stringify(manifest,null,2)+"\n");
const previousPage = await readFile(path.join(directory,"landing-war-room-review.html"),"utf8");
await writeFile(path.join(directory,"landing-warm-rest-review.html"),renderReview(manifest,previousPage));
console.log(JSON.stringify(Object.fromEntries(Object.entries(frames).map(([key,f]) => [key,f.color])),null,2));
