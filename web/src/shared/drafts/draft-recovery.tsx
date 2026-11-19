'use client';

import { useTranslations } from 'next-intl';
import type { DraftLoadResult } from './expense-draft';
import { PixelButton } from '@/shared/ui/pixel-button';

export function DraftRecovery({ load, reviewed, onReview, onDiscard }: {
  load: DraftLoadResult;
  reviewed: boolean;
  onReview: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations('drafts');
  if (load.state === 'MISSING') return null;
  if (load.state === 'CORRUPT') {
    return <div role="alert" className="draft-recovery">
      <p>{t('corrupt')}</p>
      <PixelButton type="button" emphasis="danger" onClick={onDiscard}>{t('discard')}</PixelButton>
    </div>;
  }
  if (load.state === 'BLOCKED') {
    return <div role="status" className="draft-recovery">
      <p>{t('blocked')}</p>
      <PixelButton type="button" emphasis="danger" onClick={onDiscard}>{t('discard')}</PixelButton>
    </div>;
  }
  return <div role="status" className="draft-recovery">
    <p>{t(load.state === 'STALE' ? 'stale' : reviewed ? 'reviewed' : 'found')}</p>
    {!reviewed && <PixelButton type="button" emphasis="secondary" onClick={onReview}>{t('review')}</PixelButton>}
    <PixelButton type="button" emphasis="danger" onClick={onDiscard}>{t('discard')}</PixelButton>
  </div>;
}
