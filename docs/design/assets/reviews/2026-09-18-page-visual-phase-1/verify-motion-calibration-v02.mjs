import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const require = createRequire(new URL("../../../../../web/package.json", import.meta.url));
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const root = import.meta.dirname;
const files = ["motion-calibration-v02.manifest.json", "motion-calibration-v02.data.js"];
const read = (path) => readFileSync(join(root, path));
const manifest = JSON.parse(read(files[0]));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const variants = ["desktop", "phone"];

test("source, dimensions, alpha, grounded poses, localized differences and deterministic rebuild", () => {
  const sourceEvidence = [...Object.values(manifest.sourceRecords), manifest.prompt, ...Object.values(manifest.masks).map(({ original }) => original)];
  for (const { path, sha256 } of sourceEvidence) assert.equal(hash(read(path)), sha256, path);
  const families = ["title", "idle", "ledger", "celebration", "fire"];
  for (const id of families) {
    for (const variant of variants) {
      const sequence = manifest.sequences[id];
      const master = PNG.sync.read(read(sequence[variant + "Master"].path));
      for (const frame of sequence[variant]) {
        const image = PNG.sync.read(read(frame.path));
        assert.equal(hash(read(frame.path)), frame.sha256, frame.path);
        assert.equal(image.width, master.width, frame.path);
        assert.equal(image.height, master.height, frame.path);
        const action = id === "ledger" || id === "celebration";
        const allowed = manifest.masks[id + "-" + (action ? "desktop" : variant)];
        const [left, top, right, bottom] = allowed.target;
        const ratio = Math.min(image.width / (right - left), image.height / (bottom - top));
        const w = Math.round((right - left) * ratio), h = Math.round((bottom - top) * ratio);
        const anchor = (png) => png.data.findLastIndex((value, index) => index % 4 === 3 && value >= 224);
        if (id !== "title") assert.equal(anchor(image), anchor(master), frame.path + " ground anchor");
        let changed = 0;
        for (let y = 0; y < image.height; y++) {
          for (let x = 0; x < image.width; x++) {
            const offset = (y * image.width + x) * 4;
            const pixel = image.data.readUInt32LE(offset);
            if (image.data[offset + 3] === 0) assert.equal(pixel, 0, frame.path + " transparent RGB");
            if (pixel === master.data.readUInt32LE(offset)) continue;
            changed++;
            const sx = action ? Math.floor(left + (x - Math.floor((image.width - w) / 2) + .5) * (right - left) / w) : x;
            const sy = action ? Math.floor(top + (y - (image.height - h) + .5) * (bottom - top) / h) : y;
            assert.ok(allowed.regions.some(([l, t, r, b]) => sx >= l && sx < r && sy >= t && sy < b), frame.path + " locality");
          }
        }
        if (frame.changed) assert.ok(changed > 0, frame.path);
      }
      assert.equal(new Set(sequence[variant].map(({ sha256 }) => sha256)).size, sequence[variant].length, id + " distinct frames");
    }
  }
  const dir = "samples/motion-calibration-v02";
  const generated = [...files, ...readdirSync(join(root, dir)).map((name) => dir + "/" + name)];
  const before = generated.map((path) => hash(read(path)));
  const build = spawnSync(process.execPath, [join(root, "compose-motion-calibration-v02.mjs")], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  assert.deepEqual(generated.map((path) => hash(read(path))), before);
  console.log(generated.length + " byte-identical files");
});

test("Playwright Motion calibration", async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1440, 900], [1200, 800]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(new URL("./motion-calibration-v02-review.html", import.meta.url).href);
    await page.locator(".layer").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth === innerWidth);
    assert.ok(await noOverflow(), width + " Landing overflow");
    await page.locator("#cta").click();
    await page.locator(".layer").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
    assert.ok(await noOverflow(), width + " Home overflow");
    await page.locator("details").first().locator("summary").click();
    await page.locator("#scale").click();
    assert.ok(await noOverflow(), width + " 4× overflow");
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.clock.install();
  await page.addInitScript(() => {
    window.trace = [];
    Math.random = () => 0;
    document.addEventListener("motion-frame", ({ detail }) => window.trace.push({ ...detail, time: performance.now() }), true);
  });
  await page.goto(new URL("./motion-calibration-v02-review.html", import.meta.url).href);
  const press = (id) => page.locator("#" + id).evaluate((button) => { button.focus(); button.click(); });
  const frames = (id) => page.evaluate((id) => window.trace.filter((frame) => frame.id === id), id);
  const clear = () => page.evaluate(() => { window.trace.length = 0; });
  const advance = (ms) => page.clock.runFor(ms);
  const verifyFrames = async (id, schedule, { resultIndex } = {}) => {
    const log = await frames(id);
    assert.deepEqual(log.slice(0, schedule.length).map((entry) => entry.index), schedule.map((_, i) => i), id);
    for (let i = 1; i < schedule.length; i++) {
      assert.ok(Math.abs(log[i].time - log[i - 1].time - schedule[i - 1]) <= 34, id + " timing " + JSON.stringify(log));
    }
    if (resultIndex !== undefined) {
      assert.deepEqual(log.slice(schedule.length).map(({ index }) => index), [resultIndex]);
      const total = schedule.reduce((sum, ms) => sum + ms, 0);
      assert.ok(Math.abs(log.at(-1).time - log[0].time - total) <= 34, id + " total duration");
    }
  };

  await clear();
  await advance(8050);
  assert.equal((await frames("title"))[0]?.index, 0, "infrequent automatic blink");
  await advance(400);
  await clear();
  await press("blink");
  await advance(350);
  await verifyFrames("title", [90, 90, 90], { resultIndex: 0 });
  await clear();
  const title = page.locator('[data-prop="title"]');
  await title.dispatchEvent("pointerenter", { pointerType: "mouse" });
  await advance(350);
  await title.dispatchEvent("pointerenter", { pointerType: "mouse" });
  await advance(350);
  await verifyFrames("title", [90, 90, 90], { resultIndex: 0 });
  await title.dispatchEvent("pointerleave");
  await clear();
  await press("chest");
  await advance(800);
  await verifyFrames("chest", [100, 90, 150, 90, 70, 110, 140], { resultIndex: 6 });
  await clear();
  await press("chest");
  await advance(710);
  await verifyFrames("chest", [120, 100, 80, 70, 90, 80, 120], { resultIndex: 6 });
  await clear();
  await press("carving");
  await advance(350);
  await verifyFrames("carving", [100, 100, 100], { resultIndex: 2 });
  await page.evaluate(() => {
    window.announcements = [];
    new MutationObserver(() => window.announcements.push(document.querySelector("#sentence").textContent))
      .observe(document.querySelector("#sentence"), { childList: true });
  });
  await press("dialogue");
  await advance(30);
  assert.equal(await page.locator("#dialogue span").textContent(), "準");
  await press("dialogue");
  assert.equal(await page.locator("#dialogue span").textContent(), await page.locator("#sentence").textContent());
  assert.deepEqual(await page.evaluate(() => window.announcements), ["準備好了，就進入秘密基地。"]);

  await clear();
  await press("cta");
  await advance(550);
  await verifyFrames("idle", [200, 200, 200]);
  await verifyFrames("fire", Array(4).fill(1000 / 6));
  assert.equal(await page.evaluate(() => document.activeElement.id), "cta");
  await clear();
  await press("ledger");
  await advance(540);
  await verifyFrames("ledger", [100, 100, 100, 100, 100], { resultIndex: 4 });
  assert.equal(await page.locator("#result").textContent(), "已記帳");
  assert.equal(await page.evaluate(() => document.activeElement.id), "ledger");

  await clear();
  await press("both");
  await advance(300);
  assert.deepEqual((await frames("ledger")).map(({ index }) => index), [0, 4]);
  assert.deepEqual((await frames("idle")), []);
  assert.ok((await frames("celebration")).length > 1);
  await page.keyboard.press("Escape");
  assert.equal((await frames("celebration")).at(-1).index, 5);
  assert.equal(await page.locator("#result").textContent(), "冒險完成");
  await clear();
  await press("celebration");
  await advance(350);
  assert.equal((await frames("celebration")).length, 0);
  await press("reset");
  await clear();
  await press("celebration");
  await advance(1050);
  await verifyFrames("celebration", [130, 140, 170, 160, 180, 220], { resultIndex: 5 });
  await press("reset");
  await press("celebration");
  await press("skip");
  assert.equal(await page.locator("#result").textContent(), "冒險完成");

  await press("reset");
  await press("pause");
  await clear();
  await advance(500);
  assert.equal((await frames("fire")).length, 0);
  await press("pause");
  await advance(250);
  assert.ok((await frames("fire")).length > 0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await clear();
  await advance(600);
  assert.equal((await frames("fire")).length, 0);
  assert.equal((await frames("idle")).length, 0);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await advance(40);
  await clear();
  await press("ledger");
  await advance(600);
  assert.deepEqual((await frames("ledger")).map(({ index }) => index), [4]);
  assert.deepEqual(await frames("idle"), []);
  assert.deepEqual(await frames("fire"), []);
  await press("celebration");
  assert.deepEqual((await frames("celebration")).map(({ index }) => index), [5]);
  await page.locator('[data-scene="landing"]').evaluate((button) => button.click());
  await clear();
  await press("chest");
  await press("carving");
  assert.deepEqual((await frames("chest")).map(({ index }) => index), [6]);
  assert.deepEqual((await frames("carving")).map(({ index }) => index), [2]);
  await page.close();
});
