"use client";
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { expenseMutationSchema, type ExpenseMutation, type PersonalExpense } from '@/shared/api/personal-expense-contracts';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { majorToMinorString } from '@/shared/finance/major-to-minor';
import { formatMinorUnit } from '@/shared/finance/minor-unit';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { TaxonomyPicker } from '../taxonomy/taxonomy-picker';
import { useOnline } from './use-online';

function editAmount(record: PersonalExpense | undefined, currency: string) {
  if (!record) return '';
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 0;
  const raw = record.amount_minor.padStart(digits + 1, '0');
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}
function today(timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
export function PersonalExpenseForm({ spaceId, currency, timezone, record, onSaved, onReload, terms }: {
  spaceId: string; currency: string; timezone: string; record?: PersonalExpense;
  terms?: TaxonomyTerm[];
  onSaved: (result: ExpenseMutation) => void; onReload?: () => Promise<PersonalExpense | undefined>;
}) {
  const [title, setTitle] = useState(record?.title ?? '');
  const [amount, setAmount] = useState(() => editAmount(record, currency));
  const [date, setDate] = useState(record?.occurred_on ?? today(timezone));
  const [note, setNote] = useState(record?.note ?? '');
  const [category, setCategory] = useState(record?.category_id ?? '');
  const [tags, setTags] = useState(record?.tag_ids ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [version, setVersion] = useState(record?.version);
  const [latest, setLatest] = useState<PersonalExpense>();
  const online = useOnline();
  const attempt = useRef({ fingerprint: '', id: '' });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy || conflict) return;
    setError('');
    let amountMinor: string;
    try { amountMinor = majorToMinorString(amount, currency); }
    catch { setError('請輸入符合幣別小數位數的正數金額。'); return; }
    const payload = { amount_minor: amountMinor, occurred_on: date, title: title.trim(), note: note.trim() || null,
      ...(category ? { category_id: category } : {}), tag_ids: [...tags].sort(), ...(record ? { version } : {}) };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true);
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/personal-expenses${record ? `/${record.id}` : ''}`, {
        method: record ? 'PATCH' : 'POST', body: JSON.stringify({ ...payload, request_id: attempt.current.id }),
      });
      onSaved(expenseMutationSchema.parse(response.data));
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        setConflict(true); setError('資料已變更，請重新讀取最新資料並檢查後再操作。你的輸入仍保留在此。');
      } else setError('尚未確認入帳。請檢查金額、日期與類別後重試；相同內容重試不會重複記帳。');
    } finally { setBusy(false); }
  }
  async function reviewLatest() {
    if (!onReload || busy) return;
    setBusy(true);
    try {
      const refreshed = await onReload();
      if (record && (!refreshed || refreshed.status !== 'ACTIVE')) { setError('這筆支出已不在目前清單，請關閉表單後檢查。輸入仍保留。'); return; }
      setLatest(refreshed); setVersion(refreshed?.version); setConflict(false); setError('');
    } catch { setError('重新讀取失敗，輸入仍保留。請稍後再試。'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="personal-form">
    <PixelField label="支出名稱" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} disabled={busy} />
    <PixelField label={`金額（${currency}）`} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required disabled={busy} />
    <PixelField label="支出日期" type="date" value={date} max={today(timezone)} onChange={e => setDate(e.target.value)} required disabled={busy} />
    <TaxonomyPicker spaceId={spaceId} categoryId={category} tagIds={tags} historicalTerms={terms} onChange={(id, ids) => { setCategory(id); setTags(ids); }} disabled={busy} />
    <PixelField label="備註" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} disabled={busy} />
    {!online && <p role="status">目前離線，尚未入帳。輸入暫留此頁；關閉頁面後不會保留。</p>}
    {error && <p role="alert">{error}</p>}
    {latest && <p role="status">最新紀錄：「{latest.title}」{formatMinorUnit(latest.amount_minor, currency, 'zh-TW')}（{latest.occurred_on}）。上方保留你的輸入，請比較後再儲存。</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" disabled={busy || !online} onClick={() => void reviewLatest()}>重新讀取最新資料</PixelButton>}
    <PixelButton type="submit" disabled={!online || busy || conflict}>{busy ? '確認中…' : record ? '儲存修改' : '確認記帳'}</PixelButton>
  </form>;
}
