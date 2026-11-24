import { expect, test } from "@playwright/test";
import ja from "../src/i18n/messages/ja.json";
import { registerByApi, uniqueAccounts } from "./fixtures/accounts";

for (const { route, locale, width, alignment } of [
  { route: "/login", locale: "ja", width: 360, alignment: "start" },
  { route: "/", locale: "en", width: 320 },
]) {
  test(`keeps the ${locale} menu at ${route} inside ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 800 });
    await context.addCookies([{ name: "mimic-locale", value: locale, url: baseURL! }]);
    await page.goto(route);
    await page.locator('button[aria-haspopup="menu"][aria-busy]').click();
    const menu = page.getByRole("menu");
    if (alignment) await expect(menu).toHaveAttribute("data-align", alignment);
    await expect.poll(() => menu.evaluate(element => {
      const { left, right } = element.getBoundingClientRect();
      return left >= 8 && right <= document.documentElement.clientWidth - 8;
    })).toBe(true);
  });
}

test("switches Japanese on public and auth pages and persists after refresh", async ({ page, context }) => {
  for (const route of ["/", "/login", "/register"]) {
    await context.clearCookies();
    await page.goto(route);
    await page.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole("menuitemradio", { name: "日本語", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    expect((await context.cookies()).find(c => c.name === "mimic-locale")?.value).toBe("ja");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await page.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole("menuitemradio", { name: "中文（繁體）", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  }
});

test("Japanese manifest uses the reviewed speaker and tagline", async ({ context, baseURL }) => {
  await context.addCookies([{ name: "mimic-locale", value: "ja", url: baseURL! }]);
  const response = await context.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ lang: "ja", description: `${ja.brand.speaker} - ${ja.brand.tagline}` });
});

test("syncs Japanese during real login and restores it in a fresh context", async ({ page, context, browser, baseURL }, info) => {
  test.skip(process.env.MIMIC_RUNTIME_ACCEPTANCE !== "1", "Requires dedicated real backend");
  for (const value of [process.env.MIMIC_API_BASE_URL, process.env.MIMIC_RUNTIME_DATABASE_URL]) {
    expect(value && new URL(value).hostname).toBe("127.0.0.1");
  }
  const account = uniqueAccounts(info).owner;
  const session = await registerByApi(account);
  async function login(target: typeof page) {
    await target.goto(`${baseURL}/login`);
    await target.locator('input[name="email"]').fill(account.email);
    await target.locator('input[name="password"]').fill(account.password);
    await target.locator('button[type="submit"]').click();
    await expect(target).toHaveURL(/\/app$/, { timeout: 30_000 });
  }
  await context.addCookies([{ name: "mimic-locale", value: "ja", url: baseURL! }]);
  await login(page);
  await expect.poll(async () => {
    const response = await fetch(`${process.env.MIMIC_API_BASE_URL}/me`, { headers: { authorization: `Bearer ${session.access_token}` } });
    return (await response.json()).data.locale;
  }).toBe("ja");
  const fresh = await browser.newContext({ baseURL });
  try {
    const freshPage = await fresh.newPage();
    await login(freshPage);
    expect((await fresh.cookies()).find(c => c.name === "mimic-locale")?.value).toBe("ja");
    await expect(freshPage.locator("html")).toHaveAttribute("lang", "ja");
    await freshPage.goto(`${baseURL}/app/settings`);
    await expect(freshPage.getByRole("radio", { name: "日本語" })).toBeChecked();
    const chinese = freshPage.getByRole("radio", { name: "中文（繁體）" });
    await expect.poll(() => chinese.evaluate(node => Object.keys(node).some(key => key.startsWith("__reactProps")))).toBe(true);
    await chinese.click();
    await expect(freshPage.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await expect(chinese).toBeChecked();
  } finally { await fresh.close(); }
});

test("English language trigger abbreviates below 360 while retaining its accessible name", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "mimic-locale", value: "en", url: baseURL! }]);
  await page.goto("/");
  const button = page.getByRole("button", { name: "Language: English", exact: true });
  for (const [width, text] of [[320, "EN"], [359, "EN"], [360, "English"]] as const) {
    await page.setViewportSize({ width, height: 844 });
    await expect(button).toHaveAccessibleName("Language: English");
    await expect(button.locator("span:visible").first()).toHaveText(text);
  }
  await button.click();
  await expect(page.getByRole("menuitemradio", { name: "English", exact: true })).toBeVisible();
});
