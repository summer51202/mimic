import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

export type TestAccount = {
  displayName: string;
  email: string;
  password: string;
};

export type CreatedGroup = {
  id: string;
  name: string;
};

export type CreatedFund = {
  id: string;
  name: string;
};

export type CreatedInvite = {
  inviteCode: string;
  inviteUrl: string;
};

type AuthPayload = {
  access_token: string;
  refresh_token: string;
};

const apiBaseUrl =
  process.env.MIMIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

const appBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

export function uniqueAccounts(testInfo: TestInfo) {
  const slug = `${Date.now()}-${testInfo.workerIndex}-${testInfo.retry}`
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();

  return {
    owner: {
      displayName: `Owner ${slug}`,
      email: `owner-${slug}@example.com`,
      password: "password",
    },
    partner: {
      displayName: `Partner ${slug}`,
      email: `partner-${slug}@example.com`,
      password: "password",
    },
  } satisfies Record<string, TestAccount>;
}

export async function requireBackend(): Promise<void> {
  const healthUrl = `${apiBaseUrl.replace(/\/+$/, "")}/health`;

  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(5_000),
    });
    expect(
      response.ok,
      `Required backend health check failed at ${healthUrl}: ${response.status} ${response.statusText}`,
    ).toBeTruthy();
  } catch (cause) {
    if (cause instanceof Error && cause.name === "Error") {
      throw cause;
    }

    throw new Error(`Required backend is unavailable at ${healthUrl}`, {
      cause,
    });
  }
}

export async function isolatedPages(browser: Browser) {
  const owner = await browser.newContext();
  const partner = await browser.newContext();

  return {
    owner,
    ownerPage: await owner.newPage(),
    partner,
    partnerPage: await partner.newPage(),
  };
}

export async function register(page: Page, account: TestAccount) {
  await page.goto("/register");
  await page.locator('input[name="displayName"]').fill(account.displayName);
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app(?:\?|$)/, { timeout: 15_000 });
}

export async function registerByApi(
  account: TestAccount,
): Promise<AuthPayload> {
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      display_name: account.displayName,
      email: account.email,
      password: account.password,
    }),
  });

  expect(response.ok).toBeTruthy();

  const body = (await response.json()) as { data?: AuthPayload };
  expect(body.data?.access_token).toBeTruthy();
  expect(body.data?.refresh_token).toBeTruthy();

  return body.data!;
}

export async function signInWithApiSession(
  context: BrowserContext,
  account: TestAccount,
): Promise<AuthPayload> {
  const session = await registerByApi(account);

  await context.addCookies([
    {
      name: "mimic_access",
      value: session.access_token,
      url: appBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "mimic_refresh",
      value: session.refresh_token,
      url: appBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  return session;
}

export async function createInviteByApi(
  session: AuthPayload,
  groupId: string,
  email: string,
): Promise<CreatedInvite> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/groups/${groupId}/invites`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ invited_email: email }),
    },
  );

  expect(response.ok).toBeTruthy();

  const body = (await response.json()) as {
    data?: { invite_code?: string };
  };
  const inviteCode = body.data?.invite_code;

  expect(inviteCode).toMatch(/^[A-Za-z0-9_-]{12}$/);

  return {
    inviteCode: inviteCode!,
    inviteUrl: new URL(`/invite/${inviteCode}`, appBaseUrl).toString(),
  };
}

export async function acceptInviteByApi(
  session: AuthPayload,
  inviteCode: string,
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/group-invites/accept`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ invite_code: inviteCode }),
    },
  );

  expect(response.ok).toBeTruthy();
}

export async function rejectInviteByApi(
  session: AuthPayload,
  inviteCode: string,
): Promise<unknown> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/group-invites/accept`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ invite_code: inviteCode }),
    },
  );

  expect(response.ok).toBeFalsy();

  return response.json();
}

export async function createGroupByApi(
  session: AuthPayload,
  name: string,
  currency = "TWD",
): Promise<CreatedGroup> {
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/groups`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      default_currency: currency,
      group_type: "couple",
      name,
    }),
  });

  expect(response.ok).toBeTruthy();

  const body = (await response.json()) as { data?: CreatedGroup };
  expect(body.data?.id).toBeTruthy();

  return { id: body.data!.id, name };
}

