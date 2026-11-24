import { expect, test, type Page } from "@playwright/test";
import { registerByApi, requireBackend, uniqueAccounts, type TestAccount } from "./fixtures/accounts";

const cookieName = "mimic-locale";
async function chooseLanguage(page: Page, name: string) {
  await page.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

async function login(page: Page, account: TestAccount) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
}

test("defaults to Chinese and keeps the public language across navigation", async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.goto("/");
  const root = page.locator("html");
  const english = page.getByRole("banner").getByRole("button", { name: "語言：中文", exact: true });
  await expect(root).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByRole("link", { name: "開始冒險" })).toBeVisible();
  expect((await context.cookies()).find((cookie) => cookie.name === cookieName)).toBeUndefined();
  await expect(english.locator("span:visible").first()).toHaveAttribute("lang", "zh-Hant");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(english).toBeFocused();
  const switching = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/locale" && response.request().method() === "POST");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  expect((await switching).ok()).toBe(true);
  await expect(root).toHaveAttribute("lang", "en");
  const chinese = page.getByRole("banner").getByRole("button", { name: "Language: English", exact: true });
  await expect(chinese.locator("span:visible").first()).toHaveAttribute("lang", "en");
  await expect(chinese).toBeFocused();
  expect((await context.cookies()).find((cookie) => cookie.name === cookieName)?.value).toBe("en");
  await page.reload();
  await expect(page.getByRole("link", { name: "Start adventure" })).toBeVisible();

  for (const [path, heading] of [
    ["/features", "mimic features"], ["/privacy", "Privacy notice"],
    ["/terms", "Terms of service"], ["/invite/ABCD1234XYZ_", "Join this shared money quest"],
  ]) {
    await page.goto(path);
    await expect(root).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await chooseLanguage(page, "中文（繁體）");
  await expect(root).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByRole("heading", { name: "加入這個共同理財任務" })).toBeVisible();
});

test("auth pages switch languages and show English validation", async ({ page }) => {
  await page.goto("/login");
  await chooseLanguage(page, "English");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Enter your email.")).toBeVisible();
  await page.goto("/register");
  await chooseLanguage(page, "中文（繁體）");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await chooseLanguage(page, "English");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByText("Enter a display name.")).toBeVisible();
});

test("manifest follows the locale cookie", async ({ context, baseURL }) => {
  const initial = await context.request.get("/manifest.webmanifest");
  expect(initial.ok()).toBe(true);
  expect(await initial.json()).toMatchObject({ lang: "zh-Hant" });
  await context.addCookies([{ name: cookieName, value: "en", url: baseURL! }]);
  const translated = await context.request.get("/manifest.webmanifest");
  expect(await translated.json()).toMatchObject({
    lang: "en",
    description: "Mimiku - Save together, spend together, and adventure together in another world!",
  });
});

test("the production service worker fallback has both languages", async ({ page, context }) => {
  test.skip(process.env.MIMIC_PHASE_2I_PRODUCTION !== "1", "Requires the production service worker");
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
  });
  await context.setOffline(true);
  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "mimic 離線中" })).toBeVisible();
  await expect(page.locator('[lang="en"]').getByRole("heading", { name: "mimic is offline" })).toBeVisible();
});

test("synchronizes language across real logins and settings", async ({ page, browser, context, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "Account synchronization is independent of viewport");
  test.skip(process.env.MIMIC_RUNTIME_ACCEPTANCE !== "1", "Requires real backend fixtures");
  for (const url of [process.env.MIMIC_API_BASE_URL, process.env.MIMIC_RUNTIME_DATABASE_URL]) {
    expect(url && new URL(url).hostname).toBe("127.0.0.1");
  }
  await requireBackend();
  const account = uniqueAccounts(info).owner;
  const session = await registerByApi(account);

  async function accountLocale() {
    const response = await fetch(`${process.env.MIMIC_API_BASE_URL}/me`, {
      headers: { authorization: `Bearer ${session.access_token}` },
    });
    expect(response.ok).toBe(true);
    return (await response.json()).data.locale;
  }

  await context.addCookies([{ name: cookieName, value: "en", url: baseURL! }]);
  await login(page, account);
  await expect.poll(accountLocale).toBe("en");

  const second = await browser.newContext({ baseURL });
  try {
    const freshPage = await second.newPage();
    await login(freshPage, account);
    expect((await second.cookies()).find((cookie) => cookie.name === cookieName)?.value).toBe("en");
    await expect(freshPage.locator("html")).toHaveAttribute("lang", "en");

    await freshPage.goto("/app/settings");
    const chinese = freshPage.getByRole("radio", { name: "中文（繁體）" });
    await chinese.focus();
    await freshPage.keyboard.press("Space");
    await expect(chinese).toBeFocused();
    await expect(chinese).toBeChecked();
    await expect(freshPage.getByRole("status")).toHaveText("語言已切換為中文。");
    await expect.poll(accountLocale).toBe("zh-TW");
  } finally {
    await second.close();
  }
});

test("fits the English Home navigation labels at 360, 390 and 1440 pixels", async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "Uses the explicit viewport matrix");
  test.skip(process.env.MIMIC_RUNTIME_ACCEPTANCE !== "1", "Requires real backend fixtures");
  for (const url of [process.env.MIMIC_API_BASE_URL, process.env.MIMIC_RUNTIME_DATABASE_URL]) {
    expect(url && new URL(url).hostname).toBe("127.0.0.1");
  }
  await requireBackend();
  const account = uniqueAccounts(info).owner;
  await registerByApi(account);
  await context.addCookies([{ name: cookieName, value: "en", url: baseURL! }]);
  await login(page, account);

  for (const [width, height] of [[360, 800], [390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const labels = page.locator('nav[aria-label="Primary app sections"]:visible [class*="_label"]');
    await expect(labels).toHaveText(["Home", "My Chests", "Parties", "Quests", "Settings"]);
    const measurements = await labels.evaluateAll((items) => items.map((item) => ({
      label: item.textContent, scrollWidth: item.scrollWidth, clientWidth: item.clientWidth,
    })));
    const clipped = measurements.filter(({ scrollWidth, clientWidth }) => scrollWidth > clientWidth);
    if (clipped.length) {
      await info.attach(`nav-en-${width}x${height}`, { body: await page.screenshot(), contentType: "image/png" });
    }
    expect(clipped, JSON.stringify(measurements)).toEqual([]);
  }
});
