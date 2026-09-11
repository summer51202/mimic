"use client";
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import {
  personalReferenceMutationSchema,
  type PersonalReferenceEntry,
  type PersonalReferenceMutation,
} from '@/shared/api/personal-expense-contracts';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from './use-online';

export function PersonalReferenceForm({ spaceId, reference, terms, onSaved, onReload }: {
  spaceId: string;
  reference: PersonalReferenceEntry;
  terms: TaxonomyTerm[];
  onSaved: (result: PersonalReferenceMutation) => void;
  onReload?: () => Promise<PersonalReferenceEntry | undefined>;
}) {
  const [note, setNote] = useState(reference.note ?? '');
  const [tags, setTags] = useState(reference.tag_ids);
  const [version, setVersion] = useState(reference.version);
  const [latest, setLatest] = useState<PersonalReferenceEntry>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const attempt = useRef({ fingerprint: '', id: '' });
  const online = useOnline();
  const availableTags = terms.filter(term => term.kind === 'TAG' && term.status === 'ACTIVE' && term.canonical_id === term.id);

  function toggle(tagId: string) {
    setTags(current => current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId]);
    setConflict(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy || conflict) return;
    const payload = { version, note: note.trim() || null, tag_ids: [...tags].sort() };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/personal-references/${reference.id}`, {
        method: 'PATCH', body: JSON.stringify({ ...payload, request_id: attempt.current.id }),
      });
      onSaved(personalReferenceMutationSchema.parse(response.data));
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        setConflict(true);
        setError('資料版本已變更。重新讀取最新資料並比較後再儲存；你的私人輸入仍保留。');
      } else {
        setError('尚未確認儲存。相同內容重試會沿用同一個請求識別，不會重複修改。');
      }
    } finally { setBusy(false); }
  }

  async function reload() {
    if (!onReload || busy) return;
    setBusy(true);
    try {
      const refreshed = await onReload();
      if (!refreshed) {
        setError('這筆私人參照已不在目前清單。你的輸入仍保留，請關閉後檢查。');
        return;
      }
      setLatest(refreshed); setVersion(refreshed.version); setConflict(false); setError('');
    } catch { setError('重新讀取失敗，私人輸入仍保留。請稍後再試。'); }
    finally { setBusy(false); }
  }

  return <form className="personal-reference-form" onSubmit={submit}>
    <p className="personal-reference-ticket">共同交易的金額、日期、付款與分攤維持唯讀；這裡只整理你的私人資訊。</p>
    {reference.source_locked && <p className="personal-reference-lock">來源已鎖定。若需修正共同交易，請在共同分帳建立新一期更正。</p>}
    {availableTags.length > 0 && <fieldset className="personal-reference-tags"><legend>私人標籤</legend>
      {availableTags.map(tag => <label key={tag.id}><input type="checkbox" checked={tags.includes(tag.id)} onChange={() => toggle(tag.id)} disabled={busy} />{tag.name}</label>)}
    </fieldset>}
    <PixelField label="私人備註" value={note} onChange={event => { setNote(event.target.value); setConflict(false); }} maxLength={2000} disabled={busy}
      description="只有你能在個人帳本看到。" />
    {!online && <p role="status">目前離線，尚未儲存。私人輸入只暫留在這個表單。</p>}
    {error && <p role="alert">{error}</p>}
    {latest && <p role="status">最新私人資訊：{latest.note ? `「${latest.note}」` : '沒有備註'}。上方仍保留你的輸入，請比較後再儲存。</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取最新資料</PixelButton>}
    <PixelButton type="submit" disabled={busy || !online || conflict}>{busy ? '確認中…' : '儲存私人資訊'}</PixelButton>
  </form>;
}
