import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedApi } from '@/shared/api/authenticated-api';
import { hasValidCsrf } from '@/shared/auth/session';
import { POST as createReference } from './spaces/[spaceId]/personal-references/route';
import { PATCH as updateReference } from './spaces/[spaceId]/personal-references/[referenceId]/route';
import { POST as removeReference } from './spaces/[spaceId]/personal-references/[referenceId]/remove/route';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/authenticated-api', () => ({ authenticatedApi: vi.fn() }));
vi.mock('@/shared/auth/session', () => ({ hasValidCsrf: vi.fn() }));

const spaceId = '10000000-0000-4000-8000-000000000001';
const referenceId = '10000000-0000-4000-8000-000000000002';
const sourceId = '10000000-0000-4000-8000-000000000003';

beforeEach(() => {
  vi.mocked(authenticatedApi).mockReset().mockResolvedValue({ ok: true });
  vi.mocked(hasValidCsrf).mockReturnValue(true);
});

describe('private reference BFF routes', () => {
  it('forwards create, update, and remove bodies without money coercion', async () => {
    const createBody = { request_id: referenceId, source_expense_id: sourceId, note: 'private' };
    const createRequest = new Request('http://localhost/api/app', { method: 'POST', body: JSON.stringify(createBody) });
    await createReference(createRequest, { params: Promise.resolve({ spaceId }) });
    expect(authenticatedApi).toHaveBeenCalledWith(createRequest, `/spaces/${spaceId}/personal-references`,
      { method: 'POST', body: createBody });

    const updateBody = { request_id: sourceId, version: 2, tag_ids: [] };
    const updateRequest = new Request('http://localhost/api/app', { method: 'PATCH', body: JSON.stringify(updateBody) });
    await updateReference(updateRequest, { params: Promise.resolve({ spaceId, referenceId }) });
    expect(authenticatedApi).toHaveBeenCalledWith(updateRequest,
      `/spaces/${spaceId}/personal-references/${referenceId}`, { method: 'PATCH', body: updateBody });

    const removeRequest = new Request('http://localhost/api/app', { method: 'POST', body: JSON.stringify(updateBody) });
    await removeReference(removeRequest, { params: Promise.resolve({ spaceId, referenceId }) });
    expect(authenticatedApi).toHaveBeenCalledWith(removeRequest,
      `/spaces/${spaceId}/personal-references/${referenceId}/remove`, { method: 'POST', body: updateBody });
  });

  it('rejects malformed nested ids, invalid JSON, and missing CSRF before forwarding', async () => {
    const request = new Request('http://localhost', { method: 'POST', body: '{}' });
    expect((await removeReference(request, { params: Promise.resolve({ spaceId, referenceId: 'bad/id' }) })).status).toBe(400);
    vi.mocked(hasValidCsrf).mockReturnValueOnce(false);
    expect((await createReference(request, { params: Promise.resolve({ spaceId }) })).status).toBe(403);
    expect((await createReference(new Request('http://localhost', { method: 'POST', body: 'bad' }),
      { params: Promise.resolve({ spaceId }) })).status).toBe(400);
    expect(authenticatedApi).not.toHaveBeenCalled();
  });
});
