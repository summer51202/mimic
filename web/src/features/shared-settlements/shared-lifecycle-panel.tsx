"use client";
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import type { FinancialSpace } from '@/shared/api/financial-space-contracts';
import type { Member } from '@/shared/api/domain-contracts';
import type { SharedParticipant } from '@/shared/api/shared-finance-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelField } from '@/shared/ui/pixel-field';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';

type ParticipantSpace = Extract<FinancialSpace, { access: 'PARTICIPANT' }>;

export function SharedLifecyclePanel({ space, currentUserId, participants, members, onChanged }: {
  space: ParticipantSpace; currentUserId: string; participants: SharedParticipant[]; members: Member[]; onChanged: () => void | Promise<void>;
}) {
  const t = useTranslations('settlement.lifecycle');
  const common = useTranslations('common');
  const [selected, setSelected] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const online = useOnline();
  const manager = space.role === 'MANAGER';
  const active = space.status === 'ACTIVE';
  const current = participants.find(person => person.user_id === currentUserId && person.effective_to === null);
  const activeIds = new Set(participants.filter(person => person.effective_to === null).map(person => person.user_id));
  const candidates = members.filter(member => member.status.toLowerCase() === 'active' && !activeIds.has(member.user_id));
  function explain(failure: unknown) {
    if (!(failure instanceof AppClientError)) return t('unconfirmed');
    const messages: Record<string, string> = {
      SPACE_VERSION_CONFLICT: t('spaceChanged'),
      SHARED_BATCH_PENDING: t('pendingTransfers'),
      SHARED_UNSETTLED_POSITION: t('unsettledPosition'),
      SHARED_UNSETTLED_RECORDS: t('unsettledRecords'),
      SPACE_MANAGER_REQUIRED: t('keeperRequired'),
      SPACE_ARCHIVED: t('spaceArchived'),
    };
    return messages[failure.code] ?? t('incomplete');
  }
  async function mutate(path: string, body: object) {
    if (!online || busy) return;
    setBusy(true); setError('');
    try {
      await appFetch(path, { method: path.endsWith('/role') ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      await onChanged();
      if (path.endsWith('/archive')) { setArchiveOpen(false); setConfirmation(''); }
    } catch (failure) {
      setError(explain(failure));
      if (failure instanceof AppClientError && failure.code === 'SPACE_VERSION_CONFLICT') {
        try { await onChanged(); } catch { /* Keep the recovery message and prior confirmed view. */ }
      }
    }
    finally { setBusy(false); }
  }
  return <PixelPanel className="shared-lifecycle"><div className="shared-section-heading"><div><p>{t('eyebrow')}</p><h2>{t('heading')}</h2></div></div>
    {error && <p role="alert">{error}</p>}
    <ul className="shared-participant-list">{participants.filter(person => person.effective_to === null).map(person => <li key={person.id}>
      <span>{t.rich('participantWithRole', {
        name: () => <>{person.display_name}</>, role: () => <>{person.role === 'MANAGER' ? t('keeper') : t('participant')}</>,
      })}</span>
      {active && manager && person.user_id !== currentUserId && <div>
        <PixelButton emphasis="ghost" aria-label={t(person.role === 'MANAGER' ? 'makeParticipantFor' : 'makeKeeperFor', { name: person.display_name })} disabled={busy || !online}
          onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${person.id}/role`, { role: person.role === 'MANAGER' ? 'PARTICIPANT' : 'MANAGER', version: space.version })}>
          {person.role === 'MANAGER' ? t('makeParticipant') : t('makeKeeper')}</PixelButton>
        <PixelButton emphasis="ghost" aria-label={t('endFor', { name: person.display_name })} disabled={busy || !online}
          onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${person.id}/end`, { version: space.version })}>{t('end')}</PixelButton>
      </div>}
    </li>)}</ul>
    {active && manager && candidates.length > 0 && <div className="shared-add-participant"><label className="pixel-field">{t('add')}<select aria-label={t('add')} className="pixel-field__input" value={selected} onChange={event => setSelected(event.target.value)}>
      <option value="">{t('selectMember')}</option>{candidates.map(member => <option key={member.user_id} value={member.user_id}>{t.rich('memberOption', {
        name: () => <>{member.display_name}</>, mimicId: () => <>{member.mimic_id}</>,
      })}</option>)}
    </select></label><PixelButton disabled={!selected || busy || !online} onClick={() => void mutate(`/api/app/spaces/${space.id}/participants`, { user_id: selected, version: space.version })}>{t('addToChest')}</PixelButton></div>}
    {active && current && <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${current.id}/end`, { version: space.version })}>{t('leave')}</PixelButton>}
    {active && manager && <PixelButton emphasis="danger" disabled={busy || !online} onClick={() => setArchiveOpen(true)}>{t('archive')}</PixelButton>}
    <PixelDialog open={archiveOpen} title={t('archive')} closeLabel={common('close')} closeDisabled={busy} onClose={() => { setArchiveOpen(false); setConfirmation(''); }}>
      <p>{t('archiveRequirements')}</p>
      <PixelField label={t('confirmName')} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" />
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" disabled={busy || !online || confirmation !== space.name}
        onClick={() => void mutate(`/api/app/spaces/${space.id}/archive`, { version: space.version })}>{t('confirmArchive')}</PixelButton>
    </PixelDialog>
  </PixelPanel>;
}
