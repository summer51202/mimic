import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { config } from "./landing-war-room.config.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, "../../../../..");
const require = createRequire(path.join(repository, "web/package.json"));
const { PNG } = require("pngjs");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (filename) => path.relative(repository, filename).replaceAll("\\", "/");
const rasters = {};
const sources = {};
const references = {};

async function record(filename) {
  const bytes = await readFile(filename);
  const png = PNG.sync.read(bytes);
  return { path: relative(filename), sha256: hash(bytes), width: png.width, height: png.height };
}

for (const [id, filename] of Object.entries(config.sources)) {
  const absolute = path.join(directory, filename);
  sources[id] = await record(absolute);
  rasters[id] = PNG.sync.read(await readFile(absolute));
}
for (const [id, filename] of Object.entries({ ...config.references, ...config.uiReferences })) {
  references[id] = await record(path.join(directory, filename));
}

function crop(png) {
  let left = png.width, top = png.height, right = -1, bottom = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] < 200) continue;
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error("Source has no opaque subject");
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function resize(png, width, height, bounds = { x: 0, y: 0, width: png.width, height: png.height }, layer) {
  const result = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = bounds.x + Math.min(bounds.width - 1, Math.floor(x * bounds.width / width));
      const sourceY = bounds.y + Math.min(bounds.height - 1, Math.floor(y * bounds.height / height));
      const si = (sourceY * png.width + sourceX) * 4;
      const di = (y * width + x) * 4;
      if (layer && png.data[si + 3] < 200) continue;
      const color = layer?.monochrome ?? png.data.subarray(si, si + 3);
      result.data.set(color, di);
      result.data[di + 3] = layer ? Math.round(255 * (layer.opacity ?? 1)) : png.data[si + 3];
    }
  }
  return result;
}

function over(canvas, sprite, x, y) {
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const dx = x + sx, dy = y + sy;
      if (dx < 0 || dy < 0 || dx >= canvas.width || dy >= canvas.height) continue;
      const si = (sy * sprite.width + sx) * 4, di = (dy * canvas.width + dx) * 4;
      const alpha = sprite.data[si + 3] / 255;
      if (!alpha) continue;
      for (let channel = 0; channel < 3; channel++) {
        canvas.data[di + channel] = Math.round(sprite.data[si + channel] * alpha + canvas.data[di + channel] * (1 - alpha));
      }
      canvas.data[di + 3] = 255;
    }
  }
}

function compose(view) {
  const size = view === "desktop" ? config.logicalDesktop : config.phone;
  const architecture = rasters.architecture;
  let bounds;
  if (view === "phone") {
    const width = Math.round(architecture.height * size.width / size.height);
    bounds = { x: Math.round((architecture.width - width) * 0.53), y: 0, width, height: architecture.height };
  }
  const canvas = resize(architecture, size.width, size.height, bounds);
  const lighting = config.lighting[view];
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const distance = Math.hypot((x - lighting.center[0]) / lighting.radius[0], (y - lighting.center[1]) / lighting.radius[1]);
      const band = Math.floor(distance * 4);
      const gain = config.lighting.backgroundGain + (config.lighting.bands[band] ?? 0);
      const i = (y * canvas.width + x) * 4;
      for (let c = 0; c < 3; c++) canvas.data[i + c] = Math.round(canvas.data[i + c] * gain);
      canvas.data[i + 3] = 255;
    }
  }
  const placements = [];
  const layerRasters = [];
  for (const layer of config.layers) {
    const placement = layer[view];
    if (!placement) continue;
    const [x, y, width] = placement;
    const bounds = crop(rasters[layer.id]);
    const height = Math.round(width * bounds.height / bounds.width);
    const sprite = resize(rasters[layer.id], width, height, bounds, layer);
    over(canvas, sprite, x, y);
    layerRasters.push({ id: layer.id, png: sprite });
    placements.push({ id: layer.id, x, y, width, height });
  }
  return { png: view === "desktop" ? resize(canvas, size.width * config.desktopScale, size.height * config.desktopScale) : canvas, placements, layerRasters };
}

