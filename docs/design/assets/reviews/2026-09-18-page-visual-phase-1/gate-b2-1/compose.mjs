import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { bounds, nearest } from '../landing-chest-raster.mjs';
import { checkMotion, contract } from './motion-contract.mjs';

const here = import.meta.dirname;
const review = join(here, '..');
const root = join(review, '../../../../..');
const approved = join(review, '../../approved/page-visual-v1');
const require = createRequire(join(root, 'web/package.json'));
const { PNG } = require('pngjs');
const check = process.argv.includes('--check');
const blank = (width, height) => new PNG({ width, height });
const bytes = (path) => readFileSync(path);
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const read = (path) => PNG.sync.read(bytes(path));
const json = (path) => JSON.parse(bytes(path));
const decision = bytes(join(review, 'decision-log.md')).toString().split('### Gate B2-1 partial approval')[1];
const locked = new Map([...decision.matchAll(/\| `([\w.-]+\.png)` \| `([\da-f]{64})` \|/g)]
  .map(([, name, hash]) => ['candidates/' + name, hash]));
const guideApproval = decision.match(/Approved for B2-2 export: `action-guide\.png` \(SHA-256 `([\da-f]{64})`/);
assert.ok(guideApproval, 'missing guide approval');
locked.set('candidates/action-guide.png', guideApproval[1]);
assert.equal(locked.size, 21);
for (const [path, hash] of locked) assert.equal(sha(bytes(join(here, path))), hash, path);
const pathOf = (path) => relative(here, path).replaceAll(String.fromCharCode(92), '/');
const ref = (path) => ({ path: pathOf(path), sha256: sha(bytes(path)) });
const clean = (image, min = 1) => {
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] < min) image.data.fill(0, i, i + 4);
  }
  return image;
};
function paste(dest, source, x, y) {
  assert.ok(x >= 0 && y >= 0 && x + source.width <= dest.width && y + source.height <= dest.height);
  for (let row = 0; row < source.height; row++) {
    const start = row * source.width * 4;
    source.data.copy(dest.data, ((y + row) * dest.width + x) * 4, start, start + source.width * 4);
  }
}
function crop(source, x, y, width, height) {
  const result = blank(width, height);
  for (let row = 0; row < height; row++) {
    const start = ((y + row) * source.width + x) * 4;
    source.data.copy(result.data, row * width * 4, start, start + width * 4);
  }
  return result;
}
function save(path, content) {
  if (check || locked.has(path)) assert.deepEqual(bytes(join(here, path)), content, path);
  else writeFileSync(join(here, path), content);
}
const groups = [];
function sheet(id, label, file, frames, master, ms, sources, extra = {}) {
  const { width, height } = frames[0];
  const image = blank(width * frames.length, height);
  const frameBounds = frames.map((frame, index) => {
    assert.deepEqual([frame.width, frame.height], [width, height]);
    assert.ok(frame.data.some((v, i) => i % 4 === 3 && v >= 240), id);
    assert.ok(frame.data.some((v, i) => i % 4 === 3 && v === 0), id);
    clean(frame);
    paste(image, frame, index * width, 0);
    return bounds(frame);
  });
  const png = PNG.sync.write(image);
  save(file, png);
  groups.push({ id, label, file, width, height, count: frames.length, sha256: sha(png),
    master: ref(master), sources: sources.map(ref), frameBounds, ms, ...extra });
}
if (!check) mkdirSync(join(here, 'candidates'), { recursive: true });

