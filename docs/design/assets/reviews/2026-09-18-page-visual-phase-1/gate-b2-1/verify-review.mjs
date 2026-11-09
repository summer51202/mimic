import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../../../../../../web/package.json', import.meta.url));
const { chromium } = require('playwright');
const browser = await chromium.launch({
  executablePath: process.env.B2_CHROME || undefined,
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(pathToFileURL(join(import.meta.dirname, 'index.html')).href);
  await page.waitForSelector('body[data-ready="true"]');
  assert.equal(await page.locator('article').count(), 15);
  assert.equal(await page.locator('.portrait-list canvas').count(), 16);
  assert.equal(await page.locator('.scene canvas').count(), 4);
  for (const id of ['invitation', 'pooled-funds', 'guide']) {
    const action = page.locator('#review-' + id);
    await action.getByLabel('逐格').selectOption({ value: '2' });
    assert.deepEqual(await action.locator('.comparison canvas').evaluateAll((items) =>
      items.map((item) => item.dataset.frame)), ['2', '2']);
    await action.getByLabel('Home 場景尺寸').selectOption('phone');
    assert.equal(await action.locator('.scene canvas').getAttribute('width'), '390');
    await action.getByLabel('Home 場景尺寸').selectOption('desktop');
    if (id !== 'guide') {
      assert.equal(await action.locator('.scene canvas').getAttribute('data-sprite-size'), '180');
      assert.match(await action.locator('.comparison figcaption').first().innerText(), /B2-1R2/);
      assert.match(await action.locator('.comparison figcaption').last().innerText(), /B2-1R 舊版/);
      assert.match(await action.locator('.readability').innerText(), /Home/);
      if (process.env.B2_PROOF_DIR) {
        await action.locator('.scene canvas').screenshot({ path: join(process.env.B2_PROOF_DIR, 'b2-1r2-' + id + '-home.png') });
      }
    }
  }
  const guide = page.locator('#review-guide');
  const canvas = guide.locator('.comparison canvas').first();
  await guide.getByLabel('逐格').selectOption({ value: '2' });
  assert.equal(await canvas.getAttribute('data-frame'), '2');
  assert.equal(await guide.locator('.comparison canvas').last().getAttribute('data-frame'), '2');
  assert.equal(await page.locator('.comparison').count(), 3);
  const before = await canvas.screenshot();
  await guide.getByLabel('左右鏡像').check();
  assert.notDeepEqual(await canvas.screenshot(), before);
  await guide.getByLabel('Home 場景尺寸').selectOption('phone');
  assert.equal(await guide.locator('.scene canvas').getAttribute('width'), '390');
  await page.locator('#zoom').selectOption('4');
  assert.equal(await canvas.evaluate((item) => item.style.width), '2048px');
  await page.locator('#gray').check();
  assert.equal(await canvas.evaluate((item) => getComputedStyle(item).filter), 'grayscale(1)');
  await page.locator('#gray').uncheck();
  await page.locator('#zoom').selectOption('1');
  const invite = page.locator('#review-invitation');
  await page.evaluate(() => {
    document.querySelector('#review-guide button').click();
    document.querySelector('#review-invitation button').click();
  });
  assert.equal(await canvas.getAttribute('data-frame'), '3');
  await page.keyboard.press('Escape');
  assert.equal(await invite.locator('.comparison canvas').first().getAttribute('data-frame'), '4');
  const ledger = page.locator('#review-ledger');
  await ledger.getByRole('button', { name: '播放一次' }).click();
  await page.waitForFunction(() => document.querySelector('#review-ledger canvas').dataset.frame === '4');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('#reduce').checked);
  const celebration = page.locator('#review-celebration');
  await celebration.getByRole('button', { name: '播放一次' }).click();
  assert.equal(await celebration.locator('.gallery canvas').getAttribute('data-frame'), 'idle');
  if (process.env.B2_PROOF_DIR) {
    await page.locator('#review-pooled-funds').screenshot({ path: join(process.env.B2_PROOF_DIR, 'b2-home-proof.png') });
    await page.locator('.portrait-list').screenshot({ path: join(process.env.B2_PROOF_DIR, 'b2-avatar-proof.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#zoom').selectOption('4');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.deepEqual(errors, []);
  console.log('Playwright PASS: 1440/390, 3 synced comparisons, 4 Home scenes, mirror, grayscale, zoom, playback, Escape, reduced motion');
} finally {
  await browser.close();
}
