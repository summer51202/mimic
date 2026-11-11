import { expect as baseExpect, test, type Page, type TestInfo } from '@playwright/test';
import { requireBackend, signInWithApiSession, uniqueAccounts } from './fixtures/accounts';

test.use({ actionTimeout: 20_000 });
test.describe.configure({ timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 30_000 });
type Session = { access_token: string; refresh_token: string };

async function data<T>(session: Session, path: string, init: RequestInit = {}) {
  const base = process.env.MIMIC_API_BASE_URL!.replace(/\/+$/, '');
  const response = await fetch(`${base}${path}`, { ...init, headers: {
    authorization: `Bearer ${session.access_token}`,
    ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers,
  } });
  const text = await response.text();
  expect(response.ok, `${init.method ?? 'GET'} ${path}: ${response.status} ${text}`).toBeTruthy();
  return (JSON.parse(text) as { data: T }).data;
}

async function assertNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')].filter((node) =>
      !node.closest('[data-home-viewport]') && node.getBoundingClientRect().right > innerWidth + 1)
      .map((node) => `${node.tagName}.${String(node.className)}`).slice(0, 5),
  }))).toEqual(expect.objectContaining({ scroll: page.viewportSize()!.width, offenders: [] }));
}

test('navigates treasure modes, quick entry, and actor tasks against the real backend', async ({ page, context }, testInfo: TestInfo) => {
  const apiBase = process.env.MIMIC_API_BASE_URL;
  const databaseUrl = process.env.MIMIC_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!apiBase || !['localhost', '127.0.0.1'].includes(new URL(apiBase).hostname)) throw new Error('A loopback backend is required');
  if (!databaseUrl || !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)) throw new Error('A loopback task database is required');
  const expected = { 'phone-small': { width: 320, height: 568 }, phone: { width: 390, height: 844 },
    tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } }[testInfo.project.name];
  if (!expected) throw new Error(`Unexpected project ${testInfo.project.name}`);
  await page.setViewportSize(expected);
  await requireBackend();

  const session = await signInWithApiSession(context, uniqueAccounts(testInfo).owner);
  const personal = await data<{ id: string }>(session, '/me/spaces', { method: 'POST', body: JSON.stringify({ name: '日常寶箱', mode: 'PERSONAL_EXPENSES' }) });
  const group = await data<{ id: string }>(session, '/groups', { method: 'POST', body: JSON.stringify({ name: `旅伴 ${testInfo.project.name}`, group_type: 'group', default_currency: 'TWD' }) });
  const shared = await data<{ id: string }>(session, `/groups/${group.id}/spaces`, { method: 'POST', body: JSON.stringify({ name: '旅行分帳', mode: 'SHARED_EXPENSES' }) });
  const pooled = await data<{ id: string; opened_on: string }>(session, `/groups/${group.id}/spaces`, { method: 'POST', body: JSON.stringify({ name: '旅行基金', mode: 'POOLED_FUND' }) });
  await data(session, `/spaces/${pooled.id}/pooled-funds/commitments`, { method: 'POST', body: JSON.stringify({
    request_id: crypto.randomUUID(), version: 1, name: '本期投入', cadence: 'MONTHLY', interval: 1,
    starts_on: pooled.opened_on, ends_on: pooled.opened_on, generate_through: pooled.opened_on, default_amount_minor: '900719925474099300', overrides: [],
  }) });
  await data(session, `/spaces/${pooled.id}/pooled-funds/expenses`, { method: 'POST', body: JSON.stringify({
    request_id: crypto.randomUUID(), amount_minor: '1', occurred_on: pooled.opened_on, title: '基金支付', payment_source: 'FUND_PAID',
  }) });

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: '我的寶箱' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '日常寶箱' })).toBeVisible();
  await expect(page.getByRole('link', { name: /日常寶箱/ })).toHaveAttribute('href', `/app/personal?space=${personal.id}`);
  await expect(page.getByRole('navigation', { name: 'Primary app sections' }).first()).toContainText('任務');
  await expect(page.getByRole('navigation', { name: 'Primary app sections' }).first()).not.toContainText(/Funds|Activity/);
  await assertNoHorizontalOverflow(page);

  await page.goto(`/app?group=${group.id}`);
  await expect(page.getByRole('heading', { name: '旅行分帳' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '旅行基金' })).toBeVisible();
  const quick = page.locator('[data-home-dialogue]').getByRole('button', { name: '記一筆支出' });
  await quick.focus(); await page.keyboard.press('Enter');
  const chooser = page.getByRole('dialog', { name: '要記在哪個寶箱？' });
  await expect(chooser).toBeVisible();
  expect(await chooser.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await expect(chooser.getByRole('link', { name: /旅行分帳/ })).toHaveAttribute('href', `/app/spaces/${shared.id}?quick=1`);
  await expect(chooser.getByRole('link', { name: /旅行基金/ })).toHaveAttribute('href', `/app/spaces/${pooled.id}?quick=1`);
  await page.keyboard.press('Escape'); await expect(quick).toBeFocused();

  await page.goto(`/app/spaces/${pooled.id}`);
  await page.getByRole('link', { name: '記一筆支出' }).click();
  await expect(page).toHaveURL(`/app/spaces/${pooled.id}?quick=1`);
  const pooledDialog = page.getByRole('dialog', { name: '新增基金支出' });
  await expect(pooledDialog).toBeVisible();
  await expect(pooledDialog.getByRole('group', { name: '付款來源' })).toBeVisible();
  await expect(pooledDialog).not.toContainText('分攤');
  await assertNoHorizontalOverflow(page);

  await page.goto('/app/tasks');
  await expect(page.getByRole('heading', { name: '任務中心' })).toBeVisible();
  await expect(page.getByRole('link', { name: /確認本次投入/ })).toHaveAttribute('href', `/app/spaces/${pooled.id}`);
  await expect(page.getByRole('link', { name: /處理資金缺口/ })).toHaveAttribute('href', `/app/spaces/${pooled.id}`);
  await expect(page.getByText(/9,007,199,254,740,993/).first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
