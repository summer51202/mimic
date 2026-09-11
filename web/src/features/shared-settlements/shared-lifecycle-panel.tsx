"use client";
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
    if (!(failure instanceof AppClientError)) return '操作結果尚未確認。請重新讀取後再試。';
    const messages: Record<string, string> = {
      SPACE_VERSION_CONFLICT: '寶箱參與者或狀態已變更。請重新讀取；你選擇的對象仍保留。',
      SHARED_BATCH_PENDING: '仍有未完成的結算轉帳，請先完成批次。',
      SHARED_UNSETTLED_POSITION: '仍有未結清位置，請先完成結算。',
      SHARED_UNSETTLED_RECORDS: '最新期間仍有尚未納入完成批次的支出或更正。',
      SPACE_MANAGER_REQUIRED: '寶箱必須保留至少一位有效管理者。',
      SPACE_ARCHIVED: '寶箱已封存，不能再變更參與者。',
    };
    return messages[failure.code] ?? '目前不能完成此操作，請重新讀取並檢查結算狀態。';
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
  return <PixelPanel className="shared-lifecycle"><div className="shared-section-heading"><div><p>PARTICIPANTS & CLOSURE</p><h2>參與者與封存</h2></div></div>
    {error && <p role="alert">{error}</p>}
    <ul className="shared-participant-list">{participants.filter(person => person.effective_to === null).map(person => <li key={person.id}>
      <span>{person.display_name} · {person.role === 'MANAGER' ? '管理者' : '參與者'}</span>
      {active && manager && person.user_id !== currentUserId && <div>
        <PixelButton emphasis="ghost" aria-label={`${person.role === 'MANAGER' ? '改為參與者' : '設為管理者'}－${person.display_name}`} disabled={busy || !online}
          onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${person.id}/role`, { role: person.role === 'MANAGER' ? 'PARTICIPANT' : 'MANAGER', version: space.version })}>
          {person.role === 'MANAGER' ? '改為參與者' : '設為管理者'}</PixelButton>
        <PixelButton emphasis="ghost" aria-label={`結束參與－${person.display_name}`} disabled={busy || !online}
          onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${person.id}/end`, { version: space.version })}>結束參與</PixelButton>
      </div>}
    </li>)}</ul>
    {active && manager && candidates.length > 0 && <div className="shared-add-participant"><label className="pixel-field">加入參與者<select aria-label="加入參與者" className="pixel-field__input" value={selected} onChange={event => setSelected(event.target.value)}>
      <option value="">選擇群組成員</option>{candidates.map(member => <option key={member.user_id} value={member.user_id}>{member.display_name} · {member.mimic_id}</option>)}
    </select></label><PixelButton disabled={!selected || busy || !online} onClick={() => void mutate(`/api/app/spaces/${space.id}/participants`, { user_id: selected, version: space.version })}>加入寶箱</PixelButton></div>}
    {active && current && <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void mutate(`/api/app/spaces/${space.id}/participants/${current.id}/end`, { version: space.version })}>離開這個寶箱</PixelButton>}
    {active && manager && <PixelButton emphasis="danger" disabled={busy || !online} onClick={() => setArchiveOpen(true)}>封存共同分帳寶箱</PixelButton>}
    <PixelDialog open={archiveOpen} title="封存共同分帳寶箱" closeLabel="關閉" closeDisabled={busy} onClose={() => { setArchiveOpen(false); setConfirmation(''); }}>
      <p>只有所有批次完成、位置為零，且最後完成期間後沒有未結案支出或更正時才能封存。歷史稽核仍保留。</p>
      <PixelField label="輸入寶箱名稱確認" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" />
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" disabled={busy || !online || confirmation !== space.name}
        onClick={() => void mutate(`/api/app/spaces/${space.id}/archive`, { version: space.version })}>確認封存</PixelButton>
    </PixelDialog>
  </PixelPanel>;
}
