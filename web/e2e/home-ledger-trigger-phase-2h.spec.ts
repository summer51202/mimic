import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { acceptInviteByApi, createGroupByApi, createInviteByApi, requireBackend,
  signInWithApiSession, uniqueAccounts } from "./fixtures/accounts";

test.use({ serviceWorkers: "block" });

const oldBackend = process.env.MIMIC_PHASE_2H_OLD_BACKEND === "1";
const personalKey = "mimic.home.latest-recorded.personal";
const legacyKey = "mimic.home.latest-activity.personal";
type Session = { access_token: string };
type Space = { id: string; opened_on: string };
type Record = { id: string; created_at: string };

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Ledger behavior is independent of viewport");
  const api = process.env.MIMIC_API_BASE_URL;
  const db = process.env.MIMIC_RUNTIME_DATABASE_URL;
  if (!api || !db || [api, db].some(url => new URL(url).hostname !== "127.0.0.1")) {
    throw new Error("Phase 2H requires a dedicated 127.0.0.1 API and database");
  }
  await requireBackend();
  await page.addInitScript(() => {
    new MutationObserver(records => {
      if (records.some(record => (record.target as HTMLElement).hasAttribute("data-home-scene"))) {
        document.documentElement.dataset.homeLedgerSeen = "true";
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-ledger"] });
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.dataset.homeLedgerSeen ??= "false";
    }, { once: true });
  });
});

