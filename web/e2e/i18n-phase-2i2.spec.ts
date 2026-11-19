import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import {
  acceptInviteByApi, createGroupByApi, createInviteByApi, registerByApi,
  requireBackend, signInWithApiSession, uniqueAccounts, type TestAccount,
} from "./fixtures/accounts";

test.use({ serviceWorkers: "block", timezoneId: "Asia/Taipei" });
test.describe.configure({ timeout: 240_000 });

const viewports = [
  { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1440, height: 900 },
];
type Session = { access_token: string };
type Space = { id: string; opened_on: string; version: number };

function assertLoopback() {
  for (const value of [process.env.MIMIC_API_BASE_URL, process.env.MIMIC_RUNTIME_DATABASE_URL]) {
    if (!value || new URL(value).hostname !== "127.0.0.1") {
      throw new Error("Phase 2I-2 requires a 127.0.0.1 API and dedicated database");
    }
  }
}

async function api<T = unknown>(session: Session, path: string, body?: object, method = body ? "POST" : "GET"): Promise<T> {
  const base = process.env.MIMIC_API_BASE_URL!.replace(/\/$/, "");
  const response = await fetch(base + path, {
    method, headers: { authorization: `Bearer ${session.access_token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  expect(response.ok, `${method} ${path}: ${response.status} ${raw}`).toBe(true);
  return JSON.parse(raw).data;
}

type FundOccurrence = { id: string; version: number; participant_user_id: string; timing: "DUE" | "OVERDUE" };

async function scheduleContribution(session: Session, fund: Space, name: string, amount: string, dueOn = fund.opened_on) {
  const path = `/spaces/${fund.id}`;
  const { version } = await api<Space>(session, path);
  return api<{ occurrences: FundOccurrence[] }>(session, `${path}/pooled-funds/commitments`, {
    request_id: crypto.randomUUID(), version, name, cadence: "MONTHLY", interval: 1, starts_on: dueOn,
    ends_on: dueOn, generate_through: dueOn, default_amount_minor: amount, overrides: [],
  });
}

type SettlementTransfer = { id: string; from_user_id: string; version: number; status: string };
type Settlement = { id: string; transfers: SettlementTransfer[] };

async function mixedSettlement(owner: Awaited<ReturnType<typeof signInWithApiSession>>, ownerId: string, account: TestAccount) {
  const party = await api<{ id: string }>(owner, "/groups", {
    name: "Weekend party", default_currency: "TWD", group_type: "group",
  });
  const space = await api<Space>(owner, `/groups/${party.id}/spaces`, {
    name: "Weekend expenses", mode: "SHARED_EXPENSES", currency: "TWD", timezone: "Asia/Taipei",
  });
  const root = `/spaces/${space.id}`;
  const participants: { id: string; session: Session; amount: string }[] = [];
  let expenseDate = space.opened_on;
  for (const [index, [displayName, amount]] of [["Robin Lin", "4100"], ["Morgan Lee", "3200"], ["Taylor Chen", "2700"]].entries()) {
    const email = account.email.replace("@", `+settlement-${index}@`);
    const session = await registerByApi({ ...account, email, displayName });
    const invite = await createInviteByApi(owner, party.id, email);
    await acceptInviteByApi(session, invite.inviteCode);
    const { id } = await api<{ id: string }>(session, "/me");
    const { version } = await api<Space>(owner, root);
    const participant = await api<{ effective_from: string }>(owner, `${root}/participants`, { user_id: id, version });
    if (participant.effective_from > expenseDate) expenseDate = participant.effective_from;
    participants.push({ id, session, amount });
  }
  await api(owner, `${root}/shared-expenses`, {
    request_id: crypto.randomUUID(), title: "Cabin supplies", amount_minor: "10000", occurred_on: expenseDate,
    payers: [{ user_id: ownerId, amount_minor: "10000" }],
    allocations: participants.map(({ id, amount }) => ({ user_id: id, amount_minor: amount })),
  });
  const { version } = await api<Space>(owner, root);
  const settlementPath = `${root}/shared-settlements`;
  let batch = await api<Settlement>(owner, settlementPath, {
    request_id: crypto.randomUUID(), version, period_end: expenseDate,
  });
  expect(batch.transfers).toHaveLength(3);
  const updateTransfer = async (participantId: string, actor: Session, action: "sent" | "received") => {
    const transfer = batch.transfers.find(item => item.from_user_id === participantId)!;
    batch = await api<Settlement>(actor, `${settlementPath}/${batch.id}/transfers/${transfer.id}/${action}`, {
      request_id: crypto.randomUUID(), version: transfer.version,
    });
  };
  const [, paid, received] = participants;
  await updateTransfer(paid.id, paid.session, "sent");
  await updateTransfer(received.id, received.session, "sent");
  await updateTransfer(received.id, owner, "received");
  expect(participants.map(({ id }) => batch.transfers.find(transfer => transfer.from_user_id === id)?.status))
    .toEqual(["AWAITING_PAYMENT", "SENT", "COMPLETED"]);
  return space.id;
}

async function english(context: BrowserContext, origin: string) {
  await context.addCookies([{ name: "mimic-locale", value: "en", url: origin }]);
}

async function homeContextScroll(contexts: Locator, firstLabel: string) {
  const firstEntry = contexts.getByRole("link").first();
  await expect(firstEntry).toBeVisible();
  await expect(firstEntry).toHaveText(firstLabel);
  return contexts.evaluate(nav => {
    const first = nav.querySelector("a")!;
    const bounds = nav.getBoundingClientRect();
    const firstBounds = first.getBoundingClientRect();
    const roomToScroll = nav.scrollWidth - nav.clientWidth;
    nav.scrollLeft = roomToScroll;
    const canScroll = nav.scrollLeft > 0;
    nav.scrollLeft = 0;
    return {
      overflow: getComputedStyle(nav).overflowX,
      firstFits: firstBounds.left >= bounds.left && firstBounds.right <= bounds.right,
      overflows: roomToScroll > 0,
      canScroll,
    };
  });
}

async function compareHomeContextScroll(page: Page, browser: Browser, origin: string, session: Session, group: string) {
  const contexts = page.locator(".space-home-contexts");
  await expect(contexts.getByRole("link", { name: group, exact: true })).toBeVisible();
  const english = await homeContextScroll(contexts, "My Chests");
  const traditionalChinese = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()!, serviceWorkers: "block" });
  try {
    await traditionalChinese.addCookies([
      { name: "mimic_access", value: session.access_token, url: origin, httpOnly: true },
      { name: "mimic-locale", value: "zh-TW", url: origin },
    ]);
    const chinesePage = await traditionalChinese.newPage();
    await chinesePage.goto("/app");
    await expect(chinesePage.locator("html")).toHaveAttribute("lang", "zh-Hant");
    const chinese = await homeContextScroll(chinesePage.locator(".space-home-contexts"), "我的寶箱");
    expect(english.overflow).toBe(chinese.overflow);
    expect(["auto", "scroll"]).toContain(english.overflow);
    expect(english.firstFits).toBe(true);
    expect(english.canScroll).toBe(english.overflows);
    expect(chinese.canScroll).toBe(chinese.overflows);
    if (page.viewportSize()!.width <= 390) expect(english.canScroll && chinese.canScroll).toBe(true);
  } finally { await traditionalChinese.close(); }
}

async function returnToPageTop(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
}

async function capture(page: Page, expected: Locator, name: string) {
  await expect(expected).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const measurements = await page.evaluate(async () => {
    await document.fonts.ready;
    const documentWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const nav = [...document.querySelectorAll<HTMLElement>('[aria-label="Primary app sections"] [class*="label"]')]
      .filter(node => node.getClientRects().length && node.textContent?.trim() && !node.closest('[aria-hidden="true"]'))
      .map(node => ({ text: node.textContent, width: node.clientWidth, scrollWidth: node.scrollWidth }));
    const activeDialog = document.querySelector("dialog[open]");
    const surface = activeDialog ?? document;
    const dateElements = [...surface.querySelectorAll<HTMLElement>("[data-iso-nowrap]")]
      .filter(node => node.getClientRects().length > 0)
      .map(node => {
        const { left, right, width } = node.getBoundingClientRect();
        const link = node.closest("a");
        return {
          text: node.textContent, rects: node.getClientRects().length, width, left, right,
          linkTextDecorationLine: link ? getComputedStyle(link).textDecorationLine : null,
          textDecorationLine: getComputedStyle(node).textDecorationLine,
        };
      });
    const textLines = (node: HTMLElement) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const lines = new Set<number>();
      while (walker.nextNode()) {
        const current = walker.currentNode;
        if (!current.textContent?.trim() || current.parentElement?.closest('[aria-hidden="true"]')) continue;
        const range = document.createRange();
        range.selectNodeContents(current);
        for (const rect of range.getClientRects()) if (rect.width > 0) lines.add(Math.round(rect.top));
      }
      return lines.size;
    };
    const buttons = [...surface.querySelectorAll<HTMLElement>("button, a.quick-expense, [class*='floatingAction']")]
      .filter(node => node.offsetWidth && node.getBoundingClientRect().height && node.textContent?.trim())
      .map(node => ({ text: node.textContent?.trim(), width: node.clientWidth, scrollWidth: node.scrollWidth,
        renderedWidth: node.getBoundingClientRect().width, lines: textLines(node) }));
    const amounts = [...surface.querySelectorAll<HTMLElement>(
      ".space-card > strong, .personal-total > strong, .notebook-amount > strong, [data-testid='shared-spending'], .pooled-balance-card > strong",
    )].filter(node => node.offsetWidth && /\p{Sc}/u.test(node.textContent ?? "")).map(node => {
      const container = node.parentElement!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      const outside = [...range.getClientRects()].some(rect => rect.left < container.left - 1 || rect.right > container.right + 1);
      return { text: node.textContent?.trim(), width: node.clientWidth, scrollWidth: node.scrollWidth, lines: textLines(node), outside };
    });
    // A sentence may wrap before its amount, but the complete currency token must stay on one line.
    const splitMoneyTokens: { token: string; sentence: string }[] = [];
    const checked = new Set<Node>();
    for (const sentence of surface.querySelectorAll("p, li, small, em")) {
      const walker = document.createTreeWalker(sentence, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (checked.has(node) || node.parentElement?.closest('[aria-hidden="true"]')) continue;
        checked.add(node);
        for (const match of (node.textContent ?? "").matchAll(/(?:[A-Z]{1,3})?\p{Sc}[ \u00a0\u202f]?-?\d(?:[\d.,\u00a0\u202f]*\d)?/gu)) {
          const range = document.createRange();
          range.setStart(node, match.index!);
          range.setEnd(node, match.index! + match[0].length);
          const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top)));
          if (lines.size > 1) splitMoneyTokens.push({ token: match[0], sentence: node.textContent!.trim() });
        }
      }
    }
    return {
      documentWidth, scrollWidth,
      nav: nav.filter(node => node.scrollWidth > node.width),
      buttons: buttons.filter(node => node.width < node.scrollWidth || (documentWidth === 360 && node.lines >= 3)),
      amounts: amounts.filter(node => node.width < node.scrollWidth || node.lines > 1 || node.outside),
      splitMoneyTokens,
      dateElements,
    };
  });
  const { width, height } = page.viewportSize()!;
  const file = `${name}-en-${width}x${height}.png`;
  const buffer = await page.screenshot({ fullPage: true, animations: "disabled", scale: "css" });
  await test.info().attach(file, { body: buffer, contentType: "image/png" });
  if (process.env.MIMIC_I18N_SCREENSHOTS) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(process.env.MIMIC_I18N_SCREENSHOTS, { recursive: true });
    await writeFile(`${process.env.MIMIC_I18N_SCREENSHOTS}/${file}`, buffer);
  }
  const report = JSON.stringify(measurements);
  expect(measurements.scrollWidth, report).toBeLessThanOrEqual(measurements.documentWidth);
  expect(measurements.nav, report).toEqual([]);
  expect(measurements.buttons, report).toEqual([]);
  expect(measurements.amounts, report).toEqual([]);
  expect(measurements.splitMoneyTokens, report).toEqual([]);
  // Card links intentionally have no underline. Dates inherit the decoration of their link.
  const underlinedLinkDates = measurements.dateElements.filter(date => date.linkTextDecorationLine?.includes("underline"));
  if (["home-ready", "home-offline", "home-quests-1", "home-quests-2"].includes(name)) {
    expect(underlinedLinkDates.length, report).toBeGreaterThan(0);
  }
  expect(underlinedLinkDates.filter(date => !date.textDecorationLine.includes("underline")), report).toEqual([]);
  if (width <= 390) {
    // These populated views each contain at least one system-rendered ISO value.
    if (["home-ready", "personal-ready", "shared-ready", "shared-settlement-mixed", "fund-ready", "tasks-ready"].includes(name)) {
      expect(measurements.dateElements.length, report).toBeGreaterThan(0);
    }
    expect(measurements.dateElements.filter(date => date.rects !== 1), report).toEqual([]);
    expect(measurements.dateElements.filter(date => date.left < 0 || date.right > measurements.documentWidth), report).toEqual([]);
  }
}

async function dialog(page: Page, trigger: Locator, title: string, name: string) {
  await expect.poll(() => trigger.evaluate(node =>
    Object.keys(node).some(key => key.startsWith("__reactProps")),
  )).toBe(true);
  await trigger.click();
  const modal = page.getByRole("dialog", { name: title, exact: true });
  await capture(page, modal, name);
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
}

for (const viewport of viewports) {
  test(`English app routes and controls at ${viewport.width}×${viewport.height}`, async ({ page, context, baseURL, browser }, info) => {
    test.skip(info.project.name !== "desktop", "Runs the explicit Phase 2I-2 viewport matrix");
    test.skip(process.env.MIMIC_RUNTIME_ACCEPTANCE !== "1", "Requires a real backend");
    assertLoopback();
    await requireBackend();
    await page.setViewportSize(viewport);
    await english(context, baseURL!);
    const accounts = uniqueAccounts(info);
    const owner = await signInWithApiSession(context, accounts.owner);
    const profile = await api<{ id: string }>(owner, "/me");
    await api(owner, "/me", { locale: "en" }, "PATCH");
    await page.goto("/app");
    await capture(page, page.getByText("It's empty in here. Let's make your first chest!", { exact: true }), "home-empty");
    const settings = { currency: "TWD", timezone: "Asia/Taipei" };
    const personal = await api<Space>(owner, "/me/spaces", { ...settings, name: "Daily chest", mode: "PERSONAL_EXPENSES" });
    const group = await createGroupByApi(owner, "Travel");
    await createGroupByApi(owner, "Summer Reunion");
    await createGroupByApi(owner, "Weekend Board Games");
    const shared = await api<Space>(owner, `/groups/${group.id}/spaces`, { ...settings, name: "Trip expenses", mode: "SHARED_EXPENSES" });
    const fund = await api<Space>(owner, `/groups/${group.id}/spaces`, { ...settings, name: "Trip fund", mode: "POOLED_FUND" });
    const food = (await api<Array<{ id: string; name: string }>>(owner, "/me/taxonomy?kind=CATEGORY&locale=en")).find(term => term.name === "Food");
    expect(food).toBeDefined();
    await api(owner, `/spaces/${personal.id}/personal-expenses`, {
      title: "Lunch", amount_minor: "4200", request_id: crypto.randomUUID(), occurred_on: personal.opened_on,
      category_id: food!.id,
    });
    await api(owner, `/spaces/${shared.id}/shared-expenses`, {
      title: "Train", amount_minor: "3200", request_id: crypto.randomUUID(), occurred_on: shared.opened_on,
      payers: [{ user_id: profile.id, amount_minor: "3200" }], allocations: [{ user_id: profile.id, amount_minor: "3200" }],
    });
    await page.goto("/app");
    await compareHomeContextScroll(page, browser, baseURL!, owner, group.name);
    await expect(page.locator("[data-home-dialogue]")).toContainText("Mimiku");
    await capture(page, page.getByText("Anything to record today?", { exact: true }), "home-ready");
    await context.setOffline(true);
    try {
      await capture(page, page.getByText("We're offline. I'll keep watch over the last update for you.", { exact: true }), "home-offline");
    } finally { await context.setOffline(false); }

    const groupHome = `/app?group=${group.id}`;
    await page.goto(groupHome);
    await dialog(page, page.locator("[data-home-dialogue]").getByRole("button", { name: "Record expense" }), "Which chest is this for?", "home-quick-expense");
    const overdueDate = new Date(`${fund.opened_on}T00:00:00Z`);
    overdueDate.setUTCDate(overdueDate.getUTCDate() - 7);
    for (const [index, amount] of ["5000", "6000"].entries()) {
      const { occurrences } = await scheduleContribution(owner, fund, `Trip deposit ${index + 1}`, amount,
        index === 0 ? overdueDate.toISOString().slice(0, 10) : fund.opened_on);
      expect(occurrences.map(item => item.timing)).toEqual([index === 0 ? "OVERDUE" : "DUE"]);
      await page.goto(groupHome);
      await capture(page, page.getByText(index === 0 ? "1 quest needs your OK." : "2 quests need your OK.", { exact: true }),
        `home-quests-${index + 1}`);
    }

    await page.goto(`/app/personal?space=${personal.id}`);
    await capture(page, page.getByRole("heading", { name: "Daily expenses", exact: true }), "personal-ready");
    await dialog(page, page.getByRole("button", { name: "Record expense", exact: true }), "Record expense", "personal-add");
    await dialog(page, page.getByRole("button", { name: "Edit Lunch", exact: true }), "Edit expense", "personal-edit");
    await dialog(page, page.getByRole("button", { name: "Delete Lunch", exact: true }), "Delete this expense?", "personal-delete");
    await dialog(page, page.getByRole("button", { name: "Manage categories and tags", exact: true }), "Manage categories and tags", "personal-taxonomy");
    const draftChest = await api<Space>(owner, "/me/spaces", { ...settings, name: "Draft chest", mode: "PERSONAL_EXPENSES" });
    const draftRoute = `/app/personal?space=${draftChest.id}`;
    await page.goto(`${draftRoute}&quick=1`);
    const expenseName = page.getByLabel("Expense name", { exact: true });
    await expect.poll(() => expenseName.evaluate(node =>
      Object.keys(node).some(key => key.startsWith("__reactProps")),
    )).toBe(true);
    await expenseName.fill("Unsent cafe expense");
    await expect.poll(() => page.evaluate((spaceId) =>
      Object.entries(localStorage).some(([key, value]) =>
        key.startsWith("mimic:expense-draft:v1:") && key.includes(spaceId) && !key.includes(":index:")
        && value.includes("Unsent cafe expense"),
      ), draftChest.id)).toBe(true);
    await page.reload();
    await capture(page, page.getByRole("button", { name: "Review draft", exact: true }), "draft-recovery");
    const savedDraft = await page.evaluate((spaceId) => {
      const key = Object.keys(localStorage).find(key => key.startsWith("mimic:expense-draft:v1:")
        && key.includes(spaceId) && !key.includes(":index:"));
      const value = key && localStorage.getItem(key);
      if (!key || !value) throw new Error("Expected a saved expense draft");
      localStorage.setItem(key, "{malformed draft");
      return { key, value };
    }, draftChest.id);
    await page.reload();
    await capture(page, page.getByRole("alert").filter({ hasText: "This draft is damaged" }), "draft-corrupt");

    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), savedDraft);
    const archived = await api<{ status: string }>(owner, `/spaces/${draftChest.id}/archive`, { version: draftChest.version });
    expect(archived.status).toBe("ARCHIVED");
    await page.goto(draftRoute);
    await expect(page.getByRole("status").filter({ hasText: "1 unsent draft is still on this device" })).toBeVisible();
    await capture(page, page.getByRole("button", { name: "Discard drafts for this chest", exact: true }), "draft-blocked");

    await page.goto(`/app/spaces/${shared.id}`);
    await capture(page, page.getByRole("heading", { name: "Trip expenses", exact: true }), "shared-ready");
    await capture(page, page.getByText("SETTLEMENT TRAIL", { exact: true }), "shared-settlement");
    await dialog(page, page.getByRole("button", { name: "Start settlement round", exact: true }), "Start settlement round", "shared-start-settlement");
    await capture(page, page.getByRole("heading", { name: "Participants and archiving" }), "shared-lifecycle");
    await dialog(page, page.getByRole("button", { name: "Add shared expense", exact: true }), "Add shared expense", "shared-add");
    await dialog(page, page.getByRole("button", { name: "Edit Train", exact: true }), "Edit shared expense", "shared-edit");
    await dialog(page, page.getByRole("button", { name: "Delete Train", exact: true }), "Delete this shared expense?", "shared-delete");
    await dialog(page, page.getByRole("button", { name: "Add Train to my ledger", exact: true }), "Add to my ledger", "shared-reference");
    await page.getByRole("button", { name: "Start settlement round", exact: true }).click();
    await page.getByRole("button", { name: "Create round and lock period", exact: true }).click();
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit Train", exact: true }).click();
    await page.getByRole("dialog", { name: "Edit shared expense" }).getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "This period is permanently locked." })).toBeVisible();
    await dialog(page, page.getByRole("button", { name: "Create a permanent correction", exact: true }), "Create a permanent correction", "shared-correction");

    const mixedSpace = await mixedSettlement(owner, profile.id, accounts.partner);
    await page.goto(`/app/spaces/${mixedSpace}`);
    const trail = page.locator(".settlement-trail");
    for (const status of ["To pay", "Paid", "Received"]) await expect(trail.getByText(status, { exact: true })).toBeVisible();
    await capture(page, trail, "shared-settlement-mixed");

    await page.goto(`/app/spaces/${fund.id}`);
    await capture(page, page.getByRole("heading", { name: "Trip fund", exact: true }), "fund-ready");
    await capture(page, page.locator(".notebook-row").filter({
      has: page.getByText("Overdue", { exact: true }),
    }), "fund-overdue-contribution");
    await dialog(page, page.getByRole("button", { name: "Create contribution schedule", exact: true }), "Create contribution schedule", "fund-schedule");
    await dialog(page, page.getByRole("button", { name: "Add fund expense", exact: true }), "Add fund expense", "fund-expense");
    await capture(page, page.getByRole("button", { name: "Start closing out", exact: true }), "fund-closing-panel");

    const funded = await api<Space>(owner, `/groups/${group.id}/spaces`, {
      ...settings, name: "Fund to close", mode: "POOLED_FUND",
    });
    const fundedRoute = `/spaces/${funded.id}`;
    const fundedPool = `${fundedRoute}/pooled-funds`;
    const { occurrences } = await scheduleContribution(owner, funded, "Return deposit", "8400");
    expect(occurrences).toHaveLength(1);
    const [occurrence] = occurrences;
    expect(occurrence.participant_user_id).toBe(profile.id);
    await api(owner, `${fundedPool}/occurrences/${occurrence.id}/confirm`, {
      request_id: crypto.randomUUID(), version: occurrence.version,
    });
    const fundedSpace = await api<Space>(owner, fundedRoute);
    const { space: closing, summary } = await api<{
      space: Space & { status: string }; summary: { book_balance_minor: string };
    }>(owner, `${fundedPool}/closing`, { request_id: crypto.randomUUID(), version: fundedSpace.version });
    expect(closing.status).toBe("CLOSING");
    expect(summary.book_balance_minor).toBe("8400");
    await page.goto(`/app${fundedRoute}`);
    await capture(page, page.getByRole("heading", { name: "Fund return", exact: true }), "fund-closing");
    await dialog(page, page.getByRole("button", { name: "Set fund returns", exact: true }), "Set fund returns", "fund-return-form");

    const { returns: [fundReturn] } = await api<{ returns: Array<{ id: string; version: number }> }>(owner,
      `${fundedPool}/return-plans`, {
        request_id: crypto.randomUUID(), version: closing.version,
        returns: [{ recipient_user_id: profile.id, amount_minor: summary.book_balance_minor }],
      });
    await page.reload();
    await capture(page, page.getByRole("button", { name: "Confirm return sent", exact: true }), "fund-return-plan");
    await api(owner, `${fundedPool}/returns/${fundReturn.id}/sent`, {
      request_id: crypto.randomUUID(), version: fundReturn.version,
    });
    await page.reload();
    await capture(page, page.locator(".pooled-closing").getByText("Sent, awaiting receipt"), "fund-return-awaiting-receipt");

    await page.goto("/app/tasks");
    await capture(page, page.getByRole("heading", { name: "Your quests", exact: true }), "tasks-ready");
    await page.goto("/app/groups");
    await capture(page, page.getByRole("link", { name: "Create party", exact: true }), "groups-list");
    await page.goto("/app/groups/new");
    await capture(page, page.getByRole("heading", { name: "Create party", exact: true }), "groups-create");
    await page.goto("/app/groups/join");
    await capture(page, page.getByRole("heading", { name: "Join party", exact: true }), "groups-join");
    await page.goto(`/app/groups/${group.id}`);
    await capture(page, page.getByRole("heading", { name: group.name, exact: true }), "groups-detail");
    await page.goto(`/app/groups/${group.id}/invite`);
    const inviteHeading = page.getByRole("heading", { name: `Invite members to ${group.name}`, exact: true });
    await expect(page.getByRole("heading", { name: "Bring a partner into this party.", exact: true })).toBeVisible();
    await returnToPageTop(page);
    await expect(inviteHeading).toBeInViewport({ ratio: 1 });
    await capture(page, page.getByRole("button", { name: "Generate invite", exact: true }), "invite-create");
    await page.getByRole("button", { name: "Generate invite", exact: true }).click();
    const inviteLink = page.getByLabel("Invite link", { exact: true });
    await expect(inviteLink).toBeVisible();
    await returnToPageTop(page);
    await expect(inviteHeading).toBeInViewport({ ratio: 1 });
    await capture(page, inviteLink, "invite-share");
    await expect(page.getByText(/^Expires [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M$/)).toBeVisible();

    const emptyParty = await createGroupByApi(owner, "Empty party");
    await page.goto(`/app/groups/${emptyParty.id}`);
    await dialog(page, page.getByRole("button", { name: "Delete empty party", exact: true }), `Delete ${emptyParty.name}`, "groups-delete");
    const peer = await registerByApi(accounts.partner);
    const invite = await createInviteByApi(owner, emptyParty.id, accounts.partner.email);
    await acceptInviteByApi(peer, invite.inviteCode);
    const guest = await browser.newContext({ baseURL, viewport });
    try {
      await english(guest, baseURL!);
      await guest.addCookies([{ name: "mimic_access", value: peer.access_token, url: baseURL!, httpOnly: true }]);
      const guestPage = await guest.newPage();
      await guestPage.goto(`/app/groups/${emptyParty.id}`);
      await dialog(guestPage, guestPage.getByRole("button", { name: "Leave party", exact: true }), `Leave ${emptyParty.name}`, "groups-leave");
    } finally { await guest.close(); }
  });
}

test("taxonomy and Home follow the same account locale after settings refresh", async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "Account locale is independent of viewport");
  test.skip(process.env.MIMIC_I18N_CANDIDATE_API !== "1", "New taxonomy and Home projections require the Phase 2I-2 API");
  assertLoopback();
  await requireBackend();
  const session = await signInWithApiSession(context, uniqueAccounts(info).owner);
  await api(session, "/me", { locale: "en" }, "PATCH");
  await english(context, baseURL!);
  const personal = await api<Space>(session, "/me/spaces", { name: "Daily chest", mode: "PERSONAL_EXPENSES" });
  const food = (await api<Array<{ id: string; name: string }>>(session, "/me/taxonomy?kind=CATEGORY")).find(term => term.name === "Food");
  expect(food).toBeDefined();
  await api(session, `/spaces/${personal.id}/personal-expenses`, {
    title: "Lunch", amount_minor: "4200", request_id: crypto.randomUUID(), occurred_on: personal.opened_on, category_id: food!.id,
  });
  const categories = page.locator(`.space-card[href="/app/personal?space=${personal.id}"] small`).first();
  const foodOption = (label: string) => page.getByRole("combobox", { name: label, exact: true }).locator(`option[value="${food!.id}"]`);
  await page.goto("/app");
  await expect(categories).toHaveText("Top categories: Food");
  const quick = `/app/personal?space=${personal.id}&quick=1`;
  await page.goto(quick);
  await expect(foodOption("Category")).toHaveText(/^Food\b/);
  await page.goto("/app/settings");
  const chinese = page.getByRole("radio", { name: "中文（繁體）" });
  await expect.poll(() => chinese.evaluate(node =>
    Object.keys(node).some(key => key.startsWith("__reactProps")),
  )).toBe(true);
  await chinese.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(chinese).toBeChecked();
  await page.goto("/app");
  await expect(categories).toHaveText("近期分類：飲食");
  await page.goto(quick);
  await expect(foodOption("類別")).toHaveText(/^飲食/);
});
