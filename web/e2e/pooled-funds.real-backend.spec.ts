import { expect as baseExpect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import {
  acceptInviteByApi,
  createGroupByApi,
  createInviteByApi,
  requireBackend,
  signInWithApiSession,
  uniqueAccounts,
  type TestAccount,
} from './fixtures/accounts';

test.use({ actionTimeout: 20_000 });
test.describe.configure({ timeout: 300_000 });
const expect = baseExpect.configure({ timeout: 30_000 });
type Session = { access_token: string; refresh_token: string };

async function api(session: Session, path: string, init: RequestInit = {}) {
  const base = process.env.MIMIC_API_BASE_URL!.replace(/\/+$/, '');
  const response = await fetch(`${base}${path}`, { ...init, headers: {
    authorization: `Bearer ${session.access_token}`,
    ...(init.body ? { 'content-type': 'application/json' } : {}),
    ...init.headers,
  } });
  const text = await response.text();
  let body: unknown = {};
  try { body = JSON.parse(text); } catch { body = { text }; }
  return { response, body, text };
}

async function data<T>(session: Session, path: string, init: RequestInit = {}) {
  const result = await api(session, path, init);
  expect(result.response.ok, `${init.method ?? 'GET'} ${path}: ${result.response.status} ${result.text}`).toBeTruthy();
  return (result.body as { data: T }).data;
}

async function assertDialog(page: Page, name: string) {
  const dialog = page.getByRole('dialog', { name });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  const [box, viewport] = await Promise.all([dialog.boundingBox(), Promise.resolve(page.viewportSize())]);
  expect(box).not.toBeNull(); expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function assertNoOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
    .map(node => ({ tag: node.tagName, className: node.className, label: node.getAttribute('aria-label'),
      right: Math.round(node.getBoundingClientRect().right), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }))
    .filter(item => item.right > window.innerWidth + 1),
  }));
  expect(result).toEqual({ pageOverflow: false, offenders: [] });
}

async function settleHydration(page: Page) {
  await page.waitForLoadState('networkidle');
}

function companionAccount(base: TestAccount, kind: string): TestAccount {
  return { displayName: `${kind} ${base.displayName}`, email: `${kind.toLowerCase()}-${base.email}`, password: base.password };
}

async function signIn(context: BrowserContext, account: TestAccount) {
  return signInWithApiSession(context, account);
}

