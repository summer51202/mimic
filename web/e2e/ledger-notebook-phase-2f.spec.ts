import path from "node:path";
import { test, expect, type Locator, type Page, type Browser, type BrowserContext } from "@playwright/test";
import {
  acceptInviteByApi, createGroupByApi, createInviteByApi,
  requireBackend, signInWithApiSession, uniqueAccounts,
} from "./fixtures/accounts";

type Session = { access_token: string };
type Space = { id: string; version: number; opened_on: string };

async function api<T>(session: Session, path: string, body?: object): Promise<T> {
  const base = new URL(process.env.MIMIC_API_BASE_URL ?? "http://127.0.0.1:3601/api/v1");
  if (base.hostname !== "127.0.0.1") throw Error("Phase 2F requires a 127.0.0.1 backend");
  const response = await fetch(base.href.replace(/\/$/, "") + path, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  expect(response.ok, `${path}: ${response.status} ${text}`).toBe(true);
  return JSON.parse(text).data;
}

async function expenseSeed(owner: Session, partner: Session, groupId: string) {
  const ownerId = (await api<{ id: string }>(owner, "/me")).id;
  const partnerId = (await api<{ id: string }>(partner, "/me")).id;
  const group = `/groups/${groupId}`;
  const settings = { currency: "TWD", timezone: "Asia/Taipei" };
  const personal = await api<Space>(owner, "/me/spaces", { ...settings, name: "日常記帳", mode: "PERSONAL_EXPENSES" });
  const emptyPersonal = await api<Space>(owner, "/me/spaces", { ...settings, name: "空白個人寶箱", mode: "PERSONAL_EXPENSES" });
  const shared = await api<Space>(owner, `${group}/spaces`, { ...settings, name: "旅行分帳", mode: "SHARED_EXPENSES" });
  const emptyShared = await api<Space>(owner, `${group}/spaces`, { ...settings, name: "空白共同寶箱", mode: "SHARED_EXPENSES" });
  const pooled = await api<Space>(owner, `${group}/spaces`, { ...settings, name: "旅行共同基金", mode: "POOLED_FUND" });
  await api(owner, `/spaces/${shared.id}/participants`, { user_id: partnerId, version: shared.version });

  const entry = (title: string, space: Space, amount_minor: string) => ({
    title, amount_minor, occurred_on: space.opened_on, request_id: crypto.randomUUID(),
  });
  for (const [i, title] of ["早餐咖啡", "捷運車資", "午餐便當", "文具用品", "週末採買"].entries()) {
    await api(owner, `/spaces/${personal.id}/personal-expenses`, entry(title, personal, String(1200 + i * 500)));
  }
  const sharedPath = `/spaces/${shared.id}`;
  const { record } = await api<{ record: { id: string } }>(owner, `${sharedPath}/shared-expenses`, {
    ...entry("共同晚餐", shared, "130000"),
    payers: [{ user_id: ownerId, amount_minor: "130000" }],
    allocations: [{ user_id: ownerId, amount_minor: "65000" }, { user_id: partnerId, amount_minor: "65000" }],
  });
  await api(owner, `/spaces/${personal.id}/personal-references`, {
    request_id: crypto.randomUUID(), source_expense_id: record.id,
  });
  const current = await api<Space>(owner, sharedPath);
  const batch = await api<{ id: string; transfers: { id: string; version: number }[] }>(owner, `${sharedPath}/shared-settlements`, {
    request_id: crypto.randomUUID(), period_end: shared.opened_on, version: current.version,
  });
  const [transfer] = batch.transfers;
  const transferPath = `${sharedPath}/shared-settlements/${batch.id}/transfers/${transfer.id}`;
  await api(partner, `${transferPath}/sent`, { request_id: crypto.randomUUID(), version: transfer.version });
  await api(owner, `${transferPath}/received`, { request_id: crypto.randomUUID(), version: transfer.version + 1 });

  const pool = `/spaces/${pooled.id}/pooled-funds`;
  await api(owner, `${pool}/commitments`, {
    request_id: crypto.randomUUID(), version: pooled.version, name: "每月旅行投入",
    cadence: "MONTHLY", interval: 1, starts_on: pooled.opened_on, generate_through: pooled.opened_on,
    default_amount_minor: "100000", overrides: [],
  });
  await api(owner, `${pool}/expenses`, { ...entry("基金支付住宿", pooled, "260000"), payment_source: "FUND_PAID" });
  await api(owner, `${pool}/expenses`, {
    ...entry("先代墊車票", pooled, "180000"), payment_source: "PARTICIPANT_ADVANCED", advanced_by_user_id: ownerId,
  });
  return {
    personal: `/app/personal?space=${personal.id}&month=${personal.opened_on.slice(0, 7)}`,
    emptyPersonal: `/app/personal?space=${emptyPersonal.id}`,
    shared: `/app/spaces/${shared.id}`,
    emptyShared: `/app/spaces/${emptyShared.id}`,
    pooled: `/app/spaces/${pooled.id}`,
    readError: async () => {
      const space = await api<Space>(owner, "/me/spaces", { ...settings, name: "讀取測試寶箱", mode: "PERSONAL_EXPENSES" });
      for (let i = 0; i < 26; i++) {
        await api(owner, `/spaces/${space.id}/personal-expenses`, entry(`日常支出 ${i + 1}`, space, "1200"));
      }
      return `/app/personal?space=${space.id}&month=${space.opened_on.slice(0, 7)}`;
    },
    archive: async () => {
      const latest = await api<Space>(owner, `/spaces/${emptyPersonal.id}`);
      await api(owner, `/spaces/${emptyPersonal.id}/archive`, { version: latest.version });
    },
  };
}

const sizes = [[360, 780], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]] as const;
const asset = (name: string) => `/pixel-ui/v1/icons/ui/${name}.png`;

