import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appFetch } from '@/shared/api/app-fetch';
import { render } from '@/test/render-with-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './home-page';

vi.mock('@/shared/api/app-fetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/app-fetch')>()),
  appFetch: vi.fn(),
}));
afterEach(() => { cleanup(); vi.mocked(appFetch).mockReset(); });
const id = '00000000-0000-4000-8000-000000000001';
const response = { context: { kind: 'PERSONAL' as const }, generated_at: '2026-09-12T00:00:00.000Z', task_count: 2,
  cards: [{ access: 'PARTICIPANT' as const, id, name: '日常', mode: 'PERSONAL_EXPENSES' as const, currency: 'TWD' as const,
    status: 'ACTIVE' as const, month: '2026-09', spending_minor: '9007199254740993', recent_categories: [], recent_activity: [], latest_recorded: null }] };

describe('P6 home', () => {
  it('renders mode-specific meaning without a universal balance', () => {
    render(<HomePage data={response} groups={[]} openQuick={false} />);
    expect(screen.getByRole('heading', { name: '我的寶箱' })).toBeInTheDocument();
    expect(screen.getByText('本月支出')).toBeInTheDocument();
    expect(screen.queryByText(/總餘額|跨寶箱/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2 個待辦/ })).toHaveAttribute('href', '/app/tasks');
  });

  it('does not render an empty task panel', () => {
    render(<HomePage data={{ ...response, task_count: 0 }} groups={[]} openQuick={false} />);
    expect(screen.queryByRole('link', { name: /待辦/ })).not.toBeInTheDocument();
  });
});

describe('Phase Avatar on Home', () => {
  const avatarLayers = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-layer="avatar"]')];

  it('renders no character and no prompt without a class or with an older API', () => {
    const { container } = render(<HomePage data={response} groups={[]} openQuick={false} />);
    expect(avatarLayers(container)).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    cleanup();
    const dismissed = render(<HomePage avatar={{ avatarClass: null, prompt: false }} data={response} groups={[]} openQuick={false} />);
    expect(avatarLayers(dismissed.container)).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stands the chosen class in both scene variants, hidden from assistive tech', () => {
    const { container } = render(<HomePage avatar={{ avatarClass: 'bard', prompt: false }} data={response} groups={[]} openQuick={false} />);
    const layers = avatarLayers(container);
    expect(layers.map((layer) => layer.closest('[data-home-scene]')?.getAttribute('data-home-scene'))).toEqual(['desktop', 'phone']);
    for (const layer of layers) {
      expect(layer.dataset.avatarClass).toBe('bard');
      expect(layer.style.backgroundImage).toContain('/pixel-ui/v1/avatars/bard-full.png');
      expect(layer.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    // layout.json phone slot for bard: x 54, y 247, 84 x 119, depth 366.
    expect(layers[1].style.getPropertyValue('--layer-x')).toBe('54');
    expect(layers[1].style.getPropertyValue('--layer-y')).toBe('247');
    expect(layers[1].style.zIndex).toBe('366');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks once, then shows the chosen class', async () => {
    const user = userEvent.setup();
    vi.mocked(appFetch).mockResolvedValueOnce({ data: { avatar_class: 'warrior' } });
    const { container } = render(<HomePage avatar={{ avatarClass: null, prompt: true }} data={response} groups={[]} openQuick={false} />);

    expect(screen.getByRole('dialog', { name: '選擇你的職業' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '戰士' }));
    await user.click(screen.getByRole('button', { name: '決定' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(avatarLayers(container).map((layer) => layer.dataset.avatarClass)).toEqual(['warrior', 'warrior']);
  });

  it('closes on 之後再說 without a character', async () => {
    const user = userEvent.setup();
    vi.mocked(appFetch).mockResolvedValueOnce({ data: { avatar_class: null, avatar_prompt_dismissed: true } });
    const { container } = render(<HomePage avatar={{ avatarClass: null, prompt: true }} data={response} groups={[]} openQuick={false} />);

    await user.click(screen.getByRole('button', { name: '之後再說' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(avatarLayers(container)).toEqual([]);
  });
});
