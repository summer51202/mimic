"use client";
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { sharedExpenseMutationSchema, type SharedExpense, type SharedExpenseMutation, type SharedParticipant } from '@/shared/api/shared-finance-contracts';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { TaxonomyPicker } from '../taxonomy/taxonomy-picker';
import { useOnline } from '../personal-expenses/use-online';
import { equalAllocations, sumMinor } from './shared-money';

function today(timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
function majorFromMinor(value: string, currency: string) {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0;
  const raw = value.padStart(digits + 1, '0');
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}
function valuesFrom(rows: SharedExpense['payers'] | SharedExpense['allocations'], currency: string) {
  return Object.fromEntries(rows.map(row => [row.user_id, majorFromMinor(row.amount_minor, currency)]));
}

export function SharedExpenseForm({ spaceId, currency, timezone, currentUserId, participants, terms, record, lockKind, onSaved, onReload, onCorrection }: {
  spaceId: string; currency: string; timezone: string; currentUserId: string; participants: SharedParticipant[]; terms: TaxonomyTerm[];
  record?: SharedExpense; onSaved: (result: SharedExpenseMutation) => void; onReload?: () => Promise<SharedExpense | undefined>;
  lockKind?: 'PENDING' | 'PERMANENT';
  onCorrection?: (record: SharedExpense) => void;
}) {
  const [title, setTitle] = useState(record?.title ?? '');
  const [amount, setAmount] = useState(record ? majorFromMinor(record.amount_minor, currency) : '');
  const [date, setDate] = useState(record?.occurred_on ?? today(timezone));
  const [note, setNote] = useState(record?.note ?? '');
  const [category, setCategory] = useState(record?.category_id ?? '');
  const [tags, setTags] = useState(record?.tag_ids ?? []);
  const [payerIds, setPayerIds] = useState(record?.payers.map(row => row.user_id) ?? [currentUserId]);
  const [payerValues, setPayerValues] = useState(record ? valuesFrom(record.payers, currency) : {});
  const [allocationMode, setAllocationMode] = useState<'EQUAL' | 'FIXED'>(record ? 'FIXED' : 'EQUAL');
  const [allocationIds, setAllocationIds] = useState(record?.allocations.map(row => row.user_id) ?? participants.map(row => row.user_id));
  const [allocationValues, setAllocationValues] = useState(record ? valuesFrom(record.allocations, currency) : {});
  const [version, setVersion] = useState(record?.version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [locked, setLocked] = useState(false);
  const online = useOnline();
  const attempt = useRef({ fingerprint: '', id: '' });
  const eligible = participants.filter(row => row.effective_to === null && row.effective_from <= date);
  function toggle(id: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(id) ? values.filter(value => value !== id) : [...values, id]);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy || conflict) return;
    setError(''); setLocked(false);
    try {
      const amount_minor = majorToMinorString(amount, currency);
      const payers = payerIds.sort().map(user_id => ({ user_id, amount_minor: majorToMinorString(
        payerIds.length === 1 && !payerValues[user_id] ? amount : payerValues[user_id] ?? '', currency) }));
      const allocations = allocationMode === 'EQUAL' ? equalAllocations(amount_minor, allocationIds)
        : allocationIds.sort().map(user_id => ({ user_id, amount_minor: majorToMinorString(allocationValues[user_id] ?? '', currency) }));
      if (!payers.length || !allocations.length || sumMinor(payers.map(row => row.amount_minor)) !== amount_minor || sumMinor(allocations.map(row => row.amount_minor)) !== amount_minor) {
        throw new Error('SHARED_TOTAL_MISMATCH');
      }
      const payload = { request_id: '', amount_minor, occurred_on: date, title: title.trim(), note: note.trim() || null,
        ...(category ? { category_id: category } : {}), tag_ids: [...tags].sort(), payers, allocations, ...(record ? { version } : {}) };
      const fingerprint = JSON.stringify({ ...payload, request_id: undefined });
      if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
      payload.request_id = attempt.current.id;
      setBusy(true);
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/shared-expenses${record ? `/${record.id}` : ''}`, {
        method: record ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      });
      onSaved(sharedExpenseMutationSchema.parse(response.data));
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        if (failure.code === 'SHARED_PERIOD_LOCKED') {
          setLocked(true); setError(lockKind === 'PENDING'
            ? '進行中的結算批次暫時鎖定這個期間。付款前可由管理者取消；否則請完成批次。'
            : '這個期間已永久鎖定，原紀錄不能再改寫。請在下一個開放期間建立更正。');
        } else {
          setConflict(true); setError('資料版本已變更。請重新讀取最新內容；目前輸入仍保留。');
        }
      } else if (failure instanceof Error && failure.message === 'SHARED_TOTAL_MISMATCH') {
        setError('付款金額與分攤金額都必須分別等於總金額。');
      } else setError('尚未確認入帳。相同內容重試會沿用同一個請求識別，不會重複記帳。');
    } finally { setBusy(false); }
  }
  async function refreshVersion() {
    if (!onReload) return;
    setBusy(true);
    try { const latest = await onReload(); setVersion(latest?.version); setConflict(false); setError(''); }
    catch { setError('重新讀取失敗，輸入仍保留。'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="shared-form">
    <PixelField label="支出名稱" value={title} onChange={event => setTitle(event.target.value)} required maxLength={200} disabled={busy} />
    <PixelField label={`總金額（${currency}）`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required disabled={busy} />
    <PixelField label="支出日期" type="date" value={date} max={today(timezone)} onChange={event => setDate(event.target.value)} required disabled={busy} />
    <fieldset><legend>誰先付款</legend>{eligible.map(person => <div className="shared-amount-row" key={person.user_id}>
      <label><input type="checkbox" aria-label={`付款人－${person.display_name}`} checked={payerIds.includes(person.user_id)} onChange={() => toggle(person.user_id, payerIds, setPayerIds)} />{person.display_name}</label>
      {payerIds.includes(person.user_id) && <PixelField label={`付款金額－${person.display_name}`} inputMode="decimal" value={payerValues[person.user_id] ?? ''}
        placeholder={payerIds.length === 1 ? amount : ''} onChange={event => setPayerValues({ ...payerValues, [person.user_id]: event.target.value })} />}
    </div>)}</fieldset>
    <fieldset><legend>如何分攤</legend><label className="pixel-field">分攤方式<select aria-label="分攤方式" className="pixel-field__input" value={allocationMode} onChange={event => setAllocationMode(event.target.value as 'EQUAL' | 'FIXED')}>
      <option value="EQUAL">平均分攤</option><option value="FIXED">指定金額</option></select></label>
      {eligible.map(person => <div className="shared-amount-row" key={person.user_id}>
        <label><input type="checkbox" aria-label={`分攤人－${person.display_name}`} checked={allocationIds.includes(person.user_id)} onChange={() => toggle(person.user_id, allocationIds, setAllocationIds)} />{person.display_name}</label>
        {allocationMode === 'FIXED' && allocationIds.includes(person.user_id) && <PixelField label={`分攤金額－${person.display_name}`} inputMode="decimal" value={allocationValues[person.user_id] ?? ''}
          onChange={event => setAllocationValues({ ...allocationValues, [person.user_id]: event.target.value })} />}
      </div>)}
    </fieldset>
    <TaxonomyPicker spaceId={spaceId} categoryId={category} tagIds={tags} historicalTerms={terms} onChange={(id, ids) => { setCategory(id); setTags(ids); }} disabled={busy} />
    <PixelField label="共同備註" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} disabled={busy} />
    {!online && <p role="status">目前離線，尚未入帳。輸入只暫留在這個表單。</p>}
    {error && <p role="alert">{error}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void refreshVersion()} disabled={busy || !online}>重新讀取最新資料</PixelButton>}
    {locked && lockKind !== 'PENDING' && record && onCorrection && <PixelButton type="button" emphasis="secondary" onClick={() => onCorrection(record)}>建立不可變更的更正</PixelButton>}
    <PixelButton disabled={!online || busy || conflict}>{busy ? '確認中…' : record ? '儲存修改' : '確認記帳'}</PixelButton>
  </form>;
}