const logoPath = join(approved, 'wordmark/mimic-wordmark-display.png');
const logo = read(logoPath);
assert.deepEqual([logo.width, logo.height], [916, 281]);
const wordSource = join(here, 'sources/wordmark.png');
const word = read(wordSource);
const eyes = [[67, 74, 57, 53], [160, 73, 55, 53]];
const logoFrames = [logo, ...[0, 1].map((index) => {
  const frame = crop(logo, 0, 0, 916, 281);
  for (const [[x, y, w, h], [sx, sy, sw, sh]] of eyes.map((eye, i) => [eye, [
    i === 0 ? 602 : 713, (i === 0 ? 97 : 96) + index * 363, 76, 70,
  ]])) {
    const patch = nearest(crop(word, sx, sy, sw, sh), w, h);
    // Keep the master outline and surrounding wood. Import only the generated eyelid interior.
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const ellipse = ((px - (w - 1) / 2) / (w / 2 - 1)) ** 2 + ((py - (h - 1) / 2) / (h / 2 - 1)) ** 2;
      if (ellipse > 1) continue;
      const i = (py * w + px) * 4;
      const dest = ((y + py) * 916 + x + px) * 4;
      if (patch.data[i + 3] >= 240) patch.data.copy(frame.data, dest, i, i + 3);
    }
  }
  let changed = 0;
  for (let y = 0; y < 281; y++) for (let x = 0; x < 916; x++) {
    const i = (y * 916 + x) * 4;
    if (frame.data.readUInt32BE(i) === logo.data.readUInt32BE(i)) continue;
    assert.ok(eyes.some(([l, t, w, h]) => x >= l && x < l + w && y >= t && y < t + h));
    assert.equal(frame.data[i + 3], logo.data[i + 3]);
    changed++;
  }
  assert.ok(changed > 100);
  return frame;
})];
sheet('wordmark', 'Wordmark 眨眼', 'candidates/mimic-wordmark-motion-sheet.png',
  logoFrames, logoPath, [90, 90, 90], [wordSource], { eyes, final: 0 });

const avatars = json(join(review, 'avatar-classes.manifest.json')).characters;
const centers = [263, 260, 254, 267, 278, 252, 248, 250];
const extents = [256, 260, 245, 236, 240, 260, 230, 240];
function areaSnap(source, size) {
  const out = blank(size, size);
  const ratio = source.width / size;
  // Average premultiplied colors over the footprint. Snap to the nearest visible
  // source swatch in that footprint, which is always a member of the master palette.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = x * ratio, t = y * ratio, r = (x + 1) * ratio, b = (y + 1) * ratio;
    let alpha = 0, red = 0, green = 0, blue = 0;
    const swatches = [];
    for (let sy = Math.floor(t); sy < Math.ceil(b); sy++) {
      for (let sx = Math.floor(l); sx < Math.ceil(r); sx++) {
        const i = (sy * source.width + sx) * 4;
        if (!source.data[i + 3]) continue;
        const weight = (Math.min(r, sx + 1) - Math.max(l, sx)) *
          (Math.min(b, sy + 1) - Math.max(t, sy)) * source.data[i + 3];
        alpha += weight;
        red += source.data[i] * weight;
        green += source.data[i + 1] * weight;
        blue += source.data[i + 2] * weight;
        swatches.push(i);
      }
    }
    const a = Math.round(alpha / ratio ** 2);
    if (!a) continue;
    let best = Infinity, pick;
    for (const i of swatches) {
      const distance = (source.data[i] - red / alpha) ** 2 +
        (source.data[i + 1] - green / alpha) ** 2 + (source.data[i + 2] - blue / alpha) ** 2;
      if (distance < best) { best = distance; pick = i; }
    }
    const dest = (y * size + x) * 4;
    source.data.copy(out.data, dest, pick, pick + 3);
    out.data[dest + 3] = a;
  }
  return out;
}
for (const [index, avatar] of avatars.entries()) {
  const { id, label, master } = avatar;
  const path = join(root, master.path);
  assert.equal(sha(bytes(path)), master.sha256);
  const image = read(path);
  const size = extents[index];
  const box = [centers[index] - Math.floor(size / 2), bounds(image).y - 16, size, size];
  for (const [kind, frame, extra] of [
    ['portrait', areaSnap(crop(image, ...box), 96), { crop: box }],
    ['full', areaSnap(image, 192), {}],
  ]) sheet(id + '-' + kind, label + ' · ' + (kind === 'portrait' ? '頭像' : '全身'),
    'candidates/' + id + '-' + kind + '.png', [frame], path, [], [], extra);
}

const v02 = json(join(review, 'motion-calibration-v02.manifest.json'));
const motion = json(join(review, 'motion-calibration-v02r.manifest.json'));
const pose = (state) => join(approved, 'mimiku/state-' + state + '.png');
const ledgerPaths = ['01', '02', 'master', '04', '05'].map((id) =>
  join(review, 'samples/motion-calibration-v02/ledger-desktop-' + id + '.png'));
