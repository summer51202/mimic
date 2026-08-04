import { expect, type Page, test } from "@playwright/test";

import {
  createFundByApi,
  createGroupByApi,
  requireBackend,
  signInWithApiSession,
  uniqueAccounts,
} from "./fixtures/accounts";

test.beforeAll(requireBackend);

function captureDeliveryErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /fetch failed|failed to fetch|Runtime TypeError|(?:react|next).*(?:error|exception|hydration|unexpected)|(?:error|exception|hydration|unexpected).*(?:react|next)/i.test(
        message.text(),
      )
    ) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

function visibleNavigation(page: Page) {
  return page.locator('nav[aria-label="Primary app sections"]:visible');
}

test("visible navigation reaches authenticated group and fund routes by click", async ({
  context,
  page,
}, testInfo) => {
  const errors = captureDeliveryErrors(page);
  const account = uniqueAccounts(testInfo).owner;
  const session = await signInWithApiSession(context, account);
  const group = await createGroupByApi(session, "Click driven group", "TWD");
  const fund = await createFundByApi(session, group.id, "Click driven fund", "TWD");

  await page.goto("/app");
  const nav = visibleNavigation(page);
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Groups" }).click();
  await expect(page).toHaveURL(/\/app\/groups$/);
  await expect(visibleNavigation(page).getByRole("link", { name: "Groups" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: group.name, exact: false }).first().click();
  await expect(page).toHaveURL(new RegExp(`/app/groups/${group.id}$`));
  await expect(visibleNavigation(page).getByRole("link", { name: "Groups" })).toHaveAttribute("aria-current", "page");

  await visibleNavigation(page).getByRole("link", { name: "Funds" }).click();
  await expect(page).toHaveURL(/\/app\/funds$/);
  await expect(visibleNavigation(page).getByRole("link", { name: "Funds" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: new RegExp(fund.name) }).click();
  await expect(page).toHaveURL(new RegExp(`/app/funds/${fund.id}$`));
  await expect(visibleNavigation(page).getByRole("link", { name: "Funds" })).toHaveAttribute("aria-current", "page");

  await visibleNavigation(page).getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(visibleNavigation(page).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  expect(errors, "authenticated pages emitted delivery console errors").toEqual([]);
});
