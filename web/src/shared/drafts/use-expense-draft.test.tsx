import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveExpenseDraft, type DraftContext, type PersonalExpenseDraftPayload } from './expense-draft';
import { DraftRecovery } from './draft-recovery';
import { useExpenseDraft } from './use-expense-draft';

const context: DraftContext = {
  actorUserId: '00000000-0000-4000-8000-000000000001',
  groupId: null,
  spaceId: '00000000-0000-4000-8000-000000000002',
  mode: 'PERSONAL_EXPENSES',
  operation: 'CREATE',
  resourceId: null,
  spaceVersion: 1,
  recordVersion: null,
  writable: true,
};
const payload: PersonalExpenseDraftPayload = {
  title: '早餐', amount: '100', occurred_on: '2026-09-12', note: '', category_id: '', tag_ids: [],
};

function Harness({ onReview = vi.fn() }: { onReview?: (value: PersonalExpenseDraftPayload) => void }) {
  const draft = useExpenseDraft(context);
  return <>
    <button onClick={() => draft.persist(payload)}>save</button>
    <button onClick={() => {
      const value = draft.review();
      if (value) onReview(value as PersonalExpenseDraftPayload);
    }}>review</button>
    <button onClick={draft.discard}>discard</button>
    <output>{draft.load.state}:{draft.storageError ? 'error' : 'ok'}:{draft.reviewed ? 'reviewed' : 'pending'}</output>
    <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={() => {
      const value = draft.review();
      if (value) onReview(value as PersonalExpenseDraftPayload);
    }} onDiscard={draft.discard} />
  </>;
}

describe('expense draft recovery', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it('does not restore or submit when connectivity returns', () => {
    saveExpenseDraft(context, payload);
    const review = vi.fn();
    render(<Harness onReview={review} />);
    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(review).not.toHaveBeenCalled();
    expect(screen.getByText('READY:ok:pending')).toBeInTheDocument();
  });

  it('requires explicit review and offers exact discard', () => {
    saveExpenseDraft(context, payload);
    const review = vi.fn();
    render(<Harness onReview={review} />);
    fireEvent.click(screen.getByRole('button', { name: '檢視草稿' }));
    expect(review).toHaveBeenCalledWith(payload);
    expect(screen.getByText('READY:ok:reviewed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '丟棄草稿' }));
    expect(screen.getByText('MISSING:ok:pending')).toBeInTheDocument();
  });

  it('shows stale and blocked drafts without claiming submission', () => {
    saveExpenseDraft(context, payload);
    const stale = render(<Harness />);
    stale.unmount();
    const staleContext = { ...context, spaceVersion: 2 };
    function Stale() {
      const draft = useExpenseDraft(staleContext);
      return <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={draft.review} onDiscard={draft.discard} />;
    }
    const view = render(<Stale />);
    expect(screen.getByText(/伺服器狀態已有變更/)).toBeInTheDocument();
    view.unmount();
    function Blocked() {
      const draft = useExpenseDraft({ ...context, writable: false });
      return <DraftRecovery load={draft.load} reviewed={draft.reviewed} onReview={draft.review} onDiscard={draft.discard} />;
    }
    render(<Blocked />);
    expect(screen.queryByRole('button', { name: '檢視草稿' })).not.toBeInTheDocument();
    expect(screen.getByText(/目前不可寫入/)).toBeInTheDocument();
  });

  it('reports storage failures instead of promising a durable save', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota'); });
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(screen.getByText('MISSING:error:pending')).toBeInTheDocument();
    spy.mockRestore();
  });
});