sheet('ledger', '記帳', 'candidates/action-record-ledger.png', ledgerPaths.map(read),
  ledgerPaths[2], motion.sequences.ledger.desktop.map((f) => f.ms), ledgerPaths, { final: 4 });

const happy = read(pose('happy'));
const happyBox = bounds(happy);
const celebration = motion.sequences.celebration.desktop;
const glintMask = v02.masks['celebration-desktop'].regions;
const fullGlints = [null, null, '03', '05', '06', null].map((id) => id &&
  join(review, 'samples/motion-calibration-v02/celebration-desktop-' + id + '.png'));
const complete = celebration.map(({ lift }, index) => {
  const frame = blank(512, 512);
  const rise = Math.round(lift / motion.lineage.registration.desktop.scale);
  paste(frame, crop(happy, happyBox.x, happyBox.y, happyBox.width, happyBox.height), happyBox.x, happyBox.y - rise);
  if (!fullGlints[index]) return frame;
  const glint = read(fullGlints[index]);
  let placed = 0;
  for (const [l, t, r, b] of glintMask) for (let y = t; y < b; y++) for (let x = l; x < r; x++) {
    const i = (y * 512 + x) * 4;
    if (!frame.data[i + 3] && glint.data[i + 3]) {
      glint.data.copy(frame.data, i, i, i + 4);
      placed++;
    }
  }
  assert.ok(placed > 0);
  return frame;
});
sheet('celebration', '完成慶祝', 'candidates/action-adventure-complete.png', complete, pose('happy'),
  celebration.map((f) => f.ms), [...fullGlints.filter(Boolean), ...celebration.map((f) => join(review, f.path))],
  { lifts: celebration.map(({ lift }) => Math.round(lift / motion.lineage.registration.desktop.scale)), final: 'idle' });

const newActions = [
  ['settlement', '結算', 'working', 3, 2, [130, 140, 170, 160, 180, 220], 5],
];
for (const [id, label, state, columns, rows, ms, final] of newActions) {
  const sourcePath = join(here, 'sources/' + id + '.png');
  const source = read(sourcePath);
  const master = read(pose(state));
  const box = bounds(master);
  const frames = ms.map((_, index) => {
    const col = index % columns, row = Math.floor(index / columns);
    const x = Math.floor(col * source.width / columns), y = Math.floor(row * source.height / rows);
    const w = Math.floor((col + 1) * source.width / columns) - x;
    const h = Math.floor((row + 1) * source.height / rows) - y;
    const cell = clean(crop(source, x, y, w, h), 128);
    const cb = bounds(cell);
    assert.ok(cb.width < w && cb.height < h, id + ' has background or crosses a grid line');
    // Use one registration per atlas. Keep relative prop and character motion.
    const [scale, shift, ground] = [1.02, 0, 479];
    const width = Math.round(cb.width * scale), height = Math.round(cb.height * scale);
    const left = Math.round((cb.x - w / 2) * scale + box.x + box.width / 2 + shift);
    const top = ground - height;
    const frame = blank(512, 512);
    paste(frame, nearest(cell, width, height, cb), Math.min(512 - width, Math.max(0, left)), top);
    return frame;
  });
  sheet(id, label, 'candidates/action-' + id + '.png', frames, pose(state), ms, [sourcePath],
    { scene: true, final, sceneFootOffset: 0, timing: 'calibration proposal' });
}

const idlePath = pose('idle');
const idle = read(idlePath);
const ground = 480;
const mimikuEyes = [[172, 103, 243, 164], [313, 78, 379, 143]];

function registered(source, angle, shift, lift, scale = 1, pivot = 256) {
  const frame = blank(512, 512);
  const radians = angle * Math.PI / 180;
  const c = Math.cos(radians), s = Math.sin(radians);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const dx = (x - 256 - shift) / scale - (pivot - 256), dy = (y - ground + lift) / scale;
    const sx = Math.round(pivot + c * dx + s * dy);
    const sy = Math.round(ground - s * dx + c * dy);
    if (sx < 0 || sx >= 512 || sy < 0 || sy >= 512) continue;
    const start = (sy * 512 + sx) * 4, dest = (y * 512 + x) * 4;
    source.data.copy(frame.data, dest, start, start + 4);
  }
  if (!angle && scale === 1) return frame;
  const box = bounds(frame);
  const top = ground - lift - box.height;
  const aligned = blank(512, 512);
  paste(aligned, crop(frame, box.x, box.y, box.width, box.height), box.x, top);
  return aligned;
}

