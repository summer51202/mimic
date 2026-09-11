import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { PersonalBoxForm } from './personal-box-form';
const mocks = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('@/shared/api/app-fetch', () => ({ appFetch: mocks.call }));
it('creates an owner-only personal box without a group id', async () => {
  mocks.call.mockRejectedValue(new Error('network'));
  render(<PersonalBoxForm onCreated={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('寶箱名稱'), '生活');
  await userEvent.click(screen.getByRole('button', { name: '建立個人寶箱' }));
  await waitFor(() => expect(mocks.call).toHaveBeenCalled());
  expect(JSON.parse(mocks.call.mock.calls[0][1].body)).toMatchObject({ name: '生活', mode: 'PERSONAL_EXPENSES', currency: 'TWD' });
  expect(JSON.parse(mocks.call.mock.calls[0][1].body)).not.toHaveProperty('group_id');
  expect(screen.getByLabelText('寶箱名稱')).toHaveValue('生活');
});
