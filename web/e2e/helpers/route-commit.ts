import { expect, type Page } from "@playwright/test";

type AppSectionName = "Funds" | "Groups" | "Overview";

const routeCommitTimeout = 30_000;

export function visibleNavigation(page: Page) {
  return page.locator('nav[aria-label="Primary app sections"]:visible');
}

export async function expectRouteCommit(
  page: Page,
  url: RegExp,
  section: AppSectionName,
) {
  await expect(page).toHaveURL(url, { timeout: routeCommitTimeout });
  await expect(
    visibleNavigation(page).getByRole("link", { name: section }),
  ).toHaveAttribute("aria-current", "page");
}
