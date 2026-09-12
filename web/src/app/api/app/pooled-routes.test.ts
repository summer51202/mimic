import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedApi } from '@/shared/api/authenticated-api';
import { hasValidCsrf } from '@/shared/auth/session';
import { ApiError } from '@/shared/api/errors';
import { GET as workspace } from './spaces/[spaceId]/pooled-funds/workspace/route';
import { POST as createCommitment } from './spaces/[spaceId]/pooled-funds/commitments/route';
import { PATCH as updateCommitment } from './spaces/[spaceId]/pooled-funds/commitments/[commitmentId]/route';
import { POST as confirm } from './spaces/[spaceId]/pooled-funds/occurrences/[occurrenceId]/confirm/route';
import { POST as skip } from './spaces/[spaceId]/pooled-funds/occurrences/[occurrenceId]/skip/route';
import { POST as cancel } from './spaces/[spaceId]/pooled-funds/occurrences/[occurrenceId]/cancel/route';
import { POST as createExpense } from './spaces/[spaceId]/pooled-funds/expenses/route';
import { PATCH as updateExpense } from './spaces/[spaceId]/pooled-funds/expenses/[expenseId]/route';
import { POST as deleteExpense } from './spaces/[spaceId]/pooled-funds/expenses/[expenseId]/delete/route';
import { POST as sendReimbursement } from './spaces/[spaceId]/pooled-funds/reimbursements/[reimbursementId]/sent/route';
import { POST as receiveReimbursement } from './spaces/[spaceId]/pooled-funds/reimbursements/[reimbursementId]/received/route';
import { POST as correction } from './spaces/[spaceId]/pooled-funds/corrections/route';
import { POST as closing } from './spaces/[spaceId]/pooled-funds/closing/route';
import { POST as returnPlan } from './spaces/[spaceId]/pooled-funds/return-plans/route';
import { POST as sendReturn } from './spaces/[spaceId]/pooled-funds/returns/[returnId]/sent/route';
import { POST as receiveReturn } from './spaces/[spaceId]/pooled-funds/returns/[returnId]/received/route';
import { POST as archive } from './spaces/[spaceId]/pooled-funds/archive/route';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/authenticated-api', () => ({ authenticatedApi: vi.fn() }));
vi.mock('@/shared/auth/session', () => ({ hasValidCsrf: vi.fn() }));

const spaceId = '10000000-0000-4000-8000-000000000001';
const resourceId = '10000000-0000-4000-8000-000000000002';
const requestId = '10000000-0000-4000-8000-000000000003';
const body = { request_id: requestId, version: 1, amount_minor: '9007199254740993' };
type Handler = (request: Request, context: never) => Promise<Response>;

beforeEach(() => {
  vi.mocked(authenticatedApi).mockReset().mockResolvedValue({ ok: true });
  vi.mocked(hasValidCsrf).mockReturnValue(true);
});

describe('pooled finance BFF routes', () => {
  it('forwards every route to its exact upstream path without coercing money or request UUIDs', async () => {
    const cases: Array<[Handler, string, Record<string, string>, string]> = [
      [createCommitment, 'POST', { spaceId }, `/spaces/${spaceId}/pooled-funds/commitments`],
      [updateCommitment, 'PATCH', { spaceId, commitmentId: resourceId }, `/spaces/${spaceId}/pooled-funds/commitments/${resourceId}`],
      [confirm, 'POST', { spaceId, occurrenceId: resourceId }, `/spaces/${spaceId}/pooled-funds/occurrences/${resourceId}/confirm`],
      [skip, 'POST', { spaceId, occurrenceId: resourceId }, `/spaces/${spaceId}/pooled-funds/occurrences/${resourceId}/skip`],
      [cancel, 'POST', { spaceId, occurrenceId: resourceId }, `/spaces/${spaceId}/pooled-funds/occurrences/${resourceId}/cancel`],
      [createExpense, 'POST', { spaceId }, `/spaces/${spaceId}/pooled-funds/expenses`],
      [updateExpense, 'PATCH', { spaceId, expenseId: resourceId }, `/spaces/${spaceId}/pooled-funds/expenses/${resourceId}`],
      [deleteExpense, 'POST', { spaceId, expenseId: resourceId }, `/spaces/${spaceId}/pooled-funds/expenses/${resourceId}/delete`],
      [sendReimbursement, 'POST', { spaceId, reimbursementId: resourceId }, `/spaces/${spaceId}/pooled-funds/reimbursements/${resourceId}/sent`],
      [receiveReimbursement, 'POST', { spaceId, reimbursementId: resourceId }, `/spaces/${spaceId}/pooled-funds/reimbursements/${resourceId}/received`],
      [correction, 'POST', { spaceId }, `/spaces/${spaceId}/pooled-funds/corrections`],
      [closing, 'POST', { spaceId }, `/spaces/${spaceId}/pooled-funds/closing`],
      [returnPlan, 'POST', { spaceId }, `/spaces/${spaceId}/pooled-funds/return-plans`],
      [sendReturn, 'POST', { spaceId, returnId: resourceId }, `/spaces/${spaceId}/pooled-funds/returns/${resourceId}/sent`],
      [receiveReturn, 'POST', { spaceId, returnId: resourceId }, `/spaces/${spaceId}/pooled-funds/returns/${resourceId}/received`],
      [archive, 'POST', { spaceId }, `/spaces/${spaceId}/pooled-funds/archive`],
    ];
    for (const [handler, method, params, path] of cases) {
      const request = new Request('http://localhost/api/app', { method, body: JSON.stringify(body) });
      await handler(request, { params: Promise.resolve(params) } as never);
      expect(authenticatedApi).toHaveBeenLastCalledWith(request, path, { method, body });
    }
  });

  it('forwards workspace reads without query parameters and rejects malformed UUID paths', async () => {
    const request = new Request('http://localhost/api/app');
    await workspace(request, { params: Promise.resolve({ spaceId }) });
    expect(authenticatedApi).toHaveBeenCalledWith(request, `/spaces/${spaceId}/pooled-funds/workspace`, { method: 'GET' });
    expect((await workspace(new Request('http://localhost?cursor=x'), { params: Promise.resolve({ spaceId }) })).status).toBe(400);
    const invalid = new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
    expect((await sendReturn(invalid, { params: Promise.resolve({ spaceId, returnId: 'bad/id' }) })).status).toBe(400);
  });

  it('preserves retry keys and propagates upstream stale/idempotency errors', async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const request = new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
      await closing(request, { params: Promise.resolve({ spaceId }) });
    }
    expect(vi.mocked(authenticatedApi).mock.calls.slice(-2).map((call) => call[2])).toEqual([
      { method: 'POST', body }, { method: 'POST', body },
    ]);
    vi.mocked(authenticatedApi).mockRejectedValueOnce(new ApiError(409, 'SPACE_VERSION_CONFLICT'));
    const stale = await closing(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }),
      { params: Promise.resolve({ spaceId }) });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: { code: 'SPACE_VERSION_CONFLICT' } });
  });

  it('requires CSRF before any pooled mutation is forwarded', async () => {
    vi.mocked(hasValidCsrf).mockReturnValue(false);
    const denied = await closing(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }),
      { params: Promise.resolve({ spaceId }) });
    expect(denied.status).toBe(403);
    expect(authenticatedApi).not.toHaveBeenCalled();
  });
});