async function createCommitment(page: Page, name: string, amount: string) {
  const trigger = page.getByRole('button', { name: '建立投入排程' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await assertDialog(page, '建立投入排程');
  await page.getByLabel('排程名稱').fill(name);
  await page.getByLabel('預設投入金額').fill(amount);
  await page.getByRole('button', { name: '儲存投入排程' }).click();
  await expect(page.getByRole('status')).toContainText('投入排程已儲存');
}

async function createExpense(page: Page, title: string, amount: string, advancedBy?: string) {
  await page.getByRole('button', { name: '新增基金支出' }).click();
  await assertDialog(page, '新增基金支出');
  await page.getByLabel('支出名稱').fill(title);
  await page.getByLabel('金額').fill(amount);
  if (advancedBy) {
    await page.getByRole('radio', { name: '參與者先代墊' }).check();
    await page.getByLabel('代墊參與者').selectOption({ label: advancedBy });
  }
  await page.getByRole('button', { name: '記錄基金支出' }).click();
  await expect(page.getByRole('status')).toContainText('基金支出已記錄');
}

test('pooled fund completes the real private lifecycle and accounting journey', async ({ page, context, browser }, testInfo: TestInfo) => {
  const apiBase = process.env.MIMIC_API_BASE_URL;
  const databaseUrl = process.env.MIMIC_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!apiBase || !['localhost', '127.0.0.1'].includes(new URL(apiBase).hostname)) throw new Error('A loopback backend is required for pooled acceptance');
  if (!databaseUrl || !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)) throw new Error('A loopback task database is required for pooled acceptance');
  if (testInfo.project.name === 'phone-small') await page.setViewportSize({ width: 320, height: 568 });
  await requireBackend();

  const accounts = uniqueAccounts(testInfo);
  const governor = companionAccount(accounts.owner, 'Governor');
  const outsider = companionAccount(accounts.partner, 'Outsider');
  const partnerContext = await browser.newContext();
  const governorContext = await browser.newContext();
  const outsiderContext = await browser.newContext();
  try {
    const ownerSession = await signIn(context, accounts.owner);
    const partnerSession = await signIn(partnerContext, accounts.partner);
    const governorSession = await signIn(governorContext, governor);
    const outsiderSession = await signIn(outsiderContext, outsider);
    const partnerPage = await partnerContext.newPage();
    const ownerId = (await data<{ id: string }>(ownerSession, '/me')).id;
    const partnerId = (await data<{ id: string }>(partnerSession, '/me')).id;
    const group = await createGroupByApi(governorSession, `共同基金驗收 ${testInfo.project.name}`);
    const ownerInvite = await createInviteByApi(governorSession, group.id, accounts.owner.email);
    const partnerInvite = await createInviteByApi(governorSession, group.id, accounts.partner.email);
    await acceptInviteByApi(ownerSession, ownerInvite.inviteCode);
    await acceptInviteByApi(partnerSession, partnerInvite.inviteCode);

    await page.goto(`/app/groups/${group.id}`);
    const createBox = page.getByRole('button', { name: '建立共同基金寶箱' });
    await createBox.focus();
    await page.keyboard.press('Enter');
    await assertDialog(page, '建立共同基金寶箱');
    await page.keyboard.press('Escape');
    await expect(createBox).toBeFocused();
    await createBox.click();
    await page.getByLabel('寶箱名稱').fill('旅行共同寶箱');
    await Promise.all([
      page.waitForURL(/\/app\/spaces\/[^/]+$/),
      page.getByRole('button', { name: '建立共同基金', exact: true }).click(),
    ]);
    const spaceId = new URL(page.url()).pathname.split('/').at(-1)!;
    await expect(page.getByRole('heading', { name: '旅行共同寶箱' })).toBeVisible();
    await assertNoOverflow(page);

    await page.getByLabel('加入參與者').selectOption(partnerId);
    await page.getByRole('button', { name: '加入寶箱' }).click();
    await expect(page.getByRole('status')).toContainText('已加入寶箱參與者');

    await createCommitment(page, '第一期投入', '10');
    await partnerPage.goto(`/app/spaces/${spaceId}`);
    await settleHydration(partnerPage);
    await expect(partnerPage.getByText(`${group.name} · TWD · 參與者`)).toBeVisible();
    expect(await partnerPage.evaluate(() => typeof crypto.randomUUID)).toBe('function');
    const participantHydrationProbe = partnerPage.getByRole('button', { name: '新增基金支出' });
    await participantHydrationProbe.click();
    await assertDialog(partnerPage, '新增基金支出');
    await partnerPage.keyboard.press('Escape');
    await expect(participantHydrationProbe).toBeFocused();
    const confirmButton = partnerPage.getByRole('button', { name: '確認已投入' });
    await expect(confirmButton).toBeEnabled();
    const confirmResponsePromise = partnerPage.waitForResponse(response =>
      response.url().includes('/pooled-funds/occurrences/') && response.url().endsWith('/confirm'));
    await confirmButton.click();
    const confirmResponse = await confirmResponsePromise;
    expect(confirmResponse.ok(), `confirm response: ${confirmResponse.status()} ${await confirmResponse.text()}`).toBe(true);
    await expect(partnerPage.getByTestId('pooled-book')).toHaveText('$10.00');
    await page.reload();
    await settleHydration(page);
    await page.getByRole('button', { name: '取消這次' }).click();
    await expect(page.getByRole('status')).toContainText('投入狀態已更新');

    await createExpense(page, '夥伴代墊車票', '3', accounts.partner.displayName);
    await expect(page.getByTestId('pooled-book')).toHaveText('$10.00');
    await expect(page.getByTestId('pooled-pending')).toHaveText('$3.00');
    await expect(page.getByTestId('pooled-available')).toHaveText('$7.00');

    await createExpense(page, '基金支付住宿', '8');
    await expect(page.getByTestId('pooled-book')).toHaveText('$2.00');
    await expect(page.getByTestId('pooled-available')).toHaveText('-$1.00');
    await expect(page.getByText('資金缺口 $1.00', { exact: true })).toBeVisible();

    await createCommitment(page, '補充投入', '2');
    await partnerPage.reload();
    await settleHydration(partnerPage);
    await partnerPage.getByRole('button', { name: '確認已投入' }).click();
    await expect(partnerPage.getByTestId('pooled-book')).toHaveText('$4.00');
    await page.reload();
    await settleHydration(page);
    await page.getByRole('button', { name: '取消這次' }).click();
    await page.getByRole('button', { name: '確認送出代墊款' }).click();
    await expect(page.getByTestId('pooled-book')).toHaveText('$1.00');
    await expect(page.getByTestId('pooled-pending')).toHaveText('$0.00');
    await expect(page.getByTestId('pooled-sent-awaiting')).toHaveText('$3.00');

    await partnerPage.reload();
    await settleHydration(partnerPage);
    await partnerPage.getByRole('button', { name: '確認收到代墊款' }).click();
    await expect(partnerPage.getByTestId('pooled-book')).toHaveText('$1.00');
    await expect(partnerPage.getByTestId('pooled-sent-awaiting')).toHaveText('$0.00');

    await page.reload();
    await settleHydration(page);
    await page.getByRole('button', { name: '開始結清' }).click();
    await expect(page.getByRole('heading', { name: '基金退回' })).toBeVisible();
    const returnTrigger = page.getByRole('button', { name: '指定基金退回' });
    await returnTrigger.click();
    await assertDialog(page, '指定基金退回');
    await page.getByLabel(`${accounts.partner.displayName}的退回金額`).fill('1');
    await page.getByRole('button', { name: '建立退回計畫' }).click();
    await page.getByRole('button', { name: '確認送出退回款' }).click();
    await expect(page.getByTestId('pooled-book')).toHaveText('$0.00');

    await partnerPage.reload();
    await settleHydration(partnerPage);
    await partnerPage.getByRole('button', { name: '確認收到退回款' }).click();
    await expect(partnerPage.getByTestId('pooled-book')).toHaveText('$0.00');
    await partnerPage.getByRole('button', { name: '離開這個寶箱' }).click();
    await expect(partnerPage).toHaveURL(`/app/groups/${group.id}`);

    const sensitive = ['旅行共同寶箱', '夥伴代墊車票', '基金支付住宿', 'book_balance_minor', 'TWD'];
    for (const [label, session] of [['former', partnerSession], ['governor', governorSession], ['outsider', outsiderSession]] as const) {
      const denied = await api(session, `/spaces/${spaceId}/pooled-funds/workspace`);
      expect(denied.response.status, `${label} read status`).toBe(404);
      for (const value of sensitive) expect(denied.text).not.toContain(value);
    }

    await page.reload();
    await settleHydration(page);
    await page.getByRole('button', { name: '封存共同基金' }).click();
    await expect(page.getByRole('heading', { name: '已封存' })).toBeVisible();
    expect((await data<{ status: string }>(ownerSession, `/spaces/${spaceId}`)).status).toBe('ARCHIVED');
    expect(ownerId).not.toBe(partnerId);
    await assertNoOverflow(page);
    const wrapped = page.locator('.pooled-row-actions');
    for (let index = 0; index < await wrapped.count(); index += 1) {
      expect(await wrapped.nth(index).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    }
  } finally {
    await partnerContext.close();
    await governorContext.close();
    await outsiderContext.close();
  }
});
