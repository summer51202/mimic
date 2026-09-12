import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { PooledSpaceList } from './pooled-space-list';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

const participant = { id: '10000000-0000-4000-8000-000000000001', name: '旅行基金', access: 'PARTICIPANT' as const,
  mode: 'POOLED_FUND' as const, status: 'CLOSING' as const, currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-01',
  group_id: '10000000-0000-4000-8000-000000000002', owner_user_id: null, role: 'MANAGER' as const, version: 3,
  first_formal_record_at: '2026-09-12T01:00:00.000Z' };
const governance = { id: '10000000-0000-4000-8000-000000000003', name: '驚喜金庫', access: 'GOVERNANCE' as const,
  mode: 'POOLED_FUND' as const, status: 'ACTIVE' as const };

it('opens participant pooled boxes while keeping governor-only metadata private', async () => {
  render(<PooledSpaceList groupId={participant.group_id} spaces={[participant, governance]} />);
  expect(screen.getByRole('link', { name: /旅行基金/ })).toHaveAttribute('href', `/app/spaces/${participant.id}`);
  expect(screen.getByText('驚喜金庫')).toBeVisible();
  expect(screen.queryByRole('link', { name: /驚喜金庫/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/驚喜金庫.*TWD/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '建立共同基金寶箱' }));
  expect(screen.getByRole('dialog', { name: '建立共同基金寶箱' })).toBeVisible();
});
