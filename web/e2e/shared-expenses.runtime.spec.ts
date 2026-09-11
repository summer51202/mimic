import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { PrismaClient } from '../../backend/node_modules/@prisma/client';
import type { SharedExpense } from '../src/shared/api/shared-finance-contracts';
import {
  acceptInviteByApi,
  createGroupByApi,
  createInviteByApi,
  requireBackend,
  signInWithApiSession,
  type TestAccount,
  uniqueAccounts,
} from './fixtures/accounts';

test.use({ actionTimeout: 15_000 });
test.describe.configure({ timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 30_000 });

type Session = { access_token: string; refresh_token: string };
type ExpensePage = { items: SharedExpense[] };
type SpaceProjection = { opened_on: string; version: number };
type SummaryProjection = { positions: Array<{ user_id: string; amount_minor: string }> };
type BatchPage = { items: Array<{ snapshot: { expenses: Array<{ title: string }> } }> };

function accountFrom(owner: TestAccount, role: 'governor' | 'outsider'): TestAccount {
  const slug = owner.email.slice('owner-'.length, -'@example.com'.length);
  return { displayName: role === 'governor' ? `Governor ${slug}` : `Outsider ${slug}`, email: `${role}-${slug}@example.com`, password: owner.password };
}

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

async function userId(session: Session) {
  return (await data<{ id: string }>(session, '/me')).id;
}

function expenseNamed(page: ExpensePage, title: string) {
  const expense = page.items.find(item => item.title === title);
  if (!expense) throw new Error(`Missing shared expense: ${title}`);
  return expense;
}

async function assertDialogBounds(page: Page, name: string) {
  const dialog = page.getByRole('dialog', { name });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.height).toBeLessThanOrEqual(viewport!.height - 16);
}

async function clickHydrated(locator: Locator) {
  await expect.poll(() => locator.evaluate(node => Object.keys(node).some(key => key.startsWith('__reactProps')))).toBe(true);
  await locator.click();
}

async function openSpaceFromGroup(page: Page, groupId: string, name: string) {
  await page.goto(`/app/groups/${groupId}`);
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/app\/spaces\/[a-f0-9-]{36}$/);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
}