async function icon(locator: Locator, name: string, size: number, dpr: number) {
  await expect(locator).toHaveAttribute("src", new RegExp(`${asset(name).replace(".", "\\.")}$`));
  await expect(locator).toHaveAttribute("alt", "");
  await expect(locator).toHaveAttribute("aria-hidden", "true");
  await expect(locator).toHaveCSS("width", `${size}px`);
  await expect(locator).toHaveCSS("height", `${size}px`);
  await expect(locator).toHaveCSS("image-rendering", size === 48 || dpr >= 1.5 ? "pixelated" : "auto");
}

test("notebooks across viewport sizes, assets, offline states and keyboard focus", async ({ browser, baseURL, context }, info) => {
  test.skip(info.project.name !== "desktop", "Explicit viewport and DPR matrix");
  test.setTimeout(300_000);
  await requireBackend();
  const db = process.env.MIMIC_RUNTIME_DATABASE_URL;
  if (!db || new URL(db).hostname !== "127.0.0.1") throw Error("Phase 2F requires a dedicated 127.0.0.1 database");
  const accounts = uniqueAccounts(info);
  const owner = await signInWithApiSession(context, accounts.owner);
  const other = await browser.newContext({ baseURL });
  const partner = await signInWithApiSession(other, accounts.partner);
  const group = await createGroupByApi(owner, "旅行帳目");
  await acceptInviteByApi(partner, (await createInviteByApi(owner, group.id, accounts.partner.email)).inviteCode);
  const urls = await expenseSeed(owner, partner, group.id);
  await other.close();
  const storageState = await context.storageState();
  if (process.env.MIMIC_PHASE_2F_CAPTURE) {
    await captureReview(browser, context, urls);
    return;
  }

  for (const [width, height] of sizes) {
    for (const dpr of [1, 2, 3]) {
      const view = await browser.newContext({ baseURL, storageState, viewport: { width, height }, deviceScaleFactor: dpr, serviceWorkers: "block" });
      try {
        const page = await view.newPage();
        for (const [url, mode, titles, labels] of [
          [urls.personal, "personal", ["日常支出"], [["event-expense", "支出 ·"]]],
          [urls.shared, "shared", ["共同支出"], [["event-expense", "共同支出 ·"]]],
          [urls.pooled, "pooled", ["投入排程與實際投入", "基金支出與代墊"],
            [["event-contribution", "投入 ·"], ["event-expense", "基金支出 ·"], ["event-reimbursement", "代墊 ·"]]],
        ] as const) {
          await page.goto(url);
          const wide = await page.locator("main[data-quick-action]").evaluate(node => {
            const { paddingLeft, paddingRight } = getComputedStyle(node);
            return node.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight) >= 768;
          });
          const size = wide ? 48 : 32;
          await icon(page.locator(`img[src$="${asset(`mode-${mode}`)}"]`), `mode-${mode}`, size, dpr);
          for (const title of titles) {
            const notebook = page.getByRole("region", { name: title, exact: true });
            await expect(notebook).toHaveCSS("border-image-source", /frame-notebook\.png/);
            await expect(notebook).toHaveCSS("padding-top", wide ? "54px" : "46px");
            if (width === 360 && dpr === 1 && mode === "personal") {
              const contentWidth = await notebook.evaluate(node => {
                const css = getComputedStyle(node);
                return node.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
              });
              expect(contentWidth).toBe(204);
              console.log("Personal 360px notebook content width", contentWidth);
            }
            await expect(notebook).toHaveCSS("background-color", "rgb(234, 215, 172)");
            await expect(notebook).toHaveCSS("color", "rgb(33, 26, 24)");
            await expect(notebook.locator("time").first()).toHaveCSS("color", "rgb(90, 70, 54)");
            await expect(notebook.locator(".notebook-amount").first()).toHaveCSS("font-variant-numeric", "tabular-nums");
            await expect(notebook.locator(".notebook-amount").first()).toHaveCSS("text-align", wide ? "right" : "left");
          }
          for (const [event, label] of labels) {
            const row = page.locator(".notebook-row").filter({ has: page.locator("time", { hasText: label }) }).first();
            await icon(row.locator("img").first(), event, size, dpr);
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
          await expect(page.locator("header").first()).toHaveCSS("height", "64px");
          if (mode === "personal") {
            await icon(page.getByText("來源已鎖定").locator("img"), "status-lock", 32, dpr);
          } else {
            await expect(page.getByRole("link", { name: "共同群組", exact: true }).filter({ visible: true })).toHaveAttribute("aria-current", "page");
          }
          if (mode === "pooled") {
            await icon(page.getByRole("alert").filter({ hasText: "資金缺口" }).locator("img"), "event-shortfall", 32, dpr);
          }
          if (dpr !== 1) continue;
          for (const title of titles) {
            const notebook = page.getByRole("region", { name: title, exact: true });
            const buttons = await notebook.locator("button:enabled").all();
            if (!buttons.length) continue;
            await buttons[0].focus();
            await page.keyboard.press("Shift+Tab");
            for (const button of buttons) {
              await page.keyboard.press("Tab");
              await expect(button).toBeFocused();
              await expect(button).toHaveCSS("outline-width", "3px");
              await expect(button).toHaveCSS("box-shadow", /rgb\(33, 26, 24\).*5px/);
              const [outer, inner] = await Promise.all([notebook.boundingBox(), button.boundingBox()]);
              expect(inner!.height).toBeGreaterThanOrEqual(44);
              expect(inner!.x - 5).toBeGreaterThan(outer!.x);
              expect(inner!.x + inner!.width + 5).toBeLessThan(outer!.x + outer!.width);
              expect(inner!.y - 5).toBeGreaterThan(outer!.y);
              expect(inner!.y + inner!.height + 5).toBeLessThan(outer!.y + outer!.height);
            }
          }
          await view.setOffline(true);
          await icon(page.getByRole("status").filter({ hasText: "目前離線" }).locator("img"), "status-offline", 32, dpr);
          await view.setOffline(false);
        }
        if (dpr === 1 && width <= 390) {
          await page.goto(urls.personal, { waitUntil: "networkidle" });
          const last = page.getByRole("button", { name: "管理類別與標籤" });
          const floating = page.getByRole("link", { name: "記一筆支出" });
          await expect.poll(async () => {
            await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
            const [lastBox, floatBox] = await Promise.all([last.boundingBox(), floating.boundingBox()]);
            return lastBox!.y + lastBox!.height - floatBox!.y;
          }).toBeLessThanOrEqual(0);
        }
        if (dpr === 1 && width === 360) {
          await page.route("**/pixel-ui/v1/frames/frame-notebook.png", route => route.abort());
          await page.route("**/pixel-ui/v1/icons/ui/event-expense.png", route => route.abort());
          await page.goto(urls.personal);
          const notebook = page.getByRole("region", { name: "日常支出" });
          await expect(notebook).toHaveCSS("box-shadow", /inset/);
          await expect(notebook.locator("img").first()).toHaveCSS("visibility", "hidden");
          await expect(notebook.getByText("早餐咖啡")).toBeVisible();
        }
      } finally {
        await view.close();
      }
    }
  }

});

