'use client';

import { useCallback, useState } from 'react';
import {
  discardExpenseDraft,
  loadExpenseDraft,
  saveExpenseDraft,
  type DraftContext,
  type DraftLoadResult,
  type ExpenseDraftPayload,
} from './expense-draft';

export function useExpenseDraft(context: DraftContext) {
  const [load, setLoad] = useState<DraftLoadResult>(() => loadExpenseDraft(context));
  const [reviewed, setReviewed] = useState(false);
  const [storageError, setStorageError] = useState(false);

  const persist = useCallback((payload: ExpenseDraftPayload) => {
    const result = saveExpenseDraft(context, payload);
    setStorageError(!result.ok);
    if (result.ok) {
      setLoad((current) => current.state === 'MISSING' ? current : loadExpenseDraft(context));
      return result.draft;
    }
    return undefined;
  }, [context]);

  const review = useCallback(() => {
    if (load.state !== 'READY' && load.state !== 'STALE') return undefined;
    setReviewed(true);
    return load.draft.payload;
  }, [load]);

  const discard = useCallback(() => {
    discardExpenseDraft(context);
    setLoad({ state: 'MISSING' });
    setReviewed(false);
    setStorageError(false);
  }, [context]);

  return { load, reviewed, storageError, persist, review, discard };
}