test('shared bookkeeping lifecycle uses real persisted responses', async ({ page, context, browser }, testInfo) => {
  test.setTimeout(240_000);
  const base = process.env.MIMIC_API_BASE_URL;
  const databaseUrl = process.env.MIMIC_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('A loopback backend is required for shared runtime acceptance');
  if (!databaseUrl || !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)) throw new Error('A loopback task database is required for shared runtime acceptance');
  await requireBackend();

  const accounts = uniqueAccounts(testInfo);
  const governorAccount = accountFrom(accounts.owner, 'governor');
  const outsiderAccount = accountFrom(accounts.owner, 'outsider');
  const ownerSession = await signInWithApiSession(context, accounts.owner);
  const partnerContext = await browser.newContext();
  const governorContext = await browser.newContext();
  const outsiderContext = await browser.newContext();
  const prisma = new PrismaClient();

  try {
    const partnerSession = await signInWithApiSession(partnerContext, accounts.partner);
    const governorSession = await signInWithApiSession(governorContext, governorAccount);
    const outsiderSession = await signInWithApiSession(outsiderContext, outsiderAccount);
    const [ownerId, partnerId, governorId] = await Promise.all([
      userId(ownerSession), userId(partnerSession), userId(governorSession),
    ]);
    const group = await createGroupByApi(ownerSession, `共同旅費 ${testInfo.project.name}`);
    for (const [session, account] of [[partnerSession, accounts.partner], [governorSession, governorAccount]] as const) {
      const invite = await createInviteByApi(ownerSession, group.id, account.email);
      await acceptInviteByApi(session, invite.inviteCode);
    }
    await data(ownerSession, `/groups/${group.id}/members/${governorId}`, { method: 'PATCH', body: JSON.stringify({ role: 'owner' }) });

    await page.goto(`/app/groups/${group.id}`);
    const createTrigger = page.getByRole('button', { name: '建立共同分帳寶箱' });
    await createTrigger.focus();
    await createTrigger.click();
    await assertDialogBounds(page, '建立共同分帳寶箱');
    await page.keyboard.press('Escape');
    await expect(createTrigger).toBeFocused();
    await createTrigger.click();
    await page.getByLabel('寶箱名稱').fill('旅行分帳');
    await page.getByRole('button', { name: '建立共同分帳', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/spaces\/[a-f0-9-]{36}$/);
    const spaceId = new URL(page.url()).pathname.split('/').at(-1)!;

    const participantSelect = page.getByLabel('加入參與者');
    const participantValue = await participantSelect.locator('option').filter({ hasText: accounts.partner.displayName }).getAttribute('value');
    expect(participantValue).toBeTruthy();
    await participantSelect.selectOption(participantValue!);
    await page.getByRole('button', { name: '加入寶箱' }).click();
    await expect(page.getByText(new RegExp(`${accounts.partner.displayName}.*參與者`))).toBeVisible();

    const governorPage = await governorContext.newPage();
    await governorPage.goto(`/app/groups/${group.id}`);
    await expect(governorPage.getByText('旅行分帳')).toBeVisible();
    await expect(governorPage.getByRole('link', { name: /旅行分帳/ })).toHaveCount(0);
    const governed = await data(governorSession, `/groups/${group.id}/spaces`);
    expect(governed).toContainEqual({ access: 'GOVERNANCE', id: spaceId, mode: 'SHARED_EXPENSES', name: '旅行分帳', status: 'ACTIVE' });
    expect(JSON.stringify(governed)).not.toContain('currency');
    for (const session of [governorSession, outsiderSession]) {
      const denied = await api(session, `/spaces/${spaceId}/shared-expenses/summary`);
      expect(denied.response.status).toBe(404);
      expect(denied.text).not.toContain('amount_minor');
      expect(denied.text).not.toContain('note');
    }

    const space = await data<SpaceProjection>(ownerSession, `/spaces/${spaceId}`);
    const prior = new Date(`${space.opened_on}T00:00:00.000Z`);
    prior.setUTCDate(prior.getUTCDate() - 1);
    const yesterday = prior.toISOString().slice(0, 10);
    await prisma.$transaction([
      prisma.financialSpace.update({ where: { id: spaceId }, data: { openedOn: prior } }),
      prisma.spaceParticipant.updateMany({ where: { spaceId }, data: { effectiveFrom: prior } }),
    ]);
    await page.reload();

    await page.getByRole('button', { name: '新增共同支出' }).click();
    await assertDialogBounds(page, '新增共同支出');
    await page.getByLabel('支出名稱').fill('住宿');
    await page.getByLabel('總金額（TWD）').fill('10.00');
    await page.getByLabel('支出日期').fill(yesterday);
    await page.getByLabel(`付款金額－${accounts.owner.displayName}`).fill('10.00');
    await page.getByLabel('分攤方式').selectOption('FIXED');
    await page.getByLabel(`分攤金額－${accounts.owner.displayName}`).fill('4.00');
    await page.getByLabel(`分攤金額－${accounts.partner.displayName}`).fill('6.00');
    await page.getByRole('button', { name: '確認記帳' }).click();
    await expect(page.getByText(new RegExp(`${accounts.owner.displayName}.*應收.*6`))).toBeVisible();
    await expect(page.getByText(new RegExp(`${accounts.partner.displayName}.*應付.*6`))).toBeVisible();
    expect((await data<SummaryProjection>(ownerSession, `/spaces/${spaceId}/shared-expenses/summary`)).positions).toEqual(expect.arrayContaining([
      { user_id: ownerId, amount_minor: '600' }, { user_id: partnerId, amount_minor: '-600' },
    ]));

    let expenses = await data<ExpensePage>(ownerSession, `/spaces/${spaceId}/shared-expenses`);
    let source = expenseNamed(expenses, '住宿');
    await page.getByRole('button', { name: '編輯 住宿' }).click();
    await data(ownerSession, `/spaces/${spaceId}/shared-expenses/${source.id}`, { method: 'PATCH', body: JSON.stringify({
      request_id: crypto.randomUUID(), version: source.version, title: source.title, occurred_on: source.occurred_on,
      amount_minor: source.amount_minor, note: '伺服器先更新', tag_ids: source.tag_ids, payers: source.payers, allocations: source.allocations,
    }) });
    await page.getByLabel('支出名稱').fill('住宿（已檢視）');
    await page.getByRole('button', { name: '儲存修改' }).click();
    await expect(page.getByRole('dialog', { name: '編輯共同支出' }).getByRole('alert')).toContainText('資料版本已變更');
    await expect(page.getByLabel('支出名稱')).toHaveValue('住宿（已檢視）');
    await page.getByRole('button', { name: '重新讀取最新資料' }).click();
    await page.getByRole('button', { name: '儲存修改' }).click();
    await expect(page.getByRole('heading', { name: '住宿（已檢視）' })).toBeVisible();

    const receiptId = crypto.randomUUID();
    const neutral = { request_id: receiptId, title: '冪等收據', occurred_on: yesterday, amount_minor: '1',
      payers: [{ user_id: ownerId, amount_minor: '1' }], allocations: [{ user_id: ownerId, amount_minor: '1' }] };
    const firstReceipt = await data(ownerSession, `/spaces/${spaceId}/shared-expenses`, { method: 'POST', body: JSON.stringify(neutral) });
    const secondReceipt = await data(ownerSession, `/spaces/${spaceId}/shared-expenses`, { method: 'POST', body: JSON.stringify(neutral) });
    expect(secondReceipt).toEqual(firstReceipt);
    expenses = await data<ExpensePage>(ownerSession, `/spaces/${spaceId}/shared-expenses`);
    expect(expenses.items.filter(item => item.title === '冪等收據')).toHaveLength(1);
    await page.reload();

    await page.getByRole('button', { name: '開始結算批次' }).click();
    await page.getByLabel('結算截止日').fill(yesterday);
    await page.getByRole('button', { name: '建立批次並鎖定期間' }).click();
    await expect(page.getByText(`${yesterday} → ${yesterday}`)).toBeVisible();
    const batches = await data<BatchPage>(ownerSession, `/spaces/${spaceId}/shared-settlements`);
    expect(batches.items[0].snapshot.expenses.map(item => item.title)).toEqual(expect.arrayContaining(['住宿（已檢視）', '冪等收據']));

    await page.getByRole('button', { name: '編輯 住宿（已檢視）' }).click();
    await page.getByLabel('支出名稱').fill('暫存標題');
    await page.getByRole('button', { name: '儲存修改' }).click();
    await expect(page.getByRole('dialog', { name: '編輯共同支出' }).getByRole('alert')).toContainText('結算批次暫時鎖定');
    await expect(page.getByLabel('支出名稱')).toHaveValue('暫存標題');
    await page.getByRole('button', { name: '關閉', exact: true }).click();

    const partnerPage = await partnerContext.newPage();
    await openSpaceFromGroup(partnerPage, group.id, '旅行分帳');
    await clickHydrated(partnerPage.getByRole('button', { name: '確認已付款' }));
    await expect(partnerPage.getByText('SENT', { exact: true })).toBeVisible();
    await page.reload();
    await clickHydrated(page.getByRole('button', { name: '確認已收款' }));
    await expect(page.getByText('COMPLETED', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`${accounts.owner.displayName}.*已結清`))).toBeVisible();
    await expect(page.getByText(new RegExp(`${accounts.partner.displayName}.*已結清`))).toBeVisible();

    source = expenseNamed(await data<ExpensePage>(ownerSession, `/spaces/${spaceId}/shared-expenses`), '住宿（已檢視）');
    await page.getByRole('button', { name: '編輯 住宿（已檢視）' }).click();
    await page.getByRole('button', { name: '儲存修改' }).click();
    await expect(page.getByRole('dialog', { name: '編輯共同支出' }).getByRole('alert')).toContainText('期間已永久鎖定');
    await page.getByRole('button', { name: '建立不可變更的更正' }).click();
    await expect(page.getByRole('dialog', { name: '建立不可變更的更正' })).toContainText('原始紀錄');
    await page.getByLabel('更正原因').fill('實際住宿金額較低');
    await page.getByLabel('更正後總金額（TWD）').fill('8.00');
    await page.getByLabel(`更正後付款－${accounts.owner.displayName}`).fill('8.00');
    await page.getByLabel(`更正後分攤－${accounts.owner.displayName}`).fill('3.20');
    await page.getByLabel(`更正後分攤－${accounts.partner.displayName}`).fill('4.80');
    await page.getByRole('button', { name: '確認建立更正' }).click();
    await expect(page.getByText(new RegExp(`${accounts.owner.displayName}.*應付.*1.2`))).toBeVisible();
    await expect(page.getByText(new RegExp(`${accounts.partner.displayName}.*應收.*1.2`))).toBeVisible();
    expect((await data<SharedExpense>(ownerSession, `/spaces/${spaceId}/shared-expenses/${source.id}`)).title).toBe('住宿（已檢視）');

    await page.getByRole('button', { name: '開始結算批次' }).click();
    const today = await page.getByLabel('結算截止日').inputValue();
    await page.getByRole('button', { name: '建立批次並鎖定期間' }).click();
    await expect(page.getByText(`${today} → ${today}`)).toBeVisible();
    await clickHydrated(page.getByRole('button', { name: '確認已付款' }));
    await expect(page.getByText('SENT', { exact: true }).first()).toBeVisible();
    await partnerPage.reload();
    await clickHydrated(partnerPage.getByRole('button', { name: '確認已收款' }));
    await expect(partnerPage.getByText('COMPLETED', { exact: true })).toHaveCount(2);

    await page.reload();
    const latestSpaceBeforeExit = await data<SpaceProjection>(ownerSession, `/spaces/${spaceId}`);
    const managerExitRequest = page.waitForRequest(request => request.url().includes(`/spaces/${spaceId}/participants/`) && request.url().endsWith('/end'));
    await clickHydrated(page.getByRole('button', { name: '離開這個寶箱' }));
    const attemptedVersion = (await managerExitRequest).postDataJSON().version;
    if (attemptedVersion !== latestSpaceBeforeExit.version) {
      await expect(page.locator('.shared-lifecycle').getByRole('alert')).toContainText('寶箱參與者或狀態已變更');
      await expect(page.getByRole('button', { name: '離開這個寶箱' })).toBeEnabled();
      const retryRequest = page.waitForRequest(request => request.url().includes(`/spaces/${spaceId}/participants/`) && request.url().endsWith('/end'));
      await clickHydrated(page.getByRole('button', { name: '離開這個寶箱' }));
      expect((await retryRequest).postDataJSON().version).toBe(latestSpaceBeforeExit.version);
    }
    await expect(page.locator('.shared-lifecycle').getByRole('alert')).toContainText('寶箱必須保留至少一位有效管理者');
    await partnerPage.reload();
    await clickHydrated(partnerPage.getByRole('button', { name: '離開這個寶箱' }));
    await expect(partnerPage).toHaveURL(`/app/groups/${group.id}`);
    await expect(partnerPage.getByText('旅行分帳')).toHaveCount(0);
    await expect(partnerPage.getByRole('link', { name: /旅行分帳/ })).toHaveCount(0);
    for (const path of ['/shared-expenses', '/shared-expenses/summary', '/shared-settlements', '/shared-corrections']) {
      const denied = await api(partnerSession, `/spaces/${spaceId}${path}`);
      expect(denied.response.status).toBe(404);
      expect(denied.text).not.toContain('實際住宿金額較低');
      expect(denied.text).not.toContain('amount_minor');
    }

    await page.reload();
    await clickHydrated(page.getByRole('button', { name: '封存共同分帳寶箱' }));
    await assertDialogBounds(page, '封存共同分帳寶箱');
    await page.getByLabel('輸入寶箱名稱確認').fill('旅行分帳');
    await page.getByRole('button', { name: '確認封存' }).click();
    await expect(page.getByText(/已封存/)).toBeVisible();
    await expect(page.getByRole('button', { name: '新增共同支出' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /編輯 住宿/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await prisma.$disconnect();
    await Promise.all([partnerContext.close(), governorContext.close(), outsiderContext.close()]);
  }
});
