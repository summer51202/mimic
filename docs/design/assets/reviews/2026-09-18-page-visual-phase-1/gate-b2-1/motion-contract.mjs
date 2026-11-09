import assert from 'node:assert/strict';

export const contract = {
  maxChangedOutsideMotionPixels: 0,
  pooledFringe: { minChannel: 190, maxChannelSpread: 40, maxRemovedPixels: 2000 },
  glove: {
    minAlpha: 160,
    minChannel: 208,
    maxChannelSpread: 32,
    masterWhiteTolerancePx: 6,
    maxNewConnectedPixels: 23,
    connectivity: 4,
  },
};

const { glove } = contract;
function white(data, index) {
  const i = index * 4;
  const min = Math.min(data[i], data[i + 1], data[i + 2]);
  const max = Math.max(data[i], data[i + 1], data[i + 2]);
  return data[i + 3] >= glove.minAlpha && min >= glove.minChannel && max - min <= glove.maxChannelSpread;
}

export function checkMotion(frame, reference, regions, clearedEdge = new Set()) {
  const { width, height, data } = frame;
  assert.deepEqual([width, height], [reference.width, reference.height]);
  const size = width * height;
  const allowedWhite = new Uint8Array(size);
  const radius = glove.masterWhiteTolerancePx;
  for (let i = 0; i < size; i++) {
    if (!white(reference.data, i)) continue;
    const x = i % width, y = Math.floor(i / width);
    const left = Math.max(0, x - radius), right = Math.min(width - 1, x + radius);
    for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy++) {
      allowedWhite.fill(1, yy * width + left, yy * width + right + 1);
    }
  }

  const unmatchedWhite = new Uint8Array(size);
  let outside = 0;
  let changed = 0;
  let l = width, t = height, r = 0, b = 0;
  for (let i = 0; i < size; i++) {
    if (!allowedWhite[i] && white(data, i)) unmatchedWhite[i] = 1;
    if (data.readUInt32BE(i * 4) === reference.data.readUInt32BE(i * 4)) continue;
    const x = i % width, y = Math.floor(i / width);
    changed++;
    l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x + 1); b = Math.max(b, y + 1);
    if (!clearedEdge.has(i) && !regions.some(([x1, y1, x2, y2]) => x >= x1 && y >= y1 && x < x2 && y < y2)) outside++;
  }

  let largest = 0;
  for (let i = 0; i < size; i++) {
    if (!unmatchedWhite[i]) continue;
    const queue = [i];
    unmatchedWhite[i] = 0;
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head], x = p % width;
      for (const n of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (!unmatchedWhite[n]) continue;
        unmatchedWhite[n] = 0;
        queue.push(n);
      }
    }
    largest = Math.max(largest, queue.length);
  }
  assert.ok(outside <= contract.maxChangedOutsideMotionPixels, `non-motion changes: ${outside}`);
  assert.ok(largest <= glove.maxNewConnectedPixels, `new glove-like white component: ${largest} px`);
  return { outside, changed, changedBounds: changed ? [l, t, r, b] : null, largestNewWhite: largest };
}

if (process.argv.includes('--self-test')) {
  const image = () => ({ width: 16, height: 16, data: Buffer.alloc(16 * 16 * 4) });
  const master = image(), frame = image();
  for (let y = 4; y < 9; y++) frame.data.fill(255, (y * 16 + 4) * 4, (y * 16 + 9) * 4);
  assert.throws(() => checkMotion(frame, master, []), /non-motion changes: 25/);
  assert.throws(() => checkMotion(frame, master, [[4, 4, 9, 9]]), /white component: 25/);
  frame.data.copy(master.data);
  assert.equal(checkMotion(frame, master, []).largestNewWhite, 0);
  console.log('Motion contract PASS: rejects out-of-region pixels and new 25 px white component; accepts master white');
}
