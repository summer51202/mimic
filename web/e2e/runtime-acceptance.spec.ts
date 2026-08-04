import { expect, test } from "@playwright/test";

import {
  createFundByApi,
  createGroupByApi,
  signInWithApiSession,
  uniqueAccounts,
} from "./fixtures/accounts";
import { checkRuntimeHealth } from "./helpers/runtime-health";
import { runRuntimePhases } from "./helpers/runtime-phases";
import {
  expectRouteCommit,
  visibleNavigation,
} from "./helpers/route-commit";

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
  test.setTimeout(180_000);
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
      const navigation = visibleNavigation(page);
      await navigation.getByRole("link", { name: "Groups" }).click();
      await expectRouteCommit(page, /\/app\/groups$/, "Groups");
      const groupLink = page
        .getByRole("link", { name: group.name, exact: false })
        .first();
      await expect(groupLink).toHaveAttribute(
        "href",
        `/app/groups/${group.id}`,
      );
      await groupLink.click();
      await expectRouteCommit(
        page,
        new RegExp(`/app/groups/${group.id}$`),
        "Groups",
      );
      await navigation.getByRole("link", { name: "Funds" }).click();
      await expectRouteCommit(page, /\/app\/funds$/, "Funds");
      const fundLink = page.getByRole("link", {
        name: new RegExp(fund.name),
      });
      await expect(fundLink).toHaveAttribute("href", `/app/funds/${fund.id}`);
      await fundLink.click();
      await expectRouteCommit(
        page,
        new RegExp(`/app/funds/${fund.id}$`),
        "Funds",
      );
    },
  });
});
