import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { HomeTask, TaskCenter as TaskCenterData } from '@/shared/api/home-contracts';
import { TaskCenter } from './task-center';

afterEach(cleanup);
const spaceId = '00000000-0000-4000-8000-000000000001';
const taskId = '00000000-0000-4000-8000-000000000002';
const labels: Array<[HomeTask['kind'], string]> = [
  ['POOLED_CONTRIBUTION', '確認本次投入'],
  ['POOLED_REIMBURSEMENT_SEND', '確認基金已送出代墊款'],
  ['POOLED_REIMBURSEMENT_RECEIVE', '確認收到代墊款'],
  ['SHARED_TRANSFER_SEND', '確認已送出結算款'],
  ['SHARED_TRANSFER_RECEIVE', '確認收到結算款'],
  ['POOLED_SHORTFALL', '處理資金缺口'],
];

function task(kind: HomeTask['kind'], index: number): HomeTask {
  return {
    id: `${kind}:${taskId.slice(0, -1)}${index}`,
    kind,
    urgency: kind === 'POOLED_CONTRIBUTION' ? 'OVERDUE' : kind === 'POOLED_SHORTFALL' ? 'ATTENTION' : 'ACTION_REQUIRED',
    space: { id: spaceId, name: '旅行寶箱', mode: kind.startsWith('SHARED_') ? 'SHARED_EXPENSES' : 'POOLED_FUND', currency: 'TWD' },
    amount_minor: '900719925474099300', due_on: kind === 'POOLED_CONTRIBUTION' ? '2026-09-01' : null,
    href: `/app/spaces/${spaceId}`,
  };
}

describe('TaskCenter', () => {
  it('renders only actor-actionable task kinds with exact space actions and canonical money', () => {
    const items = labels.map(([kind], index) => task(kind, index + 1));
    const data: TaskCenterData = { items, count: items.length, generated_at: '2026-09-12T07:00:00.000Z' };
    render(<TaskCenter data={data} />);

    for (const [, label] of labels) expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', `/app/spaces/${spaceId}`);
    expect(screen.getAllByText(/9,007,199,254,740,993/).length).toBeGreaterThan(0);
    expect(screen.getByText(/已逾期/)).toBeVisible();
  });

  it('uses a calm empty state without fabricating tasks', () => {
    render(<TaskCenter data={{ items: [], count: 0, generated_at: '2026-09-12T07:00:00.000Z' }} />);
    expect(screen.getByRole('heading', { name: '目前沒有待辦' })).toBeVisible();
    expect(screen.queryByRole('link', { name: /確認|處理/ })).not.toBeInTheDocument();
  });
});