function lay(frame, sprite, x, y) {
  assert.ok(x >= 0 && y >= 0 && x + sprite.width <= 512 && y + sprite.height <= 512);
  for (let sy = 0; sy < sprite.height; sy++) for (let sx = 0; sx < sprite.width; sx++) {
    const src = (sy * sprite.width + sx) * 4, dst = ((y + sy) * 512 + x + sx) * 4;
    if (sprite.data[src + 3]) sprite.data.copy(frame.data, dst, src, src + 4);
  }
  return [x, y, x + sprite.width, y + sprite.height];
}

function eyeEdit(frame, atlas, patches) {
  for (const [[l, t, r, b], patch] of mimikuEyes.map((box, i) => [box, patches[i]])) {
    const w = r - l, h = b - t;
    const edit = nearest(crop(atlas, ...patch), w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const distance = ((x + .5 - w / 2) / (w / 2)) ** 2 + ((y + .5 - h / 2) / (h / 2)) ** 2;
      if (distance >= .96) continue;
      const i = (y * w + x) * 4;
      const dest = ((t + y) * 512 + l + x) * 4;
      edit.data.copy(frame.data, dest, i, i + 3);
    }
  }
}

function opaqueCrop(atlas, rect, width, height, minAlpha = 235) {
  const sprite = nearest(crop(atlas, ...rect), width, height);
  for (let i = 0; i < sprite.data.length; i += 4) {
    if (sprite.data[i + 3] < minAlpha) sprite.data.fill(0, i, i + 4);
    else sprite.data[i + 3] = 255;
  }
  return sprite;
}

function revised(id, label, ms, story, inputNames, build, anchorX = 256, extra = {}) {
  const file = 'action-' + id + '.png';
  const sourcePaths = inputNames.map((name) => join(here, name));
  const revision = extra.sceneScale ? 'B2-1R2' : 'B2-1R';
  const previous = ref(join(here, 'previous', extra.sceneScale ? 'b2-1r' : '', file));
  const frameAudit = [];
  const frames = ms.map((_, index) => {
    const { frame, reference, regions, registration, clearedEdge, readability } = build(index);
    const body = bounds(reference);
    assert.equal(body.y + body.height, ground - registration.lift, id + ' body foot');
    const occupied = bounds(frame);
    assert.ok(occupied.x > 0 && occupied.y > 0 && occupied.x + occupied.width < 512 &&
      occupied.y + occupied.height < 512, id + ' clips a cell edge');
    frameAudit.push({ registration, regions, readability, removedFringePixels: clearedEdge?.size ?? 0,
      ...checkMotion(frame, reference, regions, clearedEdge) });
    return frame;
  });
  sheet(id, label, 'candidates/' + file, frames, idlePath, ms, sourcePaths,
    { scene: true, anchorX, anchorY: ground, final: ms.length - 1, previous,
      story, frameAudit, revision, timing: 'calibration proposal', ...extra });
}

const source = (name) => read(join(here, 'sources/b2-1r', name + '.png'));
const invitation = source('invitation');
const props = source('props');
const split = Math.floor(props.width / 2);
const coinHalf = clean(crop(props, split, 0, props.width - split, props.height), 245);
const coinBox = bounds(coinHalf);
const rect = ({ x, y, width, height }) => [x, y, width, height];
const cardPath = 'sources/b2-1r2/card.png';
const cardAtlas = clean(read(join(here, cardPath)), 128);
const card = opaqueCrop(cardAtlas, rect(bounds(cardAtlas)), 114, 94, 128);
const coin = opaqueCrop(coinHalf, rect(coinBox), 68, 68, 245);
const actorScale = .78;
const actorX = 177;
const shift = actorX - 256;
const projectedHomeScale = Math.round(512 * motion.lineage.registration.desktop.scale / actorScale) / 512;
const invitationReference = registered(idle, 0, shift, 0, actorScale);
const invitationBody = bounds(invitationReference);
const readabilityLimits = { cardHomeWidth: 35, cardHomeHeight: 28, cardWidthRatio: [.30, .35],
  strongboxHeightRatio: [.35, .45], leanCentroidHome: 3, smallCoinDiameterRatio: [.30, .40] };

