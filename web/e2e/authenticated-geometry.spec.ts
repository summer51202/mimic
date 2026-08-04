import { expect, type Page, test } from "@playwright/test";

import { findBakedTransparencyChecker } from "../src/shared/brand/checker-pattern";
import {
  acceptInviteByApi,
  createContributionByApi,
  createExpenseByApi,
  createFundByApi,
  createGroupByApi,
  createInviteByApi,
  requireBackend,
  signInWithApiSession,
  uniqueAccounts,
} from "./fixtures/accounts";

test.beforeAll(requireBackend);

const boundaryWidths = [320, 375, 384, 385, 767, 768] as const;
const routes = (groupId: string, fundId: string) => [
  "/app",
  "/app/groups",
  `/app/groups/${groupId}`,
  "/app/funds",
  `/app/funds/${fundId}`,
];

async function expectContainedGeometry(page: Page) {
  const result = await page.locator("[data-contain-text]:visible").evaluateAll((nodes) =>
    nodes.map((node) => {
      const frame = node.closest<HTMLElement>("[data-frame]");
      const rect = node.getBoundingClientRect();
      const frameRect = frame?.getBoundingClientRect();
      return {
        frame: frame?.dataset.frame ?? null,
        inside: Boolean(
          frameRect &&
            rect.left >= frameRect.left - 1 &&
            rect.top >= frameRect.top - 1 &&
            rect.right <= frameRect.right + 1 &&
            rect.bottom <= frameRect.bottom + 1,
        ),
        text: node.textContent?.trim().slice(0, 80),
      };
    }),
  );

  expect(result.filter((item) => !item.frame), "every containment marker must have a frame").toEqual([]);
  expect(result.filter((item) => !item.inside), "text must remain within its frame with exactly 1px tolerance").toEqual([]);
}

async function expectPageGeometry(page: Page) {
  await expectContainedGeometry(page);

  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const bodyStyle = getComputedStyle(document.body);
    const rootStyle = getComputedStyle(root);
    const frames = [...document.querySelectorAll<HTMLElement>("[data-frame]")]
      .filter((frame) => frame.getClientRects().length > 0)
      .map((frame) => {
        const rect = frame.getBoundingClientRect();
        return [rect.x, rect.y, rect.width, rect.height];
      });
    const amounts = [...document.querySelectorAll<HTMLElement>("[data-contain-text]")]
      .filter((node) => /(?:TWD|USD|NT\$|\$|[-+]?[\d,]+\.\d{2})/.test(node.textContent ?? ""))
      .map((node) => ({
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        text: node.textContent?.trim(),
      }));
    const markers = [...document.querySelectorAll<HTMLElement>("[data-contain-text]")]
      .filter((node) => node.getClientRects().length > 0);
    const overlaps: string[] = [];
    for (let leftIndex = 0; leftIndex < markers.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < markers.length; rightIndex += 1) {
        const left = markers[leftIndex];
        const right = markers[rightIndex];
        if (left.contains(right) || right.contains(left)) continue;
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
          overlaps.push(`${left.textContent?.trim().slice(0, 40)} <> ${right.textContent?.trim().slice(0, 40)}`);
        }
      }
    }
    return {
      amounts,
      frames,
      hiddenGlobally: bodyStyle.overflowX === "hidden" || rootStyle.overflowX === "hidden",
      overlaps,
      overflow: Math.max(document.body.scrollWidth, root.scrollWidth) - root.clientWidth,
    };
  });

  expect(geometry.hiddenGlobally, "global overflow hiding is forbidden").toBeFalsy();
  expect(geometry.overflow, "document must not overflow horizontally").toBeLessThanOrEqual(0);
  expect(geometry.overlaps, "independent text and financial values must not overlap").toEqual([]);
  expect(geometry.frames.length).toBeGreaterThan(0);
  for (const frame of geometry.frames) {
    for (const value of frame) expect(value, "frame geometry must use whole pixels").toBe(Math.round(value));
  }
  for (const amount of geometry.amounts) {
    expect(amount.clientWidth, `${amount.text} must remain readable`).toBeGreaterThan(0);
    expect(amount.scrollWidth, `${amount.text} must not clip`).toBeLessThanOrEqual(amount.clientWidth + 1);
  }

  const avatars = page.locator('img[src*="/pixel-ui/avatar-"]:visible');
  for (let index = 0; index < (await avatars.count()); index += 1) {
    const avatar = avatars.nth(index);
    await expect(avatar).toHaveCSS("image-rendering", /pixelated|crisp-edges/);
    expect(await avatar.evaluate((image: HTMLImageElement) => ({
      naturalHeight: image.naturalHeight,
      naturalWidth: image.naturalWidth,
      renderedHeight: image.getBoundingClientRect().height,
      renderedWidth: image.getBoundingClientRect().width,
    }))).toEqual({ naturalHeight: 96, naturalWidth: 96, renderedHeight: 48, renderedWidth: 48 });
  }

  const checkerBackgrounds = await page.locator(":visible").evaluateAll((nodes) =>
    nodes.filter((node) => /checker|checkered/i.test(getComputedStyle(node).backgroundImage)).length,
  );
  expect(checkerBackgrounds, "baked checker patterns must not be visible").toBe(0);
}

test("authenticated frames contain stress data at responsive boundaries", async ({
  context,
  page,
}, testInfo) => {
  const unbrokenName = "W".repeat(100); // Database-backed user/group/fund names are VARCHAR(100).
  const accounts = uniqueAccounts(testInfo);
  const owner = { ...accounts.owner, displayName: unbrokenName };
  const partner = { ...accounts.partner, displayName: `N${"W".repeat(99)}` };
  const ownerSession = await signInWithApiSession(context, owner);
  const partnerContext = await page.context().browser()!.newContext();
  const partnerSession = await signInWithApiSession(partnerContext, partner);
  const ownerPayload = JSON.parse(Buffer.from(ownerSession.access_token.split(".")[1], "base64url").toString()) as { sub: string };
  const partnerPayload = JSON.parse(Buffer.from(partnerSession.access_token.split(".")[1], "base64url").toString()) as { sub: string };
  const group = await createGroupByApi(ownerSession, unbrokenName, "TWD");
  const invite = await createInviteByApi(ownerSession, group.id, partner.email);
  await acceptInviteByApi(partnerSession, invite.inviteCode);
  await partnerContext.close();
  const fund = await createFundByApi(ownerSession, group.id, unbrokenName, "TWD");
  const extremeMinor = 999_999_999_999;
  await createContributionByApi(ownerSession, fund.id, ownerPayload.sub, extremeMinor);
  await createExpenseByApi(ownerSession, fund.id, ownerPayload.sub, partnerPayload.sub, extremeMinor);

  for (const width of boundaryWidths) {
    await page.setViewportSize({ height: width < 768 ? 900 : 1024, width });
    for (const route of routes(group.id, fund.id)) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expectPageGeometry(page);
      const screenshot = await page.screenshot({
        path: testInfo.outputPath(`geometry-${testInfo.project.name}-${width}-${route.replace(/\W+/g, "-")}.png`),
        fullPage: true,
      });
      expect(
        findBakedTransparencyChecker(screenshot),
        `rendered checker pattern at ${route}, ${width}px, ${testInfo.project.name}`,
      ).toBeNull();
    }
  }
});
