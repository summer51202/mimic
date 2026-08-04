import { expect, type Page, test } from "@playwright/test";

import {
  createFundByApi,
  createGroupByApi,
  requireBackend,
  signInWithApiSession,
  uniqueAccounts,
} from "./fixtures/accounts";
import {
  expectRouteCommit,
  visibleNavigation,
} from "./helpers/route-commit";

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

test("visible navigation reaches authenticated group and fund routes by click", async ({
  context,
  page,
}, testInfo) => {
  test.setTimeout(180_000);
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
  await expectRouteCommit(page, /\/app\/groups$/, "Groups");

  const groupLink = page
    .getByRole("link", { name: group.name, exact: false })
    .first();
  await expect(groupLink).toHaveAttribute("href", `/app/groups/${group.id}`);
  await groupLink.click();
  await expectRouteCommit(
    page,
    new RegExp(`/app/groups/${group.id}$`),
    "Groups",
  );

  await visibleNavigation(page).getByRole("link", { name: "Funds" }).click();
  await expectRouteCommit(page, /\/app\/funds$/, "Funds");

  const fundLink = page.getByRole("link", { name: new RegExp(fund.name) });
  await expect(fundLink).toHaveAttribute("href", `/app/funds/${fund.id}`);
  await fundLink.click();
  await expectRouteCommit(
    page,
    new RegExp(`/app/funds/${fund.id}$`),
    "Funds",
  );

  await visibleNavigation(page).getByRole("link", { name: "Overview" }).click();
  await expectRouteCommit(page, /\/app$/, "Overview");
  expect(errors, "authenticated pages emitted delivery console errors").toEqual([]);
});
