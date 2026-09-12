import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { forwardAppRoute } from '@/shared/api/app-route';
import { GET as getHome } from './home/route';
import { GET as getTasks } from './tasks/route';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/app-route', () => ({ forwardAppRoute: vi.fn() }));
const forward = vi.mocked(forwardAppRoute);

beforeEach(() => forward.mockReset());

describe('home and tasks BFF routes', () => {
  it('rejects unknown query fields and malformed UUIDs before forwarding', async () => {
    for (const url of ['http://localhost/api/app/home?expand=private', `http://localhost/api/app/home?group_id=${'a'.repeat(36)}`]) {
      const response = await getHome(new Request(url));
      expect(response.status).toBe(400);
    }
    expect(forward).not.toHaveBeenCalled();
  });

  it('forwards only the allowlisted group context as a no-body read', async () => {
    const response = NextResponse.json({ data: {} });
    forward.mockResolvedValueOnce(response);
    const request = new Request('http://localhost/api/app/home?group_id=00000000-0000-4000-8000-000000000001');
    expect(await getHome(request)).toBe(response);
    expect(forward).toHaveBeenCalledWith(request, '/home?group_id=00000000-0000-4000-8000-000000000001', { body: 'none' });
  });

  it('forwards task reads without accepting client projection controls', async () => {
    const response = NextResponse.json({ data: {} });
    forward.mockResolvedValueOnce(response);
    const request = new Request('http://localhost/api/app/tasks');
    expect(await getTasks(request)).toBe(response);
    expect(forward).toHaveBeenCalledWith(request, '/tasks', { body: 'none' });
  });
});