export async function createFundByApi(
  session: AuthPayload,
  groupId: string,
  name: string,
  currency = "TWD",
): Promise<CreatedFund> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/groups/${groupId}/funds`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, currency }),
    },
  );

  expect(response.ok).toBeTruthy();

  const body = (await response.json()) as { data?: CreatedFund };
  expect(body.data?.id).toBeTruthy();

  return { id: body.data!.id, name };
}

export async function createContributionByApi(
  session: AuthPayload,
  fundId: string,
  contributorUserId: string,
  amountMinor: number,
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/funds/${fundId}/contributions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        amount_minor: amountMinor,
        contribution_type: "one_time",
        contributor_user_id: contributorUserId,
        occurred_on: new Date().toISOString().slice(0, 10),
      }),
    },
  );

  expect(response.ok).toBeTruthy();
}

export async function createExpenseByApi(
  session: AuthPayload,
  fundId: string,
  payerUserId: string,
  splitUserId: string,
  amountMinor: number,
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl.replace(/\/+$/, "")}/funds/${fundId}/expenses`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        amount_minor: amountMinor,
        expense_type: "fund_expense",
        occurred_on: new Date().toISOString().slice(0, 10),
        payers: [{ amount_minor: amountMinor, payer_user_id: payerUserId }],
        split_mode: "fixed",
        splits: [
          {
            fixed_amount_minor: amountMinor,
            sort_order: 0,
            split_type: "fixed",
            user_id: splitUserId,
          },
        ],
        title: "X".repeat(100),
      }),
    },
  );

  expect(response.ok).toBeTruthy();
}

export async function createGroup(
  page: Page,
  name: string,
  currency = "TWD",
): Promise<CreatedGroup> {
  await page.goto("/app/groups/new");
  await page.getByLabel("Group name").fill(name);
  await page.getByLabel("Currency").fill(currency);
  await Promise.all([
    page.waitForURL(
      (url) =>
        url.pathname.startsWith("/app/groups/") &&
        url.pathname !== "/app/groups/new",
      {
        timeout: 15_000,
      },
    ),
    page.locator('button[type="submit"]').click(),
  ]);

  const id = new URL(page.url()).pathname.split("/").at(-1);
  expect(id).toBeTruthy();

  return { id: id!, name };
}

export async function createInvite(
  page: Page,
  groupId: string,
  email: string,
): Promise<string> {
  await page.goto(`/app/groups/${groupId}/invite`);
  await page.getByLabel("Invite email").fill(email);
  await expect(page.getByLabel("Invite email")).toHaveValue(email);
  await page.getByRole("button", { name: "Generate invite" }).click();
  await expect(page.getByLabel("Invite link")).toHaveValue(
    /\/invite\/[A-Za-z0-9_-]{12}$/,
    { timeout: 15_000 },
  );

  return page.getByLabel("Invite link").inputValue();
}

export async function registerFromInvite(page: Page, account: TestAccount) {
  await page.getByRole("link", { name: "Create account" }).click();
  await page.locator('input[name="displayName"]').fill(account.displayName);
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/invite\/[A-Za-z0-9_-]{12}$/, {
    timeout: 15_000,
  });
}

export async function createFund(
  page: Page,
  groupId: string,
  name: string,
  currency = "TWD",
): Promise<CreatedFund> {
  await page.goto(`/app/groups/${groupId}/funds/new`);
  await page.getByLabel("Fund name").fill(name);
  await page.getByLabel("Currency").fill(currency);
  await Promise.all([
    page.waitForURL(/\/app\/funds\/[^/]+$/, { timeout: 15_000 }),
    page.getByRole("button", { name: "Create fund" }).click(),
  ]);

  const id = new URL(page.url()).pathname.split("/").at(-1);
  expect(id).toBeTruthy();

  return { id: id!, name };
}

export async function cacheKeys(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const entries: string[] = [];

    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      entries.push(...requests.map((request) => request.url));
    }

    return entries;
  });
}
