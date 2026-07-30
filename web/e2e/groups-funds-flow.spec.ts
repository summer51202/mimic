import { expect, test } from "@playwright/test";

import {
  acceptInviteByApi,
  backendAvailable,
  cacheKeys,
  createFundByApi,
  createGroupByApi,
  createInviteByApi,
  isolatedPages,
  signInWithApiSession,
  uniqueAccounts,
} from "./fixtures/accounts";

test("two users create a group, accept an invite, and open a fund summary", async ({
  browser,
}, testInfo) => {
  test.skip(!(await backendAvailable()), "Backend API is not available.");

  const accounts = uniqueAccounts(testInfo);
  const { owner, ownerPage, partner, partnerPage } = await isolatedPages(browser);

  try {
    const ownerSession = await signInWithApiSession(owner, accounts.owner);
    const partnerSession = await signInWithApiSession(partner, accounts.partner);
    const group = await createGroupByApi(ownerSession, "Shared quest fund", "TWD");
    const invite = await createInviteByApi(
      ownerSession,
      group.id,
      accounts.partner.email,
    );

    await acceptInviteByApi(partnerSession, invite.inviteCode);
    await partnerPage.goto(`/app/groups/${group.id}`);
    await expect(partnerPage.getByText(accounts.partner.displayName)).toBeVisible();

    await ownerPage.goto(`/app/groups/${group.id}`);
    await expect(ownerPage.getByText(accounts.partner.displayName)).toBeVisible();

    const fund = await createFundByApi(ownerSession, group.id, "Travel fund", "TWD");
    await ownerPage.goto(`/app/funds/${fund.id}`);
    await expect(ownerPage).toHaveURL(new RegExp(`/app/funds/${fund.id}$`));
    await expect(
      ownerPage.getByRole("heading", { name: "Travel fund" }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole("heading", { name: "Current period" }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole("heading", { name: "Member positions" }),
    ).toBeVisible();

    const privateCacheKeys = await cacheKeys(ownerPage);
    expect(privateCacheKeys).not.toContainEqual(
      expect.stringMatching(new RegExp(`/app/|/api/app/|${group.id}|${fund.id}`)),
    );
  } finally {
    await owner.close();
    await partner.close();
  }
});