await mkdir(path.join(directory, "samples/landing-war-room"), { recursive: true });
const outputs = {}, placements = {}, derivedLayers = {};
for (const view of ["desktop", "phone"]) {
  const result = compose(view);
  const filename = path.join(directory, `samples/landing-war-room/${view}.png`);
  await writeFile(filename, PNG.sync.write(result.png));
  outputs[view] = await record(filename);
  placements[view] = result.placements;
  const layerDirectory = path.join(directory, `samples/landing-war-room/layers/${view}`);
  await mkdir(layerDirectory, { recursive: true });
  derivedLayers[view] = [];
  for (const layer of result.layerRasters) {
    const filename = path.join(layerDirectory, `${layer.id}.png`);
    await writeFile(filename, PNG.sync.write(layer.png));
    derivedLayers[view].push({ id: layer.id, ...await record(filename) });
  }
}
const wordmark = PNG.sync.read(await readFile(path.join(directory, config.uiReferences.wordmark)));
const wordmarkBounds = crop(wordmark);
const wordmarkPath = path.join(directory, "samples/landing-war-room/wordmark.png");
await writeFile(wordmarkPath, PNG.sync.write(resize(wordmark, 256, Math.round(256 * wordmarkBounds.height / wordmarkBounds.width), wordmarkBounds, {})));
const uiAssets = { wordmark: await record(wordmarkPath) };
const manifest = { ...config, sources, references, outputs, placements, derivedLayers, uiAssets, sourceLineage: "imagegen-independent-raster-sources", spec: "docs/superpowers/specs/2026-10-05-landing-war-room-visual-design.md" };
await writeFile(path.join(directory, "landing-war-room.manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const checklist = ["自然休息的小隊：戰士靠火暖手，法師低頭研讀木箱地圖；Mimiku 與遊俠維持原位", "天然石壁：中央完整大片岩面，裂縫退到字標區域外", "MIMIC：維持尺寸與上方置中位置，木色與黃銅高光稍微黯淡，更融入完整岩面", "營火為主光；低天花與左右不同通道", "斜角低木箱放大約 20%，位於篝火左上方的法師旁，且不被火焰或戰士遮住；獨立木牌與 live 開始冒險文字", "一只普通寶箱、一塊壓力板、兩支不對稱火把、三隻休息蝙蝠", "淡化的未知壁面刻痕；前景延伸到底部", "底部對話不遮住臉、營火、Mimiku 與木牌", "四章連續冒險日誌；三種帳務語意分開"];
const chapters = [
  ["01", "自己的冒險，自己的帳頁", "把日常支出記在私人帳本。金額、分類與備註，只屬於你。", "samples/record-expense-action/record-expense-action-v01.png"],
  ["02", "同行的花費，一起算清楚", "記錄誰先付款、每個人分攤多少。結算完成的期間會鎖定；後續更正另立新紀錄。", "samples/event-status/event-settlement.png"],
  ["03", "共同補給，有自己的帳", "共同基金分開記錄投入、支出、報銷與返還，保持每一筆補給的來去清楚。", "samples/event-status/event-contribution.png"],
  ["04", "下一個小任務，有 Mimiku 陪伴", "把待處理事項留在委託板，依自己的步調繼續旅程。", config.uiReferences.tasks],
];
const sign = (view) => {
  const item = placements[view].find(({ id }) => id === "sign");
  const size = view === "desktop" ? config.logicalDesktop : config.phone;
  return `style="left:${(item.x + item.width * 0.16) / size.width * 100}%;top:${(item.y + item.height * 0.17) / size.height * 100}%;width:${item.width * 0.7 / size.width * 100}%;height:${item.height * 0.48 / size.height * 100}%"`;
};
const wordmarkStyle = (view) => {
  const [x, y, width] = config.wordmarkPlacement[view];
  const size = view === "desktop" ? config.logicalDesktop : config.phone;
  return `--logo-x:${x / size.width * 100}%;--logo-y:${y / size.height * 100}%;--logo-width:${width / size.width * 100}%`;
};
const wordmarkUI = (phone) => `<span class="wordmark" style="${wordmarkStyle(phone ? "phone" : "desktop")}"><img src="samples/landing-war-room/wordmark.png" width="256" height="75" alt="MIMIC"></span>${phone ? "" : `<span class="wordmark mobile-wordmark" style="${wordmarkStyle("phone")}"><img src="samples/landing-war-room/wordmark.png" width="256" height="75" alt="MIMIC"></span>`}`;
const ui = (phone = false) => `${wordmarkUI(phone)}<a class="login" href="#review-notes">登入</a><a class="sign-label ${phone ? "phone-sign" : "desktop-sign"}" ${sign(phone ? "phone" : "desktop")} href="#journal"><span>開始</span><span>冒險</span></a>${phone ? "" : `<a class="sign-label mobile-sign" ${sign("phone")} href="#journal"><span>開始</span><span>冒險</span></a>`}<div class="dialogue"><div><span class="speaker">Mimiku</span><p>先在火邊歇一會兒。下一段冒險，我陪你。</p></div><a class="cta" href="#journal">開始冒險 <span aria-hidden="true">↓</span></a></div>`;
const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Landing 作戰會議室 — 視覺審核</title><style>
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#1d1717;color:#f2dfbd;font:15px/1.65 system-ui,"Microsoft JhengHei",sans-serif}a{color:inherit}a:focus-visible{outline:3px solid #eabc62;outline-offset:3px}main{max-width:1320px;margin:auto;padding:24px}h1{font-size:clamp(22px,3vw,34px);margin:0 0 10px}h2{font-size:22px;margin:32px 0 12px}p{margin:6px 0 14px}.muted{color:#bbaa91}.badge{display:inline-block;padding:3px 10px;border:1px solid #927141;color:#f2d89d;margin-bottom:12px}.scene{position:relative;container-type:inline-size;border:2px solid #6c5036;overflow:hidden;background:#30231b}.scene img{display:block;width:100%;height:auto;image-rendering:pixelated}.wordmark{position:absolute;left:var(--logo-x);top:var(--logo-y);width:var(--logo-width);filter:brightness(${config.wordmarkTone.brightness}) saturate(${config.wordmarkTone.saturation}) drop-shadow(1px 1px 0 #241a18)}.mobile-wordmark{display:none}.login{position:absolute;right:3%;top:4%;background:#211a17d9;border:1px solid #a78953;padding:3px 12px;text-decoration:none}.sign-label{position:absolute;color:#ffe8ac;text-shadow:1px 1px #3e2316;text-decoration:none;display:flex;flex-direction:column;justify-content:center;align-items:center;font-weight:800;line-height:1.15;font-size:1.12cqw}.mobile-sign{display:none}.dialogue{position:absolute;left:2%;right:2%;bottom:3%;height:19%;padding:12px 20px;background:#211a18f2;border:2px solid #b79556;box-shadow:0 0 0 3px #2f241c;display:flex;align-items:center;gap:18px;justify-content:space-between}.dialogue p{margin:3px 0 0;font-size:clamp(12px,1.6cqw,19px)}.speaker{color:#efc56c;font-weight:700;font-size:clamp(12px,1.4cqw,17px)}.cta{display:inline-block;flex:none;padding:9px 16px;background:#b68137;color:#211a18;font-weight:800;text-decoration:none;border:2px solid #f0ce80;white-space:nowrap}.phone{max-width:390px;margin:auto}.phone .sign-label{font-size:3.3cqw}.phone .dialogue{height:26%;bottom:2%;padding:12px;display:block}.phone .dialogue p{font-size:13px}.phone .cta{margin-top:8px;padding:6px 12px}.comparison{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,390px);gap:24px;align-items:start}.raw{display:block;width:100%;height:auto;image-rendering:pixelated}.refs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.refs figure{margin:0;padding:10px;background:#33291e;border:1px solid #645139;text-align:center}.refs img{width:min(100%,128px);image-rendering:pixelated}.journal{background:#e5cc9e;color:#3a2a20;padding:clamp(20px,5vw,64px);margin-top:28px;border-top:5px solid #90603b}.journal-intro{display:flex;gap:16px;align-items:center}.journal-intro img,.closing img{width:76px;image-rendering:pixelated}.chapter{display:grid;grid-template-columns:110px minmax(0,1fr);gap:30px;padding:30px 0;border-bottom:1px solid #a68a64}.chapter img{width:100px;height:110px;object-fit:contain;image-rendering:pixelated}.chapter small{color:#6a462b}.chapter h3{margin:4px 0 10px;font-size:22px}.closing{display:flex;align-items:center;gap:20px;padding-top:30px}.journal footer{margin-top:30px;display:flex;gap:20px;flex-wrap:wrap}details{border:1px solid #685440;padding:12px;margin:18px 0}code{font-size:12px;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{padding:8px;border-bottom:1px solid #594631;text-align:left;vertical-align:top}th:first-child{width:22%}.notes{padding:18px;background:#2b231e}li{margin:5px 0}
@media(max-width:700px){main{padding:12px}.comparison{grid-template-columns:1fr}.refs{grid-template-columns:repeat(2,minmax(0,1fr))}.chapter{grid-template-columns:70px minmax(0,1fr);gap:16px}.chapter img{width:65px;height:80px}.chapter h3{font-size:19px}.closing{flex-wrap:wrap}.login{font-size:12px}}
@media(max-width:600px){.responsive .wordmark{display:none}.responsive .mobile-wordmark{display:block}.responsive .desktop-sign{display:none}.responsive .mobile-sign{display:flex;font-size:3.3cqw}.responsive .dialogue{height:26%;bottom:2%;padding:12px;display:block}.responsive .dialogue p{font-size:13px}.responsive .cta{margin-top:8px;padding:6px 12px}}
</style></head><body><main>
<span class="badge">awaiting-calibration · review-only concept · 未核准</span><h1>Landing 作戰會議室</h1><p class="muted">本輪審核角色分工：戰士靠近篝火自然暖手，法師移至左側，低頭研讀木箱上的地圖，法杖靠身旁休息。兩人使用獨立新來源；木箱造型與放大尺寸不變，微調位置對齊手部。其餘素材、角色落點、照明與對話框維持上一版。已選的 B 結合版／第三字標亮度方向保留，尚未合併到此分層稿。</p>
<section aria-label="首屏與日誌"><div class="scene responsive"><picture><source media="(max-width:600px)" srcset="samples/landing-war-room/phone.png"><img src="samples/landing-war-room/desktop.png" width="1920" height="1080" alt="溫暖洞窟作戰會議室；戰士、法師、遊俠與 Mimiku 圍著小營火休息，旁邊放著地圖與木牌"></picture>${ui()}</div>
<div class="journal" id="journal"><div class="journal-intro"><img src="${config.references.mimiku}" alt="Mimiku"><div><small>冒險日誌</small><h2 style="margin:0">把每一步，都記得清楚。</h2><p>帳務各有自己的規則；旅程可以一起走。</p></div></div>${chapters.map(([number,title,copy,image]) => `<article class="chapter" data-chapter><img src="${image}" alt=""><div><small>CHAPTER ${number}</small><h3>${title}</h3><p>${copy}</p><a href="#review-notes">了解這一章</a></div></article>`).join("")}<div class="closing"><img src="${config.references.mimiku}" alt="Mimiku 陪你開始"><div><p>準備好了嗎？我們慢慢出發。</p><a class="cta" href="#review-notes">開始我的冒險</a></div></div><footer><a href="#review-notes">功能</a><a href="#review-notes">隱私</a><a href="#review-notes">條款</a></footer></div></section>
<h2>桌機與手機構圖比對</h2><div class="comparison"><div><p>桌機：完整 live 字標與首屏；960 × 540 logical，1920 × 1080 nearest-neighbor。</p><div class="scene desktop"><img src="samples/landing-war-room/desktop.png" width="1920" height="1080" alt="桌機完整構圖">${ui()}</div></div><div><p>手機：390 × 600；同一批分層來源重新配置。</p><div class="scene phone"><img src="samples/landing-war-room/phone.png" width="390" height="600" alt="手機小隊構圖">${ui(true)}</div></div></div>
<h2>已核准角色參照</h2><p class="muted">下面保留既有 master，供眼睛、服裝辨識與像素顆粒比對。</p><div class="refs">${Object.entries(config.references).map(([id,src])=>`<figure><img src="${src}" alt="已核准 ${id} master"><figcaption>${id}</figcaption></figure>`).join("")}</div>
<section class="notes" id="review-notes"><h2 style="margin-top:0">本輪視覺檢查</h2><ul>${checklist.map(item=>`<li>${item}</li>`).join("")}</ul><p>手機初始畫面保留完整小隊；左右寶箱、壁面刻痕與壓力板屬於後續橫向探索範圍。此頁連結只示範閱讀與版面，登入、互動和橫向移動留待後續設計。</p><p>reviewOnly: true · runtimePromotion: false · no runtime asset changes。Scenes family 維持 awaiting-calibration。</p><p>來源圖保留 ImageGen 原始 bytes。衍生合成會清除低 alpha 的光暈與透明 RGB；刻痕以單色、低透明度整合到牆面。</p></section>
<details><summary>exact SHA-256、來源與輸出</summary><table><thead><tr><th>影像</th><th>SHA-256</th></tr></thead><tbody>${Object.entries({...sources,...outputs}).map(([id,item])=>`<tr><td>${id}<br>${item.width} × ${item.height}</td><td><code>${item.sha256}</code></td></tr>`).join("")}</tbody></table></details>
</main></body></html>\n`;
await writeFile(path.join(directory, "landing-war-room-review.html"), html);
console.log(JSON.stringify({ outputs, decision: config.decision }, null, 2));