function assertBetween(value, [min, max], label) {
  assert.ok(value >= min && value <= max, `${label}: ${value} outside [${min}, ${max}]`);
}

function posedRegion([l, t, r, b], reference) {
  const base = bounds(idle);
  const posed = bounds(reference);
  const deltaY = posed.y - Math.round(ground + actorScale * (base.y - ground));
  return [Math.floor(actorX + (l - 256) * actorScale) - 2,
    Math.floor(ground + (t - ground) * actorScale) + deltaY - 2,
    Math.ceil(actorX + (r - 256) * actorScale) + 2,
    Math.ceil(ground + (b - ground) * actorScale) + deltaY + 2];
}

function separate(reference, sprite, x, y, label) {
  for (let sy = 0; sy < sprite.height; sy++) for (let sx = 0; sx < sprite.width; sx++) {
    const prop = (sy * sprite.width + sx) * 4 + 3;
    const body = ((y + sy) * 512 + x + sx) * 4 + 3;
    assert.ok(!sprite.data[prop] || !reference.data[body], label + ' overlaps body');
  }
}

const cardBounds = bounds(card);
const cardWidthRatio = cardBounds.width / invitationBody.width;
const cardHome = [cardBounds.width, cardBounds.height].map((size) => Math.floor(size * projectedHomeScale));
assertBetween(cardWidthRatio, readabilityLimits.cardWidthRatio, 'card width ratio');
assert.ok(cardHome[0] >= readabilityLimits.cardHomeWidth && cardHome[1] >= readabilityLimits.cardHomeHeight,
  'card at Home desktop: ' + cardHome.join('×'));

revised('invitation', '邀請', [130, 140, 170, 160, 180],
  '封蠟卡從嘴中升起，飄到右前方。眨眼後停留。', ['sources/b2-1r/invitation.png', cardPath], (index) => {
    const draft = registered(idle, 0, 0, 0);
    const regions = [];
    if (index === 0) {
      // Move the existing lid toward the mouth by a few pixels. Follow its lower trim.
      const drop = 6;
      for (let x = 0; x < 512; x++) {
        const edge = Math.max(147, Math.min(238, Math.round(255 - x * .24))) + drop;
        for (let y = 0; y < edge; y++) {
          const dest = (y * 512 + x) * 4;
          if (y < drop) draft.data.fill(0, dest, dest + 4);
          else idle.data.copy(draft.data, dest, ((y - drop) * 512 + x) * 4, ((y - drop) * 512 + x) * 4 + 4);
        }
      }
      regions.push([37, 30, 443, 245]);
    } else if (index === 3) {
      eyeEdit(draft, invitation, [[181, 628, 85, 71], [319, 599, 83, 67]]);
      regions.push(...mimikuEyes);
    }
    const reference = invitationReference;
    const frame = registered(draft, 0, shift, 0, actorScale);
    const moved = regions.map((box) => posedRegion(box, reference));
    if (index === 1) moved.push(lay(frame, crop(card, 0, 0, card.width, 46), 86, 287));
    if (index >= 2) {
      separate(reference, card, 365, 273, 'floating card');
      moved.push(lay(frame, card, 365, 273));
    }
    return { frame, reference, regions: moved, registration: { angle: 0, shift, lift: 0, scale: actorScale },
      readability: index >= 2 ? { cardWidthRatio, cardHome } : undefined };
  }, actorX, { sceneScale: actorScale, readabilitySummary: 'Home 桌機卡片 ' + cardHome.join('×') + ' px' });

const pool = source('pooled-funds');
const cashbox = opaqueCrop(pool, [337, 244, 157, 200], 112, 143, 245);