async function captureReview(browser: Browser, context: BrowserContext, urls: Awaited<ReturnType<typeof expenseSeed>>) {
  const baseline = process.env.BASELINE_WEB_URL;
  const candidate = process.env.PLAYWRIGHT_BASE_URL;
  if (!baseline || !candidate) throw Error("Expected both baseline and candidate Web URLs");
  const output = path.resolve("../docs/design/assets/reviews/2026-11-12-phase-2f/screenshots");
  const storageState = await context.storageState();

  const views: { page: Page; side: string }[] = [];
  for (const [side, origin] of [["before", baseline], ["after", candidate]]) {
    views.push({ side, page: await browser.newPage({ baseURL: origin, storageState, serviceWorkers: "block" }) });
  }

  const capture = async (page: Page, state: string, side: string, fullPage = true) => {
    await page.evaluate(() => document.fonts.ready);
    const size = page.viewportSize()!;
    await page.screenshot({ fullPage, animations: "disabled", scale: "css",
      path: path.join(output, `${state}-${size.width}x${size.height}-${side}.png`) });
  };
  const open = async (page: Page, url: string) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  };
  try {
    if (process.env.MIMIC_PHASE_2F_CAPTURE !== "archive") {
      const readError = await urls.readError();
      for (const { page, side } of views) {
        for (const [width, height] of [[390, 844], [1440, 900]]) {
          await page.setViewportSize({ width, height });
          for (const [url, state] of [
            [urls.emptyPersonal, "personal-empty"], [urls.personal, "personal-data"],
            [urls.emptyShared, "shared-empty"], [urls.shared, "shared-data"], [urls.pooled, "pooled-shortfall"],
          ]) {
            await open(page, url);
            await capture(page, state, side);
            if (url === urls.emptyPersonal || url === urls.emptyShared) continue;
            await page.context().setOffline(true);
            if (side === "after" || url === urls.pooled) await expect(page.getByRole("status").filter({ hasText: "目前離線" })).toBeVisible();
            await capture(page, `${state.split("-")[0]}-offline`, side);
            await page.context().setOffline(false);
          }
          await open(page, readError);
          const failMore = "**/api/app/spaces/*/personal-expenses?*cursor=*";
          await page.route(failMore, route => route.abort());
          await page.getByRole("button", { name: "載入更多" }).click();
          await expect(page.getByRole("alert").filter({ hasText: "無法載入更多" })).toBeVisible();
          await capture(page, "personal-read-error", side);
          await page.unroute(failMore);
          await open(page, urls.personal);
          await page.keyboard.press("Tab");
          await expect(page.getByRole("link", { name: "回到 mimic 入口頁" })).toBeFocused();
          await capture(page, "wordmark-focus", side, false);
          if (width === 1440) {
            await open(page, urls.shared);
            await capture(page, "shared-sidebar", side, false);
          }
        }
        await page.setViewportSize({ width: 360, height: 780 });
        await open(page, urls.personal);
        await capture(page, "personal-data", side);
        for (const [width, height] of [[360, 780], [390, 844]]) {
          await page.setViewportSize({ width, height });
          await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
          await capture(page, "personal-quick-action", side, false);
        }
      }
    }
    await urls.archive();
    for (const { page, side } of views) {
      for (const [width, height] of [[390, 844], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await open(page, urls.emptyPersonal);
        await expect(page.getByRole("button", { name: "記一筆支出", exact: true })).toBeDisabled();
        await capture(page, "personal-archived", side);
      }
    }
  } finally {
    await Promise.all(views.map(({ page }) => page.close()));
  }
}