async function api<T>(session: Session, path: string, body?: object, method = body ? "POST" : "GET"): Promise<T> {
  const response = await fetch(`${process.env.MIMIC_API_BASE_URL}${path}`, {
    method, headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const text = await response.text();
  expect(response.ok, `${method} ${path}: ${response.status} ${text}`).toBe(true);
  return JSON.parse(text).data;
}

async function personalFixture(context: BrowserContext, info: TestInfo) {
  const session = await signInWithApiSession(context, uniqueAccounts(info).owner);
  const space = await api<Space>(session, "/me/spaces", { name: "日常帳本", mode: "PERSONAL_EXPENSES" });
  const root = `/spaces/${space.id}/personal-expenses`;
  const input = (title: string, occurred_on = space.opened_on) => ({
    title, occurred_on, amount_minor: "100", request_id: crypto.randomUUID(),
  });
  const add = async (title: string, date?: string) => (await api<{ record: Record }>(session, root, input(title, date))).record;
  return { session, space, root, input, add };
}

const room = (page: Page) => page.locator("[data-home-scene]:visible");
const readKey = (page: Page, key = personalKey) => page.evaluate(value => localStorage.getItem(value), key);
const keyFor = (record: Record) => `${record.created_at}|${record.id}`;

async function expectLedger(page: Page, seen: boolean, url = "/app") {
  await page.goto(url);
  await expect(room(page).locator("[data-home-sheet=ledger]")).toHaveAttribute("data-loaded", "");
  await expect(page.locator("[data-home-stage] [data-scene-pause]")).toHaveAttribute("data-ready", "");
  await expect(page.locator("html")).toHaveAttribute("data-home-ledger-seen", String(seen));
}

test.describe("with the Phase 2H API", () => {
  test.skip(oldBackend, "Run against the Phase 2H API");

  test("plays for an old-date backfill and six same-day additions, then stays idle on edit and delete", async ({ context, page }, info) => {
    const f = await personalFixture(context, info);
    for (let i = 0; i < 3; i++) await f.add(`日期較新的支出 ${i}`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expectLedger(page, false);
    const card = page.getByRole("link", { name: /日常帳本.*最近：/ });
    const recentBefore = await card.locator("small").last().textContent();
    const backdate = new Date(`${f.space.opened_on}T00:00:00Z`);
    backdate.setUTCDate(backdate.getUTCDate() - 30);
    const occurredOn = backdate.toISOString().slice(0, 10);
    const backfill = await f.add("三十天前補記", occurredOn);
    await expectLedger(page, true);
    expect(await readKey(page)).toBe(keyFor(backfill));
    await expect(card.locator("small").last()).toHaveText(recentBefore!);
    await expect(room(page).locator("[data-home-sheet=ledger]")).toHaveCSS("--frame", "4");
    await expect(room(page)).not.toHaveAttribute("data-ledger", { timeout: 2500 });

    let latest = backfill;
    for (let i = 0; i < 6; i++) {
      latest = await f.add(`同日新增 ${i}`);
      await expectLedger(page, true);
      expect(await readKey(page)).toBe(keyFor(latest));
    }
    await api(f.session, `${f.root}/${latest.id}`, { ...f.input("修改支出"), version: 1 }, "PATCH");
    await expectLedger(page, false);
    await api(f.session, `${f.root}/${latest.id}/delete`, { request_id: crypto.randomUUID(), version: 2 });
    await expectLedger(page, false);
  });

  test("plays after a partner records in the group and after adding that expense to my ledger", async ({ browser, baseURL, context, page }, info) => {
    const f = await personalFixture(context, info);
    await f.add("個人既有支出");
    await expectLedger(page, false);
    const partnerContext = await browser.newContext({ baseURL });
    try {
      const partner = uniqueAccounts(info).partner;
      const partnerSession = await signInWithApiSession(partnerContext, partner);
      const group = await createGroupByApi(f.session, "分帳測試群組");
      const invite = await createInviteByApi(f.session, group.id, partner.email);
      await acceptInviteByApi(partnerSession, invite.inviteCode);
      const shared = await api<Space>(f.session, `/groups/${group.id}/spaces`, { name: "分帳測試", mode: "SHARED_EXPENSES" });
      const owner = await api<{ id: string }>(f.session, "/me");
      const other = await api<{ id: string }>(partnerSession, "/me");
      await api(f.session, `/spaces/${shared.id}/participants`, { user_id: other.id, version: 1 });
      const add = (session: Session, title: string, payer: string) => api<{ record: Record }>(session, `/spaces/${shared.id}/shared-expenses`, {
        title, occurred_on: shared.opened_on, amount_minor: "100", request_id: crypto.randomUUID(),
        payers: [{ user_id: payer, amount_minor: "100" }], allocations: [{ user_id: owner.id, amount_minor: "100" }],
      });
      await add(f.session, "群組既有支出", owner.id);
      const groupHome = `/app?group=${group.id}`;
      await expectLedger(page, false, groupHome);
      const { record } = await add(partnerSession, "夥伴新增支出", other.id);
      await expectLedger(page, true, groupHome);
      expect(await readKey(page, `mimic.home.latest-recorded.${group.id}`)).toBe(keyFor(record));

      await page.goto(`/app/spaces/${shared.id}`);
      await page.getByRole("button", { name: "加入我的帳本－夥伴新增支出" }).click();
      const dialog = page.getByRole("dialog", { name: "加入我的帳本" });
      const submitted = page.waitForResponse(response => response.request().method() === "POST" &&
        response.url().endsWith(`/api/app/spaces/${f.space.id}/personal-references`));
      await dialog.getByRole("button", { name: "加入我的帳本", exact: true }).click();
      const response = await submitted;
      expect(response.ok()).toBe(true);
      const { data: { reference } } = await response.json();
      await expectLedger(page, true);
      expect(await readKey(page)).toBe(keyFor(reference));
    } finally {
      await partnerContext.close();
    }
  });

  test("migrates only the active legacy key and consumes a newer record while paused", async ({ context, page }, info) => {
    const f = await personalFixture(context, info);
    const first = await f.add("升級前的支出");
    await page.goto("/");
    await page.evaluate(key => localStorage.setItem(key, "2026-11-12/old-id"), legacyKey);
    await expectLedger(page, false);
    expect(await readKey(page)).toBe(keyFor(first));
    expect(await readKey(page, legacyKey)).toBeNull();

    await page.locator("[data-home-stage] [data-scene-pause]").click();
    const paused = await f.add("暫停期間的支出");
    await expectLedger(page, false);
    expect(await readKey(page)).toBe(keyFor(paused));
    await page.locator("[data-home-stage] [data-scene-pause]").click();
    await expectLedger(page, false);
  });
});

test("shows the existing Home error state without writing a cursor when latest_recorded is missing", async ({ context, page }, info) => {
  test.skip(!info.project.metadata.phase2iMissingHome, "Run via playwright.phase-2i-missing-home.config.ts");
  const f = await personalFixture(context, info);
  await f.add("缺少最新記帳欄位測試");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/app");
  const errorState = page.getByRole("alert").filter({ has: page.getByRole("heading", { name: "發生錯誤" }) });
  await expect(errorState).toBeVisible();
  await expect(errorState.getByRole("button", { name: "重試" })).toBeVisible();
  await expect(page.locator("[data-home-scene]")).toHaveCount(0);
  expect(await page.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith("mimic.home.latest-recorded.")),
  )).toEqual([]);
  expect(pageErrors).toEqual([]);
});