function removePaleEdge(frame) {
  const { data, width, height } = frame;
  const { minChannel, maxChannelSpread, maxRemovedPixels } = contract.pooledFringe;
  const removed = new Set();
  const clearable = (p) => {
    const i = p * 4;
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    return data[i + 3] && min >= minChannel &&
      Math.max(data[i], data[i + 1], data[i + 2]) - min <= maxChannelSpread;
  };
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const p = y * width + x;
    if (clearable(p) && [-1, 1, -width, width].some((d) => !data[(p + d) * 4 + 3])) removed.add(p);
  }
  for (const p of removed) {
    data.fill(0, p * 4, p * 4 + 4);
    const x = p % width, y = Math.floor(p / width);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      const neighbor = p + dy * width + dx;
      if (clearable(neighbor)) removed.add(neighbor);
    }
  }
  assert.ok(removed.size <= maxRemovedPixels, 'pooled fringe removal exceeded budget');
  return removed;
}

function centroidX(image) {
  let sum = 0, pixels = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    if (!image.data[i]) continue;
    sum += ((i - 3) / 4) % image.width;
    pixels++;
  }
  return sum / pixels;
}

function bite(draft, x, y) {
  lay(draft, coin, x, y);
  let overlap = 0;
  for (let cy = 0; cy < 32; cy++) for (let cx = 0; cx < coin.width; cx++) {
    const i = ((y + cy) * 512 + x + cx) * 4;
    const [red, green, blue, alpha] = idle.data.subarray(i, i + 4);
    if (alpha && red >= 170 && green >= 160 && blue >= 115 && red - blue < 100 &&
        coin.data[(cy * coin.width + cx) * 4 + 3]) {
      idle.data.copy(draft.data, i, i, i + 4);
      overlap++;
    }
  }
  assert.ok(overlap >= 35, 'coin must sit behind upper teeth');
  return overlap;
}

const happyPath = pose('happy');
const happyEyes = read(happyPath);
const hinged = blank(cashbox.width, cashbox.height + 2);
const hinge = 66;
paste(hinged, crop(cashbox, 0, 0, cashbox.width, hinge), 0, 0);
paste(hinged, crop(cashbox, 0, hinge, cashbox.width, cashbox.height - hinge), 0, hinge + 2);
// Bridge the two rows at the hinge using the existing lid edge.
for (let y = hinge; y < hinge + 2; y++) {
  paste(hinged, crop(cashbox, 0, hinge - 1, cashbox.width, 1), 0, y);
}
const cashHeight = bounds(cashbox).height;
const cashX = 391;
const cashY = ground - (bounds(cashbox).y + cashHeight);
const pivot = 414;
const angles = [0, 9, 15, 4, 0];
const poolReferences = angles.map((angle) => registered(idle, angle, shift, 0, actorScale, pivot));
const poolCentroids = poolReferences.map((reference) => centroidX(reference));
const poolLeanHome = poolCentroids.map((x) => Math.abs(x - poolCentroids[0]) * projectedHomeScale);
const leanStepHome = (poolCentroids[2] - poolCentroids[1]) * projectedHomeScale;
assert.ok(poolLeanHome[1] >= readabilityLimits.leanCentroidHome &&
  poolLeanHome[2] >= readabilityLimits.leanCentroidHome && leanStepHome >= readabilityLimits.leanCentroidHome,
  'forward lean at Home: ' + [poolLeanHome[1], poolLeanHome[2], leanStepHome].join(', '));
const coinRatio = bounds(coin).width / 196;
assertBetween(coinRatio, readabilityLimits.smallCoinDiameterRatio, 'coin diameter ratio');
const boxRatios = [];

