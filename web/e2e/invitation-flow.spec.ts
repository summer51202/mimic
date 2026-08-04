import { expect, test } from "@playwright/test";

import { inviteMessages } from "../src/features/invitations/invite-errors";
import {
  createGroupByApi,
  createInviteByApi,
  isolatedPages,
  rejectInviteByApi,
  requireBackend,
  signInWithApiSession,
  uniqueAccounts,
} from "./fixtures/accounts";

test("keeps invalid invitation links terminal and private", async ({ page }) => {
  await page.goto("/invite/bad-code");

  await expect(page.getByText(inviteMessages.INVITE_NOT_FOUND)).toBeVisible();
  await expect(page.getByText("bad-code")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Log in to accept" })).toHaveCount(0);
});

test.describe("backend-backed invitation flows", () => {
  test.beforeAll(requireBackend);

  test("renders the authenticated invite gate without leaking ids", async ({
    browser,
  }, testInfo) => {
  const accounts = uniqueAccounts(testInfo);
  const { owner, ownerPage, partner } = await isolatedPages(browser);

  try {
    const ownerSession = await signInWithApiSession(owner, accounts.owner);
    const group = await createGroupByApi(ownerSession, "Invite gate", "TWD");

    await ownerPage.goto(`/app/groups/${group.id}/invite`);

    await expect(
      ownerPage.getByRole("heading", { name: "Bring a partner into this quest." }),
    ).toBeVisible();
    await expect(ownerPage.getByLabel("Invite email")).toBeVisible();
    await expect(ownerPage.getByText(group.id)).toHaveCount(0);
  } finally {
    await owner.close();
    await partner.close();
  }
  });

  test("rejects email mismatch for invite acceptance", async ({
    browser,
  }, testInfo) => {
  const accounts = uniqueAccounts(testInfo);
  const mismatch = {
    ...accounts.partner,
    displayName: `Mismatch ${testInfo.workerIndex}`,
    email: accounts.partner.email.replace("partner-", "mismatch-"),
  };
  const { owner, partner } = await isolatedPages(browser);

  try {
    const ownerSession = await signInWithApiSession(owner, accounts.owner);
    const mismatchSession = await signInWithApiSession(partner, mismatch);
    const group = await createGroupByApi(ownerSession, "Email mismatch", "TWD");
    const invite = await createInviteByApi(
      ownerSession,
      group.id,
      accounts.partner.email,
    );

    await expect
      .poll(async () => rejectInviteByApi(mismatchSession, invite.inviteCode), {
        timeout: 15_000,
      })
      .toMatchObject({ message: "INVITE_EMAIL_MISMATCH" });
  } finally {
    await owner.close();
    await partner.close();
  }
  });
});
