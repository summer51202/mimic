import { expect as baseExpect, test, type BrowserContext, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createGroupByApi, requireBackend, signInWithApiSession, uniqueAccounts } from "./fixtures/accounts";

test.use({ serviceWorkers: "block" });
test.describe.configure({ timeout: 180_000 });
const expect = baseExpect.configure({ timeout: 30_000 });

type Session = { access_token: string };
type Space = { id: string; opened_on: string };

async function api<T>(session: Session, path: string, body: object): Promise<T> {
  const base = new URL(process.env.MIMIC_API_BASE_URL ?? "http://127.0.0.1:3707/api/v1");
  if (base.hostname !== "127.0.0.1") throw Error("Phase 2G requires a 127.0.0.1 backend");
  const response = await fetch(base.href.replace(/\/$/, "") + path, {
    method: "POST",
    headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  expect(response.ok, `${path}: ${response.status} ${text}`).toBe(true);
  return JSON.parse(text).data;
}

async function setupPersonal(context: BrowserContext, info: TestInfo) {
  const db = process.env.MIMIC_RUNTIME_DATABASE_URL;
  const backend = process.env.MIMIC_API_BASE_URL;
  if (!db || new URL(db).hostname !== "127.0.0.1" || !backend || new URL(backend).hostname !== "127.0.0.1") {
    throw Error("Phase 2G requires a dedicated local API and database");
  }
  await requireBackend();
  const session = await signInWithApiSession(context, uniqueAccounts(info).owner);
  const settings = { currency: "TWD", timezone: "Asia/Taipei" };
  const personal = await api<Space>(session, "/me/spaces", { ...settings, name: "日常記帳", mode: "PERSONAL_EXPENSES" });
  await api<Space>(session, "/me/spaces", { ...settings, name: "空白個人寶箱", mode: "PERSONAL_EXPENSES" });
  return { session, personal, settings };
}

async function setup(context: BrowserContext, info: TestInfo) {
  const { session, personal, settings } = await setupPersonal(context, info);
  const group = await createGroupByApi(session, "旅行帳目");
  const shared = await api<Space>(session, `/groups/${group.id}/spaces`, { ...settings, name: "旅行分帳", mode: "SHARED_EXPENSES" });
  const pooled = await api<Space>(session, `/groups/${group.id}/spaces`, { ...settings, name: "旅行共同基金", mode: "POOLED_FUND" });
  return { session, group, personal, shared, pooled };
}

test("the floating button reopens each expense dialog after closing it", async ({ context, page }, info) => {
  test.skip(info.project.name !== "desktop", "Exercise all three routes in one project");
  const { personal, shared, pooled } = await setup(context, info);
  for (const [url, title] of [
    [`/app/personal?space=${personal.id}`, "記一筆支出"],
    [`/app/spaces/${shared.id}`, "新增共同支出"],
    [`/app/spaces/${pooled.id}`, "新增基金支出"],
  ]) {
    await test.step(title, async () => {
      await page.goto(url);
      const quick = page.getByRole("link", { name: "記一筆支出", exact: true });
      const dialog = page.getByRole("dialog", { name: title, exact: true });
      await clickHydrated(quick);
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "關閉", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page).not.toHaveURL(/[?&]quick=1/);
      await clickHydrated(quick);
      await expect(dialog).toBeVisible();
      const mode = modes.find(mode => mode.trigger === title)!;
      await fillExpense(dialog, "浮動鈕成功後可以再開", mode);
      await dialog.getByRole("button", { name: mode.submit }).click();
      await expect(dialog).toBeHidden({ timeout: 30_000 });
      await expect(page).not.toHaveURL(/[?&]quick=1/);
      if (title === "記一筆支出") await expect(page).toHaveURL(new RegExp(`[?&]space=${personal.id}`));
      await clickHydrated(quick);
      await expect(dialog).toBeVisible();
    });
  }
});

const modes = [
  { name: "personal", trigger: "記一筆支出", submit: "確認記帳" },
  { name: "shared", trigger: "新增共同支出", submit: "確認記帳" },
  { name: "pooled", trigger: "新增基金支出", submit: "記錄基金支出" },
] as const;
type Mode = typeof modes[number];
const companion = (page: Page) => page.locator("[data-record-ledger-companion]");
const floating = (page: Page) => page.getByRole("link", { name: "記一筆支出", exact: true });
const urlFor = (name: Mode["name"], space: Space) =>
  name === "personal" ? `/app/personal?space=${space.id}` : `/app/spaces/${space.id}`;

async function clickHydrated(locator: Locator) {
  await expect.poll(() => locator.evaluate(node =>
    Object.keys(node).some(key => key.startsWith("__reactProps")),
  )).toBe(true);
  await locator.click();
}

async function fillExpense(dialog: Locator, title: string, mode: Mode) {
  await dialog.getByLabel("支出名稱", { exact: true }).fill(title);
  await dialog.getByLabel(/^(總)?金額/).first().fill("25");
  if (mode.name === "shared") await dialog.getByLabel(/^付款金額－/).fill("25");
}

test("private references, settlement and contributions leave the companion hidden", async ({ context, page }, info) => {
  test.skip(info.project.name !== "desktop", "Mutation guards are independent of viewport");
  const { session, personal, shared, pooled } = await setup(context, info);
  const ownerResponse = await fetch(`${process.env.MIMIC_API_BASE_URL}/me`, {
    headers: { authorization: `Bearer ${session.access_token}` },
  });
  expect(ownerResponse.ok).toBe(true);
  const { data: owner } = await ownerResponse.json();
  await api(session, `/spaces/${shared.id}/shared-expenses`, {
    title: "可參照的共同支出", amount_minor: "2400", occurred_on: shared.opened_on, request_id: crypto.randomUUID(),
    payers: [{ user_id: owner.id, amount_minor: "2400" }],
    allocations: [{ user_id: owner.id, amount_minor: "2400" }],
  });
  await page.goto(urlFor("shared", shared));
  await page.getByRole("button", { name: "加入我的帳本－可參照的共同支出" }).click();
  const add = page.getByRole("dialog", { name: "加入我的帳本" });
  await add.getByLabel("加入到").selectOption(personal.id);
  await add.getByRole("button", { name: "加入我的帳本", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已把你的分攤加入");
  await expect(companion(page)).toBeHidden();
  await page.goto(urlFor("personal", personal));
  await page.getByRole("button", { name: "編輯私人資訊－可參照的共同支出" }).click();
  await page.getByLabel("私人備註").fill("更新私人備註");
  await page.getByRole("button", { name: "儲存私人資訊" }).click();
  await expect(page.getByText("更新私人備註")).toBeVisible();
  await expect(companion(page)).toBeHidden();
  await page.getByRole("button", { name: "移除私人參照－可參照的共同支出" }).click();
  await page.getByRole("button", { name: "確認移除" }).click();
  await expect(page.getByRole("status")).toContainText("已移除私人參照");
  await expect(companion(page)).toBeHidden();
  await page.goto(urlFor("shared", shared));
  await page.getByRole("button", { name: "開始結算批次" }).click();
  await page.getByRole("button", { name: "建立批次並鎖定期間" }).click();
  await expect(page.getByText("已完成", { exact: true })).toBeVisible();
  await expect(companion(page)).toBeHidden();
  await page.goto(urlFor("pooled", pooled));
  await page.getByRole("button", { name: "建立投入排程" }).click();
  await page.getByLabel("排程名稱").fill("每月投入");
  await page.getByLabel("預設投入金額").fill("25");
  await page.getByRole("button", { name: "儲存投入排程" }).click();
  await expect(page.getByRole("status")).toContainText("投入排程已儲存");
  await expect(companion(page)).toBeHidden();
  await page.getByRole("button", { name: "確認已投入" }).click();
  await expect(page.getByRole("status")).toContainText("已確認實際投入");
  await expect(companion(page)).toBeHidden();
});

function overlaps(a: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>, b: typeof a) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

for (const [width, height] of [[360, 780], [390, 844], [768, 1024], [1440, 900]]) {
  test(`new expenses play one accessible, stationary confirmation at ${width}×${height}`, async ({ context, page }, info) => {
    test.skip(info.project.name !== "desktop", "Explicit viewport matrix");
    const fixture = await setup(context, info);
    await page.setViewportSize({ width, height });
    for (const mode of modes) {
      await test.step(mode.name, async () => {
        await page.goto(urlFor(mode.name, fixture[mode.name]));
        await expect(companion(page)).toBeHidden();
        const trigger = page.getByRole("button", { name: mode.trigger, exact: true });
        await clickHydrated(trigger);
        const dialog = page.getByRole("dialog", { name: mode.trigger, exact: true });
        await fillExpense(dialog, `確認記帳 ${mode.name} ${width}`, mode);
        await companion(page).evaluate(host => {
          const frames: { index: number; elapsed: number }[] = [];
          let shown: number | undefined;
          let scroll = 0;
          const observer = new MutationObserver(() => {
            if (host.hasAttribute("hidden")) {
              if (shown === undefined) return;
              observer.disconnect();
              host.setAttribute("data-playback-trace", JSON.stringify({ frames, elapsed: performance.now() - shown, scroll, endScroll: window.scrollY }));
              return;
            }
            if (shown === undefined) {
              shown = performance.now();
              scroll = window.scrollY;
            }
            const sprite = host.querySelector<HTMLElement>("[data-variant]:not([hidden])")!;
            const frame = Number(sprite.style.getPropertyValue("--frame"));
            if (frames.at(-1)?.index !== frame) frames.push({ index: frame, elapsed: performance.now() - shown });
          });
          observer.observe(host, { attributes: true, subtree: true, attributeFilter: ["hidden", "style"] });
        });
        await dialog.getByRole("button", { name: mode.submit, exact: true }).click();
        await expect(dialog).toBeHidden({ timeout: 30_000 });
        await expect(companion(page)).toBeVisible();
        const sprite = companion(page).locator("[data-variant]:visible");
        const desktop = width >= 768;
        await expect(sprite).toHaveAttribute("data-variant", desktop ? "desktop" : "phone");
        await expect(sprite).toHaveCSS("background-image", /mimiku-record-ledger-inkline-(desktop|phone)\.png/);
        await expect(companion(page)).toHaveAttribute("aria-hidden", "true");
        await expect(companion(page)).toHaveCSS("pointer-events", "none");
        const box = (await companion(page).boundingBox())!;
        const button = (await floating(page).boundingBox())!;
        expect([box.width, box.height]).toEqual(desktop ? [118, 123] : [96, 100]);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(height);
        expect(overlaps(box, button)).toBe(false);
        const nav = desktop ? null : await page.getByRole("navigation", { name: "Primary app sections" }).boundingBox();
        if (nav) expect(overlaps(box, nav)).toBe(false);
        await expect(trigger).toBeFocused();
        const settledScroll = await page.evaluate(() => window.scrollY);
        await expect(companion(page)).toHaveAttribute("data-playback-trace", /.+/);
        const playback = JSON.parse((await companion(page).getAttribute("data-playback-trace"))!) as {
          frames: { index: number; elapsed: number }[]; elapsed: number; scroll: number; endScroll: number;
        };
        expect(playback.frames.map(({ index }) => index)).toEqual([0, 1, 2, 3, 4]);
        expect(playback.elapsed).toBeGreaterThanOrEqual(1950);
        expect(playback.elapsed).toBeLessThan(2250);
        expect(playback.endScroll).toBe(settledScroll);
        console.log(JSON.stringify({ width, height, mode: mode.name, box, button, nav, ...playback }));
      });
    }
  });
}

test("reduced motion holds frame four and explicit pause leaves the Home key alone", async ({ context, page }, info) => {
  test.skip(info.project.name !== "desktop", "Preference behavior is independent of viewport");
  const fixture = await setup(context, info);
  const key = "mimic.home.latest-activity.personal";
  const url = urlFor("personal", fixture.personal);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  const mode = modes[0];
  const trigger = page.getByRole("button", { name: mode.trigger, exact: true });
  const dialog = page.getByRole("dialog", { name: mode.trigger, exact: true });
  await trigger.click();
  await fillExpense(dialog, "減少動態記帳", mode);
  await dialog.getByRole("button", { name: mode.submit }).click();
  await expect(companion(page)).toBeVisible();
  await expect(companion(page).locator("[data-variant]:visible")).toHaveCSS("--frame", "4");
  await expect(companion(page)).toBeHidden({ timeout: 2500 });
  const seen = await page.evaluate(key => localStorage.getItem(key), key);
  expect(seen).toMatch(/^\d{4}-\d{2}-\d{2}\//);
  await page.evaluate(() => localStorage.setItem("mimic.landing.animation-paused", "true"));
  await trigger.click();
  await fillExpense(dialog, "暫停動態記帳", mode);
  await dialog.getByRole("button", { name: mode.submit }).click();
  await expect(page.getByRole("status").filter({ hasText: "暫停動態記帳" })).toBeVisible();
  await expect(companion(page)).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(seen);
});

test("edit, delete, offline submission and server errors leave the companion hidden", async ({ context, page }, info) => {
  test.skip(info.project.name !== "desktop", "Mutation guards are independent of viewport");
  const { session, personal } = await setup(context, info);
  await api(session, `/spaces/${personal.id}/personal-expenses`, {
    title: "原有支出", amount_minor: "2400", occurred_on: personal.opened_on, request_id: crypto.randomUUID(),
  });
  await page.goto(urlFor("personal", personal));
  await page.getByRole("button", { name: "編輯 原有支出" }).click();
  const edit = page.getByRole("dialog", { name: "編輯支出" });
  await edit.getByLabel("支出名稱").fill("已修改支出");
  await edit.getByRole("button", { name: "儲存修改" }).click();
  await expect(page.getByRole("status").filter({ hasText: "已修改支出" })).toBeVisible({ timeout: 30_000 });
  await expect(companion(page)).toBeHidden();
  await page.getByRole("button", { name: "刪除 已修改支出" }).click();
  await page.getByRole("button", { name: "確認刪除" }).click();
  await expect(page.getByRole("status").filter({ hasText: "已刪除" })).toBeVisible();
  await expect(companion(page)).toBeHidden();

  const mode = modes[0];
  await page.getByRole("button", { name: mode.trigger, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: mode.trigger, exact: true });
  await fillExpense(dialog, "無法新增的支出", mode);
  const submit = dialog.getByRole("button", { name: mode.submit, exact: true });
  await context.setOffline(true);
  await expect(submit).toBeDisabled();
  await expect(companion(page)).toBeHidden();
  await context.setOffline(false);
  await page.route(`**/api/app/spaces/${personal.id}/personal-expenses`, route =>
    route.fulfill({ status: 500, json: { error: { code: "INTERNAL_ERROR" } } }));
  await submit.click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(companion(page)).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("mimic.home.latest-activity.personal"))).toBeNull();
});

for (const mode of modes) {
  test(`Home deduplicates ${mode.name} confirmation and still plays for a newer API expense`, async ({ context, page }, info) => {
    test.skip(info.project.name !== "desktop", "Home key behavior is independent of viewport");
    const personal = mode.name === "personal";
    const fixture = personal
      ? await setupPersonal(context, info).then(({ session, personal }) => ({ session, space: personal, group: undefined }))
      : await setup(context, info).then(data => ({ session: data.session, space: data[mode.name], group: data.group.id }));
    const { space } = fixture;
    const home = fixture.group ? `/app?group=${fixture.group}` : "/app";
    const key = `mimic.home.latest-activity.${fixture.group ?? "personal"}`;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${home}${personal ? "?" : "&"}quick=1`);
    const chooser = page.getByRole("dialog", { name: "要記在哪個寶箱？" });
    const boxName = { personal: "日常記帳", shared: "旅行分帳", pooled: "旅行共同基金" }[mode.name];
    await clickHydrated(chooser.getByRole("link", { name: new RegExp(boxName) }));
    const dialog = page.getByRole("dialog", { name: mode.trigger, exact: true });
    const before = await page.evaluate(key => localStorage.getItem(key), key);
    await fillExpense(dialog, `Home 去重 ${mode.name}`, mode);
    await dialog.getByRole("button", { name: mode.submit }).click();
    await expect(companion(page)).toBeVisible();
    const seen = await page.evaluate(key => localStorage.getItem(key), key);
    expect(seen).toMatch(/^\d{4}-\d{2}-\d{2}\//);
    console.log(JSON.stringify({ context: mode.name, before, seen }));

    await page.addInitScript(watchHomeInit);
    await page.goto(home);
    await expect(page.locator("[data-home-viewport]:visible [data-home-sheet=ledger]")).toHaveAttribute("data-loaded", "");
    await expect(page.locator("html")).toHaveAttribute("data-home-ledger-seen", "false");
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(seen);

    const ownerResponse = await fetch(`${process.env.MIMIC_API_BASE_URL}/me`, {
      headers: { authorization: `Bearer ${fixture.session.access_token}` },
    });
    const { data: owner } = await ownerResponse.json();
    const path = { personal: "personal-expenses", shared: "shared-expenses", pooled: "pooled-funds/expenses" }[mode.name];
    const payload = {
      title: "從 API 新增的支出", amount_minor: "2500", occurred_on: seen!.split("/")[0],
      ...(mode.name === "shared" && {
        payers: [{ user_id: owner.id, amount_minor: "2500" }],
        allocations: [{ user_id: owner.id, amount_minor: "2500" }],
      }),
      ...(mode.name === "pooled" && { payment_source: "FUND_PAID" }),
    };
    let latest = "";
    for (let attempt = 0; attempt < 5 && latest <= seen!; attempt++) {
      const { record } = await api<{ record: { id: string; occurred_on: string } }>(
        fixture.session, `/spaces/${space.id}/${path}`, { ...payload, request_id: crypto.randomUUID() },
      );
      latest = `${record.occurred_on}/${record.id}`;
    }
    // Use a deterministic cursor when random v4 UUIDs all sort before the seen record.
    if (latest <= seen!) await page.evaluate(key => localStorage.setItem(key, "0"), key);
    await page.goto(home);
    await expect(page.locator("html")).toHaveAttribute("data-home-ledger-seen", "true");
  });
}

function watchHomeInit() {
  new MutationObserver(records => {
    if (records.some(record => (record.target as HTMLElement).hasAttribute("data-home-scene"))) {
      document.documentElement.dataset.homeLedgerSeen = "true";
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-ledger"] });
  if (document.documentElement) document.documentElement.dataset.homeLedgerSeen = "false";
  else document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.homeLedgerSeen ??= "false";
  }, { once: true });
}