revised('pooled-funds', '共用基金', [130, 140, 170, 160, 180],
  '用牙齒叼住小愛心幣，明顯向前傾。幣落入鐵皮錢箱，箱蓋輕彈後回正微笑。',
  ['sources/b2-1r/pooled-funds.png', 'sources/b2-1r/props.png', pathOf(happyPath)], (index) => {
    const angle = angles[index];
    const lift = 0;
    const reference = poolReferences[index];
    const draft = crop(idle, 0, 0, 512, 512);
    const regions = [];
    let toothOcclusionPixels;
    if (index < 2) {
      toothOcclusionPixels = bite(draft, index ? 233 : 209, 197);
      regions.push(index ? [178, 245, 297, 347] : [135, 250, 199, 316]);
    } else if (index === 4) {
      eyeEdit(draft, happyEyes, [[169, 108, 76, 68], [309, 76, 71, 66]]);
      regions.push(...mimikuEyes.map((box) => posedRegion(box, reference)));
    }
    const frame = registered(draft, angle, shift, lift, actorScale, pivot);
    const box = index === 3 ? hinged : cashbox;
    const boxY = cashY - (index === 3 ? 2 : 0);
    separate(reference, box, cashX, boxY, 'strongbox');
    const visibleBox = bounds(box);
    assert.equal(boxY + visibleBox.y + visibleBox.height, ground, 'strongbox foot');
    const boxRatio = visibleBox.height / bounds(reference).height;
    assertBetween(boxRatio, readabilityLimits.strongboxHeightRatio, 'strongbox/body height ratio');
    boxRatios.push(boxRatio);
    regions.push(lay(frame, box, cashX, boxY));
    if (index === 2) {
      const released = nearest(coin, 53, 53);
      regions.push(lay(frame, released, 406, 383));
    }
    const clearedEdge = removePaleEdge(frame);
    assert.equal(removePaleEdge(frame).size, 0, 'pooled pale fringe remains');
    for (let i = 3; i < frame.data.length; i += 4) assert.ok(frame.data[i] === 0 || frame.data[i] === 255, 'pooled alpha edge');
    return { frame, reference, regions, registration: { angle, shift, lift, scale: actorScale, pivot }, clearedEdge,
      readability: { boxRatio, leanHome: poolLeanHome[index], toothOcclusionPixels } };
  }, actorX, { sceneScale: actorScale, coinRatio, leanStepHome,
    pooledPropReference: ref(join(approved, 'props/feature/pooled.png')) });
groups.at(-1).readabilitySummary = '錢箱高度 ' +
  [Math.min(...boxRatios), Math.max(...boxRatios)].map((ratio) => Math.round(ratio * 100)).join('–') +
  '% · 第 2–3 格 Home 重心差 ' + leanStepHome.toFixed(1) + ' px';

const guide = source('guide');
const looking = registered(idle, 0, 0, 0);
eyeEdit(looking, guide, [[222, 110, 90, 82], [390, 91, 92, 80]]);
const gaze = checkMotion(looking, idle, mimikuEyes);
const oldGuide = read(join(here, 'previous/action-guide.png'));
const oldGlove = crop(oldGuide, 2 * 512, 270, 128, 115);
assert.throws(() => checkMotion(oldGlove, blank(oldGlove.width, oldGlove.height), [[0, 0, 128, 115]]),
  /new glove-like white component/);
revised('guide', '導覽', [130, 140, 170, 220],
  '往一側看，同側傾斜，輕跳一下後回正。左右可鏡像。', ['sources/b2-1r/guide.png'], (index) => {
    const angle = [0, -4, -4, 0][index], lift = index === 2 ? 12 : 0, shift = 0;
    const reference = registered(idle, angle, shift, lift);
    const frame = index === 3 ? reference : registered(looking, angle, shift, lift);
    const regions = index === 3 ? [] : mimikuEyes.map(([l, t, r, b]) => angle
      ? [l - 30, t - 27, r, b + 6] : [l, t, r, b]);
    return { frame, reference, regions, registration: { angle, shift, lift } };
  }, 256, { gaze });

save('b2-1r2.manifest.json', Buffer.from(JSON.stringify({
  reviewOnly: true, contract, readabilityLimits, projectedHomeScale, locked: Object.fromEntries(locked),
  actions: groups.filter((group) => group.revision === 'B2-1R2'),
}, null, 2) + '\n'));
const scenes = Object.fromEntries(Object.entries(motion.scenes.home).map(([variant, scene]) =>
  [variant, { ...scene, layers: scene.layers.map((layer) => ({ ...layer, path: '../' + layer.path })) }]));
const data = { groups, scenes, homeRegistration: motion.lineage.registration,
  idle: pathOf(pose('idle')), reviewOnly: true };
save('review-data.js', Buffer.from('window.calibration = ' + JSON.stringify(data, null, 2) + ';\n'));
console.log(check ? 'B2-1R2: 2 revised sheets byte-identical, 21 approved candidates hash-locked'
  : 'B2-1R2: 2 revised sheets built, 21 approved candidates hash-locked');
