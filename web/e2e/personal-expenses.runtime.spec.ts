import { expect as baseExpect, test, type Locator } from '@playwright/test';
import { requireBackend, signInWithApiSession, uniqueAccounts } from './fixtures/accounts';
test.use({ actionTimeout: 15_000 });
test.describe.configure({ timeout: 180_000 });
const expect = baseExpect.configure({ timeout: 15_000 });

async function clickHydrated(locator: Locator) {
  await expect.poll(() => locator.evaluate(node => Object.keys(node).some(key => key.startsWith('__reactProps')))).toBe(true);
  await locator.click();
}

test('personal box bookkeeping uses the real backend', async ({ page, context, browser }, testInfo) => {
  test.setTimeout(180_000);
  const base = process.env.MIMIC_API_BASE_URL;
  if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('A local backend is required for personal runtime acceptance');
  await requireBackend();
  const accounts = uniqueAccounts(testInfo);
  const session = await signInWithApiSession(context, accounts.owner);
  await page.goto('/app/personal');
  await expect(page.getByRole('heading', { name: '你的第一個個人寶箱' })).toBeVisible();
  await page.getByRole('button', { name: '新增寶箱', exact: true }).click();
  await page.getByLabel('寶箱名稱').fill('日常生活');
  const createSpaceResponse = page.waitForResponse(response => response.url().endsWith('/api/app/me/spaces') && response.request().method() === 'POST');
  await clickHydrated(page.getByRole('button', { name: '建立個人寶箱', exact: true }));
  expect((await createSpaceResponse).ok()).toBe(true);
  await expect(page).toHaveURL(/space=/);
  await expect(page.getByLabel('目前寶箱')).toHaveValue(/[a-f0-9-]{36}/);
  const spaceId = await page.getByLabel('目前寶箱').inputValue();
  await page.getByRole('button', { name: '記一筆支出', exact: true }).click();
  await page.getByLabel('支出名稱').fill('午餐');
  await page.getByLabel('金額（TWD）').fill('1.25');
  const createExpenseResponse = page.waitForResponse(response => response.url().endsWith(`/spaces/${spaceId}/personal-expenses`) && response.request().method() === 'POST');
  await clickHydrated(page.getByRole('button', { name: '確認記帳', exact: true }));
  const createExpenseResult = await createExpenseResponse;
  expect(createExpenseResult.ok(), `${createExpenseResult.status()} ${await createExpenseResult.text()}`).toBe(true);
  await expect(page.getByTestId('monthly-spending')).toHaveText('$1.25');
  await page.reload();
  await expect(page.getByTestId('monthly-spending')).toHaveText('$1.25');

  await page.getByRole('button', { name: '管理類別與標籤', exact: true }).click();
  await page.getByLabel('新增名稱').fill('工作餐');
  await page.getByRole('button', { name: '新增類別', exact: true }).click();
  await expect(page.getByLabel('管理自訂項目').getByRole('option', { name: '工作餐' })).toHaveCount(1);
  await page.getByLabel('新增名稱').fill('餐費');
  await page.getByRole('button', { name: '新增類別', exact: true }).click();
  await expect(page.getByLabel('管理自訂項目').getByRole('option', { name: '餐費' })).toHaveCount(1);
  await page.getByLabel('項目種類').selectOption('TAG');
  await page.getByLabel('新增名稱').fill('出差');
  await page.getByRole('button', { name: '新增標籤', exact: true }).click();
  await expect(page.getByLabel('管理自訂項目').getByRole('option', { name: '出差' })).toHaveCount(1);
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  await page.getByRole('button', { name: '編輯 午餐', exact: true }).click();
  await page.getByLabel('金額（TWD）').fill('2.00');
  await page.getByRole('combobox', { name: '類別', exact: true }).selectOption({ label: '工作餐' });
  await page.getByLabel('出差', { exact: true }).check();
  await page.getByLabel('備註').fill('私人備註');
  await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog', { name: '編輯支出' }).evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('personal-edit-bottom.png') });
  await page.getByRole('dialog', { name: '編輯支出' }).evaluate(dialog => { dialog.scrollTop = 0; });
  const dialogBox = await page.getByRole('dialog', { name: '編輯支出' }).boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(Math.abs(dialogBox!.x + dialogBox!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  expect(dialogBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height - 32);
  await page.screenshot({ path: testInfo.outputPath('personal-edit.png') });
  await page.getByRole('button', { name: '儲存修改', exact: true }).click();
  await expect(page.getByTestId('monthly-spending')).toHaveText('$2.00');
  await page.getByRole('button', { name: '管理類別與標籤', exact: true }).click();
  await page.getByLabel('管理自訂項目').selectOption({ label: '工作餐' });
  await page.getByLabel('合併至').selectOption({ label: '餐費' });
  await page.getByRole('button', { name: '確認合併', exact: true }).click();
  await expect(page.getByLabel('管理自訂項目').getByRole('option', { name: '工作餐' })).toHaveCount(0);
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  await page.reload();
  await expect(page.locator('.personal-breakdown')).toContainText('餐費');
  await expect(page.getByTestId('monthly-spending')).toHaveText('$2.00');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('personal-month.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const outsider = await browser.newContext();
  try {
    const foreign = await signInWithApiSession(outsider, accounts.partner);
    const denied = await fetch(`${base}/spaces/${spaceId}/personal-expenses?month=2026-09`, { headers: { authorization: `Bearer ${foreign.access_token}` } });
    expect(denied.status).toBe(404);
    expect(await denied.text()).not.toContain('私人備註');
    const vocabulary = await fetch(`${base}/me/taxonomy?kind=CATEGORY`, { headers: { authorization: `Bearer ${foreign.access_token}` } });
    expect(await vocabulary.text()).not.toContain('工作餐');
  } finally { await outsider.close(); }

  await page.getByRole('button', { name: '記一筆支出', exact: true }).click();
  await page.getByLabel('支出名稱').fill('離線咖啡');
  await page.getByLabel('金額（TWD）').fill('10');
  await context.setOffline(true);
  await expect(page.getByRole('button', { name: '確認記帳', exact: true })).toBeDisabled();
  await expect(page.getByText(/目前離線，尚未入帳/)).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await page.getByRole('button', { name: '記一筆支出', exact: true }).click();
  await expect(page.getByText(/未提交草稿/)).toBeVisible();
  await expect(page.getByLabel('支出名稱')).toBeDisabled();
  const month = await page.getByLabel('查看月份').inputValue();
  const unchanged = await fetch(`${base}/spaces/${spaceId}/personal-expenses?month=${month}`, { headers: { authorization: `Bearer ${session.access_token}` } });
  expect((await unchanged.json()).data.spending_minor).toBe('200');
  await page.getByRole('button', { name: '檢視草稿', exact: true }).click();
  await expect(page.getByLabel('支出名稱')).toHaveValue('離線咖啡');
  const occurredOn = await page.getByLabel('支出日期').inputValue();
  const requestId = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(value => value.startsWith('mimic:expense-draft:v1:') && !value.includes(':index:'))!;
    return JSON.parse(localStorage.getItem(key)!).request_id as string;
  });
  await page.getByRole('button', { name: '重新送出草稿', exact: true }).click();
  await expect(page.getByTestId('monthly-spending')).toHaveText('$12.00');
  const replay = await fetch(`${base}/spaces/${spaceId}/personal-expenses`, { method: 'POST', headers: {
    authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json',
  }, body: JSON.stringify({ request_id: requestId, amount_minor: '1000', occurred_on: occurredOn, title: '離線咖啡', note: null, tag_ids: [] }) });
  expect(replay.status).toBe(201);
  const replayed = await replay.json();
  expect(replayed.data.record.title).toBe('離線咖啡');
  const afterReplay = await fetch(`${base}/spaces/${spaceId}/personal-expenses?month=${month}`, { headers: { authorization: `Bearer ${session.access_token}` } });
  expect((await afterReplay.json()).data.items.filter((item: { title: string }) => item.title === '離線咖啡')).toHaveLength(1);
  await page.reload();
  await expect(page.getByTestId('monthly-spending')).toHaveText('$12.00');

  await page.getByRole('button', { name: '記一筆支出', exact: true }).click();
  await page.getByLabel('支出名稱').fill('要丟棄的草稿');
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  await page.getByRole('button', { name: '記一筆支出', exact: true }).click();
  await page.getByRole('button', { name: '丟棄草稿', exact: true }).click();
  await expect(page.getByText(/未提交草稿/)).toHaveCount(0);
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  await page.getByRole('button', { name: '新增寶箱', exact: true }).click();
  await page.getByLabel('寶箱名稱').fill('美元生活');
  await page.getByRole('combobox', { name: '幣別', exact: true }).selectOption('USD');
  await page.getByRole('button', { name: '建立個人寶箱', exact: true }).click();
  await expect(page.getByTestId('monthly-spending')).toHaveText('US$0.00');
  await page.getByLabel('目前寶箱').selectOption(spaceId);
  await expect(page.getByTestId('monthly-spending')).toHaveText('$12.00');
  await page.getByRole('button', { name: '刪除 午餐', exact: true }).click();
  await page.getByRole('button', { name: '確認刪除', exact: true }).click();
  await expect(page.getByTestId('monthly-spending')).toHaveText('$10.00');
  await page.reload();
  await expect(page.getByRole('button', { name: '編輯 午餐', exact: true })).toHaveCount(0);
});
