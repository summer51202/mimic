'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FinancialSpace } from '@/shared/api/financial-space-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelFrame } from '@/shared/ui/pixel-frame';
import { PooledSpaceForm } from './pooled-space-form';

export function PooledSpaceList({ groupId, spaces, defaultCurrency = 'TWD' }: {
  groupId: string; spaces: FinancialSpace[]; defaultCurrency?: string;
}) {
  const t = useTranslations('pooled');
  const common = useTranslations('common');
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  return <PixelFrame>
    <div className="pooled-section-heading"><div><p>{t('sharedChests')}</p><h2>{t('fund')}</h2></div>
      <PixelButton type="button" onClick={() => setCreating(true)}>{t('createFundChest')}</PixelButton></div>
    {!spaces.length ? <p>{t('emptyFundList')}</p> : <ul className="pooled-space-list">
      {spaces.map((space) => <li key={space.id}>{space.access === 'PARTICIPANT' ? <Link href={`/app/spaces/${space.id}`}>
        <strong>{space.name}</strong><span>{t.rich('accessSummary', {
          currency: () => <>{space.currency}</>, role: () => <>{space.role === 'MANAGER' ? t('keeper') : t('participant')}</>,
          status: space.status, suffix: chunks => <>{chunks}</>,
        })}</span>
      </Link> : <div><strong>{space.name}</strong><span>{t.rich('governanceSummary', {
        status: () => <>{space.status === 'ARCHIVED' ? t('archived') : t('active')}</>,
      })}</span></div>}</li>)}
    </ul>}
    <PixelDialog open={creating} title={t('createFundChest')} closeLabel={common('close')} onClose={() => setCreating(false)}>
      {creating && <PooledSpaceForm groupId={groupId} defaultCurrency={defaultCurrency} onCreated={(space) => {
        if (space.access === 'PARTICIPANT') router.push(`/app/spaces/${space.id}`);
      }} />}
    </PixelDialog>
  </PixelFrame>;
}
