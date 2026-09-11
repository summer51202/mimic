import { expect as baseExpect, test, type Page } from '@playwright/test';
import { PrismaClient } from '../../backend/node_modules/@prisma/client';
import {
  acceptInviteByApi,
  createGroupByApi,
  createInviteByApi,
  requireBackend,
  signInWithApiSession,
  uniqueAccounts,
} from './fixtures/accounts';

test.use({ actionTimeout: 15_000 });
test.describe.configure({ timeout: 240_000 });
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
  expect(box!.height).toBeLessThanOrEqual(viewport!.height - 16);
}

test('private shared-expense reference follows authority, settlement, exit, and privacy boundaries', async ({ page, context, browser }, testInfo) => {
  test.setTimeout(240_000);
  const base = process.env.MIMIC_API_BASE_URL;
  const databaseUrl = process.env.MIMIC_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('A loopback backend is required for private-reference acceptance');
  if (!databaseUrl || !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)) throw new Error('A loopback task database is required for private-reference acceptance');
  if (testInfo.project.name === 'phone-small') await page.setViewportSize({ width: 320, height: 568 });
  await requireBackend();

  const accounts = uniqueAccounts(testInfo);
  const ownerContext = await browser.newContext();
  const prisma = new PrismaClient();
  try {
    const partnerSession = await signInWithApiSession(context, accounts.partner);
    const ownerSession = await signInWithApiSession(ownerContext, accounts.owner);
    const ownerId = (await data<{ id: string }>(ownerSession, '/me')).id;
    const partnerId = (await data<{ id: string }>(partnerSession, '/me')).id;
    const group = await createGroupByApi(ownerSession, `參照驗收 ${testInfo.project.name}`);
    const invite = await createInviteByApi(ownerSession, group.id, accounts.partner.email);
    await acceptInviteByApi(partnerSession, invite.inviteCode);
    const personal = await data<{ id: string }>(partnerSession, '/me/spaces', { method: 'POST', body: JSON.stringify({
      name: '我的共同支出', mode: 'PERSONAL_EXPENSES', currency: 'TWD', timezone: 'Asia/Taipei',
    }) });
    const foreign = await data<{ id: string }>(partnerSession, '/me/spaces', { method: 'POST', body: JSON.stringify({
      name: '美元私人帳本', mode: 'PERSONAL_EXPENSES', currency: 'USD', timezone: 'Asia/Taipei',
    }) });
    const privateTag = await data<{ id: string }>(partnerSession, '/me/taxonomy', { method: 'POST', body: JSON.stringify({ kind: 'TAG', name: '私人旅行' }) });
    const category = await data<{ id: string; name: string }>(ownerSession, `/groups/${group.id}/taxonomy`, { method: 'POST', body: JSON.stringify({ kind: 'CATEGORY', name: '共同餐飲' }) });
    const shared = await data<{ id: string; opened_on: string }>(ownerSession, `/groups/${group.id}/spaces`, { method: 'POST', body: JSON.stringify({
      name: '旅行分帳', mode: 'SHARED_EXPENSES', currency: 'TWD', timezone: 'Asia/Taipei',
    }) });
    await data(ownerSession, `/spaces/${shared.id}/participants`, { method: 'POST', body: JSON.stringify({ user_id: partnerId, version: 1 }) });
    const created = await data<{ record: { id: string; version: number } }>(ownerSession, `/spaces/${shared.id}/shared-expenses`, { method: 'POST', body: JSON.stringify({
      request_id: crypto.randomUUID(), title: '共同晚餐', occurred_on: shared.opened_on, amount_minor: '1000', category_id: category.id,
      payers: [{ user_id: ownerId, amount_minor: '1000' }], allocations: [{ user_id: ownerId, amount_minor: '400' }, { user_id: partnerId, amount_minor: '600' }],
    }) });

    const foreignDenied = await api(partnerSession, `/spaces/${foreign.id}/personal-references`, { method: 'POST', body: JSON.stringify({ request_id: crypto.randomUUID(), source_expense_id: created.record.id }) });
    expect(foreignDenied.response.status).toBe(409);
    expect(foreignDenied.text).not.toContain('共同晚餐');

    const pooled = await data<{ id: string }>(ownerSession, `/groups/${group.id}/spaces`, { method: 'POST', body: JSON.stringify({ name: '不可參照池', mode: 'POOLED_FUND' }) });
    await data(ownerSession, `/spaces/${pooled.id}/participants`, { method: 'POST', body: JSON.stringify({ user_id: partnerId, version: 1 }) });
    const pooledExpense = await prisma.expenseRecord.create({ data: {
      spaceId: pooled.id, amountMinor: 5n, occurredOn: new Date(`${shared.opened_on}T00:00:00.000Z`), title: '池內資料不可洩漏',
      categoryId: category.id, createdById: ownerId, updatedById: ownerId,
      sharedAllocations: { create: [{ userId: partnerId, amountMinor: 5n }] },
    } });
    const pooledDenied = await api(partnerSession, `/spaces/${personal.id}/personal-references`, { method: 'POST', body: JSON.stringify({ request_id: crypto.randomUUID(), source_expense_id: pooledExpense.id }) });
    expect(pooledDenied.response.status).toBe(404);
    expect(pooledDenied.text).not.toContain('池內資料不可洩漏');

    await page.goto(`/app/spaces/${shared.id}`);
    await expect(page.getByRole('heading', { name: '共同晚餐' })).toBeVisible();
    const add = page.getByRole('button', { name: '加入我的帳本－共同晚餐' });
    await add.focus(); await add.click();
    await assertDialog(page, '加入我的帳本');
    await page.keyboard.press('Escape');
    await expect(add).toBeFocused();
    await add.click();
    await page.getByLabel('加入到').selectOption(personal.id);
    await page.getByLabel('私人旅行').check();
    await page.getByLabel('私人備註').fill('只有參與者本人可見');
    await page.getByRole('button', { name: '加入我的帳本', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已把你的分攤加入');

    const month = shared.opened_on.slice(0, 7);
    await page.goto(`/app/personal?space=${personal.id}&month=${month}`);
    await expect(page.getByRole('heading', { name: '共同晚餐' })).toBeVisible();
    await expect(page.getByText('來自共同分帳')).toBeVisible();
    await expect(page.getByText('共同餐飲', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/私人旅行/)).toBeVisible();
    await expect(page.getByText('只有參與者本人可見')).toBeVisible();
    await expect(page.getByTestId('monthly-spending')).toHaveText('$6.00');

    const updated = await data<{ record: { version: number } }>(ownerSession, `/spaces/${shared.id}/shared-expenses/${created.record.id}`, { method: 'PATCH', body: JSON.stringify({
      request_id: crypto.randomUUID(), version: created.record.version, title: '共同晚餐（更新）', occurred_on: shared.opened_on,
      amount_minor: '1000', category_id: category.id, payers: [{ user_id: ownerId, amount_minor: '1000' }],
      allocations: [{ user_id: ownerId, amount_minor: '500' }, { user_id: partnerId, amount_minor: '500' }],
    }) });
    expect(updated.record.version).toBe(2);
    await page.reload();
    await expect(page.getByRole('heading', { name: '共同晚餐（更新）' })).toBeVisible();
    await expect(page.getByTestId('monthly-spending')).toHaveText('$5.00');

    await page.getByRole('button', { name: '編輯私人資訊－共同晚餐（更新）' }).click();
    await assertDialog(page, '編輯共同分帳的私人資訊');
    await page.getByLabel('私人備註').fill('個人帳本新備註');
    await page.getByRole('button', { name: '儲存私人資訊' }).click();
    await expect(page.getByText('個人帳本新備註')).toBeVisible();
    await page.getByRole('button', { name: '移除私人參照－共同晚餐（更新）' }).click();
    await assertDialog(page, '移除這筆私人參照？');
    await page.getByRole('button', { name: '確認移除' }).click();
    await expect(page.getByTestId('monthly-spending')).toHaveText('$0.00');
    await page.goto(`/app/spaces/${shared.id}`);
    await page.getByRole('button', { name: '加入我的帳本－共同晚餐（更新）' }).click();
    await page.getByRole('button', { name: '加入我的帳本', exact: true }).click();

    const current = await data<{ version: number }>(ownerSession, `/spaces/${shared.id}`);
    const batch = await data<{ id: string; transfers: Array<{ id: string; from_user_id: string; to_user_id: string; version: number }> }>(ownerSession, `/spaces/${shared.id}/shared-settlements`, { method: 'POST', body: JSON.stringify({
      request_id: crypto.randomUUID(), period_end: shared.opened_on, version: current.version,
    }) });
    expect(batch.transfers).toHaveLength(1);
    const transfer = batch.transfers[0];
    await data(partnerSession, `/spaces/${shared.id}/shared-settlements/${batch.id}/transfers/${transfer.id}/sent`, { method: 'POST', body: JSON.stringify({ request_id: crypto.randomUUID(), version: transfer.version }) });
    await data(ownerSession, `/spaces/${shared.id}/shared-settlements/${batch.id}/transfers/${transfer.id}/received`, { method: 'POST', body: JSON.stringify({ request_id: crypto.randomUUID(), version: transfer.version + 1 }) });
    await page.goto(`/app/personal?space=${personal.id}&month=${month}`);
    await expect(page.getByText('來源已鎖定')).toBeVisible();
    await expect(page.getByTestId('monthly-spending')).toHaveText('$5.00');
    await expect(page.getByRole('heading', { name: '共同晚餐（更新）' })).toHaveCount(1);

    const participants = await data<Array<{ id: string; user_id: string }>>(partnerSession, `/spaces/${shared.id}/participants`);
    const partner = participants.find(item => item.user_id === partnerId)!;
    const beforeExit = await data<{ version: number }>(partnerSession, `/spaces/${shared.id}`);
    await data(partnerSession, `/spaces/${shared.id}/participants/${partner.id}/end`, { method: 'POST', body: JSON.stringify({ version: beforeExit.version }) });
    await page.reload();
    await expect(page.getByTestId('monthly-spending')).toHaveText('$0.00');
    await expect(page.getByText('共同晚餐（更新）')).toHaveCount(0);
    const formerRead = await api(partnerSession, `/spaces/${shared.id}/shared-expenses`);
    expect(formerRead.response.status).toBe(404);
    expect(formerRead.text).not.toContain('共同晚餐');

    const beforeArchive = await data<{ version: number }>(ownerSession, `/spaces/${shared.id}`);
    await data(ownerSession, `/spaces/${shared.id}/archive`, { method: 'POST', body: JSON.stringify({ version: beforeArchive.version }) });
    expect((await data<{ status: string }>(ownerSession, `/spaces/${shared.id}`)).status).toBe('ARCHIVED');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await prisma.$disconnect();
    await ownerContext.close();
  }
});
