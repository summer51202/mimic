"use client";
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { personalReferenceMutationSchema, type PersonalReferenceMutation } from '@/shared/api/personal-expense-contracts';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';

interface PersonalDestination { id: string; name: string; currency: string }

export function PersonalReferenceForm({ sourceExpenseId, sourceLocked, personalSpaces, personalTags, onSaved, onReload }: {
  sourceExpenseId: string; sourceLocked: boolean; personalSpaces: PersonalDestination[]; personalTags: TaxonomyTerm[];
  onSaved: (result: PersonalReferenceMutation, personalSpaceId: string) => void;
  onReload?: () => Promise<unknown>;
}) {
  const [spaceId, setSpaceId] = useState(personalSpaces[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const attempt = useRef({ fingerprint: '', id: '' });
  const online = useOnline();
  const availableTags = personalTags.filter(tag => tag.kind === 'TAG' && tag.status === 'ACTIVE' && tag.canonical_id === tag.id);

  function toggle(tagId: string) {
    setTags(current => current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!spaceId || !online || busy || conflict) return;
    const payload = { request_id: '', source_expense_id: sourceExpenseId,
      tag_ids: [...tags].sort(), note: note.trim() || null };
    const fingerprint = JSON.stringify({ ...payload, request_id: undefined, personal_space_id: spaceId });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    payload.request_id = attempt.current.id;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/personal-references`, {
        method: 'POST', body: JSON.stringify(payload),
      });
      onSaved(personalReferenceMutationSchema.parse(response.data), spaceId);
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        setConflict(true); setError('這筆支出已加入或資料已變更。重新讀取共同分帳後再確認。');
      } else setError('尚未確認加入。相同內容重試會沿用同一個請求識別，不會建立重複參照。');
    } finally { setBusy(false); }
  }

  async function reload() {
    if (!onReload) return;
    setBusy(true);
    try { await onReload(); setConflict(false); setError(''); }
    catch { setError('重新讀取失敗，私人輸入仍保留。'); }
    finally { setBusy(false); }
  }

  if (!personalSpaces.length) return <div className="personal-reference-empty">
    <p>沒有可用的同幣別個人寶箱。先建立個人寶箱，再回來加入這筆分攤。</p>
    <a className="pixel-link" href="/app/personal">建立個人寶箱</a>
  </div>;

  return <form className="personal-reference-form" onSubmit={submit}>
    <p className="personal-reference-ticket">只連結你的分攤，不會複製共同交易。</p>
    {sourceLocked && <p className="personal-reference-lock">來源期間已永久鎖定；這筆參照會保留已鎖定的共同內容。</p>}
    <label className="pixel-field"><span className="pixel-field__label">加入到</span>
      <select className="pixel-field__input" aria-label="加入到" value={spaceId} onChange={event => { setSpaceId(event.target.value); setConflict(false); }} disabled={busy}>
        {personalSpaces.map(space => <option value={space.id} key={space.id}>{space.name} · {space.currency}</option>)}
      </select></label>
    {availableTags.length > 0 && <fieldset className="personal-reference-tags"><legend>私人標籤</legend>
      {availableTags.map(tag => <label key={tag.id}><input type="checkbox" checked={tags.includes(tag.id)}
        onChange={() => toggle(tag.id)} disabled={busy} />{tag.name}</label>)}
    </fieldset>}
    <PixelField label="私人備註" value={note} onChange={event => { setNote(event.target.value); setConflict(false); }} maxLength={2000}
      description="只有你能在個人帳本看到。" disabled={busy} />
    {!online && <p role="status">目前離線，尚未加入。私人輸入只暫留在這個表單。</p>}
    {error && <p role="alert">{error}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取共同分帳</PixelButton>}
    <PixelButton disabled={busy || !online || conflict}>{busy ? '確認中…' : '加入我的帳本'}</PixelButton>
  </form>;
}
