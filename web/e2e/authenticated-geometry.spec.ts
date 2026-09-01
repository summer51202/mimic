import { expect, type Page, test } from "@playwright/test";

import { findBakedTransparencyChecker } from "./helpers/checker-pattern";
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

const additionalBoundaryWidths: Record<string, readonly number[]> = {
  "phone-small": [375, 384],
  phone: [385, 767],
  tablet: [],
  desktop: [],
};
const nativeViewports: Record<string, { height: number; width: number }> = {
  "phone-small": { height: 720, width: 320 },
  phone: { height: 844, width: 390 },
  tablet: { height: 1024, width: 768 },
  desktop: { height: 900, width: 1440 },
};

type RouteCase = { path: string; expectsAvatars: boolean };

const routes = (groupId: string, fundId: string): RouteCase[] => [
  { path: "/app", expectsAvatars: true },
  { path: "/app/groups", expectsAvatars: false },
  { path: "/app/groups/new", expectsAvatars: false },
  { path: `/app/groups/${groupId}`, expectsAvatars: true },
  { path: `/app/groups/${groupId}/invite`, expectsAvatars: false },
  { path: `/app/groups/${groupId}/funds/new`, expectsAvatars: false },
  { path: "/app/funds", expectsAvatars: false },
  { path: `/app/funds/${fundId}`, expectsAvatars: false },
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

async function expectPageGeometry(page: Page, expectsAvatars: boolean) {
  await expectContainedGeometry(page);

  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const bodyStyle = getComputedStyle(document.body);
    const rootStyle = getComputedStyle(root);
    const frames = [...document.querySelectorAll<HTMLElement>("[data-pixel-frame]")]
      .filter((frame) => frame.getClientRects().length > 0)
      .map((frame) => {
        const rect = frame.getBoundingClientRect();
        const style = getComputedStyle(frame);
        return {
          borderWidths: [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ],
          name: frame.dataset.frame ?? frame.dataset.variant ?? frame.className,
          values: [rect.x, rect.y, rect.width, rect.height],
        };
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
    const overflowNodes = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          className: typeof node.className === "string" ? node.className : "",
          text: node.textContent?.trim().slice(0, 60) ?? "",
          right: rect.right,
        };
      })
      .filter((node) => node.right > document.documentElement.clientWidth + 1)
      .slice(0, 8);
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
      overflowNodes,
      overflow: Math.max(document.body.scrollWidth, root.scrollWidth) - root.clientWidth,
    };
  });

  expect(geometry.hiddenGlobally, "global overflow hiding is forbidden").toBeFalsy();
  expect(geometry.overflow, `document must not overflow horizontally: ${JSON.stringify(geometry.overflowNodes)}`).toBeLessThanOrEqual(0);
  expect(geometry.overlaps, "independent text and financial values must not overlap").toEqual([]);
  expect(geometry.frames.length).toBeGreaterThan(0);
  for (const frame of geometry.frames) {
    expect(
      new Set(frame.borderWidths).size,
      `${frame.name} must use identical border widths on all four edges`,
    ).toBe(1);
    expect(
      frame.values.every(Number.isFinite),
      `${frame.name} frame geometry must remain finite`,
    ).toBeTruthy();
  }
  for (const amount of geometry.amounts) {
    expect(amount.clientWidth, `${amount.text} must remain readable`).toBeGreaterThan(0);
    expect(amount.scrollWidth, `${amount.text} must not clip`).toBeLessThanOrEqual(amount.clientWidth + 1);
  }

  const avatars = page.locator("img[data-pixel-avatar]:visible");
  if (expectsAvatars) {
    const avatarCount = await avatars.count();
    expect(avatarCount, "this route must render member avatars").toBeGreaterThan(0);
    for (let index = 0; index < avatarCount; index += 1) {
      const avatar = avatars.nth(index);
      await avatar.scrollIntoViewIfNeeded();
      await expect(avatar).toHaveAttribute("src", /avatar-\d+\.png/);
      await expect.poll(
        () => avatar.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth),
        { message: "pixel avatar must finish loading" },
      ).toBe(96);
      await expect(avatar).toHaveCSS("image-rendering", /pixelated|crisp-edges/);
      expect(await avatar.evaluate((image: HTMLImageElement) => ({
        naturalHeight: image.naturalHeight,
        naturalWidth: image.naturalWidth,
        renderedHeight: image.getBoundingClientRect().height,
        renderedWidth: image.getBoundingClientRect().width,
      }))).toEqual({ naturalHeight: 96, naturalWidth: 96, renderedHeight: 48, renderedWidth: 48 });
    }
  }

  const checkerBackgrounds = await page.locator(":visible").evaluateAll((nodes) =>
    nodes.filter((node) => /checker|checkered/i.test(getComputedStyle(node).backgroundImage)).length,
  );
  expect(checkerBackgrounds, "baked checker patterns must not be visible").toBe(0);
}

