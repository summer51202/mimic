'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { discardExpenseDraft, listExpenseDrafts, type DraftContext } from './expense-draft';
import { PixelButton } from '../ui/pixel-button';

type Props = Pick<DraftContext, 'actorUserId' | 'groupId' | 'spaceId' | 'mode' | 'spaceVersion'>;

export function BlockedExpenseDrafts(props: Props) {
  const t = useTranslations('drafts');
  const { actorUserId, groupId, mode, spaceId, spaceVersion } = props;
  const context = useMemo(() => ({ actorUserId, groupId, mode, spaceId, spaceVersion, operation: 'CREATE' as const,
    resourceId: null, recordVersion: null, writable: false }), [actorUserId, groupId, mode, spaceId, spaceVersion]);
  const [drafts, setDrafts] = useState<ReturnType<typeof listExpenseDrafts>>([]);
  useEffect(() => {
    let active = true;
    const hydrated = listExpenseDrafts(context);
    queueMicrotask(() => { if (active) setDrafts(hydrated); });
    return () => { active = false; };
  }, [context]);
  if (!drafts.length) return null;
  function discardAll() {
    for (const draft of drafts) discardExpenseDraft({ ...context, operation: draft.operation, resourceId: draft.resource_id,
      recordVersion: draft.record_version, writable: false });
    setDrafts([]);
  }
  return <div role="status" className="draft-recovery">
    <p>{t.rich('blockedCount', { count: drafts.length, countValue: (chunks) => <>{chunks}</> })}</p>
    <PixelButton type="button" emphasis="danger" onClick={discardAll}>{t('discardChestDrafts')}</PixelButton>
  </div>;
}
