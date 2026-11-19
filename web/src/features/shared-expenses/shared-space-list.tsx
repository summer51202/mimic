"use client";
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FinancialSpace } from '@/shared/api/financial-space-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelFrame } from '@/shared/ui/pixel-frame';
import { SharedSpaceForm } from './shared-space-form';

export function SharedSpaceList({ groupId, spaces, defaultCurrency = 'TWD' }: {
  groupId: string; spaces: FinancialSpace[]; defaultCurrency?: string;
}) {
  const t = useTranslations();
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  return <PixelFrame>
    <div className="shared-section-heading"><div><p>{t('shared.space.eyebrow')}</p><h2>{t('common.mode.SHARED_EXPENSES')}</h2></div>
      <PixelButton onClick={() => setCreating(true)}>{t('shared.space.create')}</PixelButton></div>
    {!spaces.length ? <p>{t('shared.space.empty')}</p> : <ul className="shared-space-list">
      {spaces.map(space => <li key={space.id}>
        {space.access === 'PARTICIPANT' ? <Link href={`/app/spaces/${space.id}`}>
          <strong>{space.name}</strong><span>{t.rich(space.status === 'ARCHIVED' ? 'shared.space.archivedInfo' : 'shared.space.participantInfo', {
            currency: () => <>{space.currency}</>,
            role: () => <>{t(space.role === 'MANAGER' ? 'common.keeper' : 'common.participant')}</>,
            suffix: chunks => <>{chunks}</>,
          })}</span>
        </Link> : <div><strong>{space.name}</strong><span>{t.rich('shared.space.governanceInfo', {
          status: () => <>{t(space.status === 'ARCHIVED' ? 'shared.space.archived' : 'shared.space.inUse')}</>,
        })}</span></div>}
      </li>)}
    </ul>}
    <PixelDialog open={creating} title={t('shared.space.create')} closeLabel={t('common.close')} onClose={() => setCreating(false)}>
      {creating && <SharedSpaceForm groupId={groupId} defaultCurrency={defaultCurrency} onCreated={space => {
        if (space.access === 'PARTICIPANT') router.push(`/app/spaces/${space.id}`);
      }} />}
    </PixelDialog>
  </PixelFrame>;
}
