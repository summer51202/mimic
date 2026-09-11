import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { SharedSpaceList } from './shared-space-list';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);
const participant = { id: '10000000-0000-4000-8000-000000000001', name: '旅行分帳', access: 'PARTICIPANT' as const,
  mode: 'SHARED_EXPENSES' as const, status: 'ACTIVE' as const, currency: 'TWD', timezone: 'Asia/Taipei', opened_on: '2026-09-01',
  group_id: '10000000-0000-4000-8000-000000000002', owner_user_id: null, role: 'MANAGER' as const, version: 1, first_formal_record_at: null };
const governance = { id: '10000000-0000-4000-8000-000000000003', name: '驚喜派對', access: 'GOVERNANCE' as const,
  mode: 'SHARED_EXPENSES' as const, status: 'ACTIVE' as const };

it('links participants while keeping governor-only metadata private', async () => {
  render(<SharedSpaceList groupId={participant.group_id!} spaces={[participant, governance]} />);
  expect(screen.getByRole('link', { name: /旅行分帳/ })).toHaveAttribute('href', `/app/spaces/${participant.id}`);
  expect(screen.getByText('驚喜派對')).toBeVisible();
  expect(screen.queryByRole('link', { name: /驚喜派對/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/驚喜派對.*TWD/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '建立共同分帳寶箱' }));
  expect(screen.getByRole('dialog', { name: '建立共同分帳寶箱' })).toBeVisible();
});