test("authenticated frames contain stress data at responsive boundaries", async ({
  browser,
  context,
  page,
}, testInfo) => {
  const unbrokenName = "W".repeat(100); // Database-backed user/group/fund names are VARCHAR(100).
  const accounts = uniqueAccounts(testInfo);
  const owner = { ...accounts.owner, displayName: unbrokenName };
  const partner = { ...accounts.partner, displayName: `N${"W".repeat(99)}` };
  const ownerSession = await signInWithApiSession(context, owner);
  const ownerPayload = JSON.parse(Buffer.from(ownerSession.access_token.split(".")[1], "base64url").toString()) as { sub: string };
  const group = await createGroupByApi(ownerSession, unbrokenName, "TWD");
  let partnerUserId: string | undefined;
  const partnerContext = await browser.newContext();
  try {
    const partnerSession = await signInWithApiSession(partnerContext, partner);
    partnerUserId = (JSON.parse(Buffer.from(partnerSession.access_token.split(".")[1], "base64url").toString()) as { sub: string }).sub;
    const invite = await createInviteByApi(ownerSession, group.id, partner.email);
    await acceptInviteByApi(partnerSession, invite.inviteCode);
  } finally {
    await partnerContext.close();
  }
  expect(partnerUserId).toBeTruthy();
  const fund = await createFundByApi(ownerSession, group.id, unbrokenName, "TWD");
  const extremeMinor = 999_999_999_999;
  await createContributionByApi(ownerSession, fund.id, ownerPayload.sub, extremeMinor);
  await createExpenseByApi(ownerSession, fund.id, ownerPayload.sub, partnerUserId!, extremeMinor);

  const nativeViewport = page.viewportSize();
  expect(nativeViewport, "project must configure a native viewport").not.toBeNull();
  expect(nativeViewport, `${testInfo.project.name} native viewport changed`).toEqual(
    nativeViewports[testInfo.project.name],
  );
  const routeCases = routes(group.id, fund.id);
  for (const route of routeCases) {
    await page.goto(route.path);
    await expect(page.locator("main")).toBeVisible();
    await expectPageGeometry(page, route.expectsAvatars);
    const screenshot = await page.screenshot({
      path: testInfo.outputPath(`geometry-${testInfo.project.name}-native-${route.path.replace(/\W+/g, "-")}.png`),
      fullPage: true,
    });
    expect(
      findBakedTransparencyChecker(screenshot),
      `rendered checker pattern at ${route.path}, native ${nativeViewport!.width}x${nativeViewport!.height}, ${testInfo.project.name}`,
    ).toBeNull();
  }

  for (const width of additionalBoundaryWidths[testInfo.project.name] ?? []) {
    await page.setViewportSize({ height: nativeViewport!.height, width });
    for (const route of routeCases) {
      await page.goto(route.path);
      await expect(page.locator("main")).toBeVisible();
      await expectPageGeometry(page, route.expectsAvatars);
    }
  }
});
