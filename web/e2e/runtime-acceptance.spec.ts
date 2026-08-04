import { expect, test } from "@playwright/test";

import {
  createFundByApi,
  createGroupByApi,
  signInWithApiSession,
  uniqueAccounts,
} from "./fixtures/accounts";
import { checkRuntimeHealth } from "./helpers/runtime-health";
import { runRuntimePhases } from "./helpers/runtime-phases";

const apiBaseUrl = process.env.MIMIC_API_BASE_URL;
const expectedRevision = process.env.MIMIC_EXPECTED_BACKEND_REVISION;

test.skip(
  process.env.MIMIC_RUNTIME_ACCEPTANCE !== "1",
  "runs only through verify:runtime",
);

test("authenticates and navigates Groups/Funds with phase health checks", async ({
  context,
  page,
}, testInfo) => {
  expect(apiBaseUrl).toBeTruthy();
  expect(expectedRevision).toMatch(/^[0-9a-f]{7,64}$/i);

  const account = uniqueAccounts(testInfo).owner;
  let session: Awaited<ReturnType<typeof signInWithApiSession>>;

  const checkpoint = (phase: string) =>
    checkRuntimeHealth({
      apiBaseUrl: apiBaseUrl!,
      expectedRevision: expectedRevision!,
      phase,
    });

  await runRuntimePhases({
    authenticate: async () => {
      session = await signInWithApiSession(context, account);
    },
    checkpoint,
    navigateGroupsAndFunds: async () => {
      if (!session) {
        throw new Error("Runtime authentication did not create a session");
      }
      const group = await createGroupByApi(
        session,
        "Runtime acceptance group",
        "TWD",
      );
      const fund = await createFundByApi(
        session,
        group.id,
        "Runtime acceptance fund",
        "TWD",
      );

      await page.goto("/app");
      const navigation = page.locator(
        'nav[aria-label="Primary app sections"]:visible',
      );
      await navigation.getByRole("link", { name: "Groups" }).click();
      await expect(page).toHaveURL(/\/app\/groups$/);
      await page.getByRole("link", { name: group.name, exact: false }).first().click();
      await expect(page).toHaveURL(new RegExp(`/app/groups/${group.id}$`));
      await navigation.getByRole("link", { name: "Funds" }).click();
      await expect(page).toHaveURL(/\/app\/funds$/);
      await page.getByRole("link", { name: new RegExp(fund.name) }).click();
      await expect(page).toHaveURL(new RegExp(`/app/funds/${fund.id}$`));
    },
  });
});
