"use client";
import { useRef, useState } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { financialSpaceSchema } from '@/shared/api/financial-space-contracts';
import { sharedBatchPageSchema, sharedCorrectionPageSchema, sharedExpenseMutationSchema, sharedExpensePageSchema,
  sharedParticipantSchema, sharedSummarySchema, type SharedExpense } from '@/shared/api/shared-finance-contracts';
import { formatMinorUnit, parseMinorUnit } from '@/shared/finance/minor-unit';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';
import { SharedExpenseForm } from './shared-expense-form';
import { SharedExpenseList } from './shared-expense-list';
import type { SharedWorkspaceData } from './shared-queries';

export function SharedWorkspace({ initial }: { initial: SharedWorkspaceData }) {
  const [data, setData] = useState(initial);
  const [dialog, setDialog] = useState<'expense' | 'delete' | null>(null);
  const [editing, setEditing] = useState<SharedExpense>();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const deleteAttempt = useRef({ fingerprint: '', id: '' });
  const online = useOnline();
  const { space, group } = data;
  const manager = space.role === 'MANAGER';
  const nameFor = (id: string) => data.participants.find(person => person.user_id === id)?.display_name ?? '已離開的參與者';
  const money = (minor: string) => formatMinorUnit(minor, space.currency, 'zh-TW');
  async function refresh() {
    const [spaceResponse, participantResponse, expenseResponse, summaryResponse, batchResponse, correctionResponse] = await Promise.all([
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}`, { method: 'GET' }),
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/participants`, { method: 'GET' }),
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/shared-expenses`, { method: 'GET' }),
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/shared-expenses/summary`, { method: 'GET' }),
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/shared-settlements`, { method: 'GET' }),
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/shared-corrections`, { method: 'GET' }),
    ]);
    const latestSpace = financialSpaceSchema.parse(spaceResponse.data);
    if (latestSpace.access !== 'PARTICIPANT' || latestSpace.mode !== 'SHARED_EXPENSES') throw new Error('SPACE_NOT_FOUND');
    const next = { ...data, space: latestSpace, participants: sharedParticipantSchema.array().parse(participantResponse.data),
      expenses: sharedExpensePageSchema.parse(expenseResponse.data), summary: sharedSummarySchema.parse(summaryResponse.data),
      batches: sharedBatchPageSchema.parse(batchResponse.data), corrections: sharedCorrectionPageSchema.parse(correctionResponse.data) };
    setData(next); setError(''); return next;
  }
  async function reload() {
    setBusy(true);
    try { await refresh(); setNotice('已重新讀取共同分帳。'); }
    catch { setError('讀取失敗，目前仍顯示先前已確認的資料，沒有改成零。'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!editing || busy || !online) return;
    const fingerprint = `${editing.id}:${editing.version}`;
    if (deleteAttempt.current.fingerprint !== fingerprint) deleteAttempt.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/shared-expenses/${editing.id}/delete`, {
        method: 'POST', body: JSON.stringify({ request_id: deleteAttempt.current.id, version: editing.version }),
      });
      sharedExpenseMutationSchema.parse(response.data); setDialog(null); setEditing(undefined);
      setNotice(`已刪除「${editing.title}」，共同位置將重新計算。`); await refresh();
    } catch { setError('刪除尚未確認。期間可能已鎖定或資料版本已變更；請重新讀取。'); }
    finally { setBusy(false); }
  }
  async function moreExpenses() {
    const cursor = data.expenses.next_cursor;
    if (!cursor || busy) return;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/shared-expenses?cursor=${cursor}`, { method: 'GET' });
      const page = sharedExpensePageSchema.parse(response.data);
      if (page.space_version !== data.expenses.space_version) {
        await refresh(); setNotice('共同支出已有變更，已重新載入第一頁。');
      } else setData(current => ({ ...current, expenses: { ...page, items: [...current.expenses.items, ...page.items] } }));
    } catch { setError('無法載入更多共同支出，目前清單保持不變。'); }
    finally { setBusy(false); }
  }
  return <main className="shared-page">
    <header className="shared-hero"><div><p className="shared-eyebrow">SHARED EXPENSES · 共同分帳</p><h1>{space.name}</h1><p>{group.name} · {space.currency} · {manager ? '寶箱管理者' : '參與者'}</p></div>
      <PixelButton disabled={space.status !== 'ACTIVE'} onClick={() => { setEditing(undefined); setDialog('expense'); }}>新增共同支出</PixelButton></header>
    {notice && <p role="status" className="shared-notice">{notice}</p>}
    {error && <div role="alert"><p>{error}</p><PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取</PixelButton></div>}
    <section className="shared-summary" aria-labelledby="shared-summary-title"><PixelPanel><p>共同支出總額</p><strong data-testid="shared-spending">{money(data.summary.spending_minor)}</strong><p>這不是帳戶餘額。</p></PixelPanel>
      <PixelPanel><h2 id="shared-summary-title">目前位置</h2><ul>{data.summary.positions.map(position => {
        const value = parseMinorUnit(position.amount_minor); const state = value > BigInt(0) ? '應收' : value < BigInt(0) ? '應付' : '已結清';
        const amount = value < BigInt(0) ? (-value).toString() : value.toString();
        return <li key={position.user_id}>{nameFor(position.user_id)} · {state} {money(amount)}</li>;
      })}</ul></PixelPanel></section>
    <PixelPanel><div className="shared-section-heading"><h2>共同支出</h2></div>
      <SharedExpenseList expenses={data.expenses.items} currency={space.currency} currentUserId={group.current_user_id} manager={manager} nameFor={nameFor}
        onEdit={record => { setEditing(record); setDialog('expense'); }} onDelete={record => { setEditing(record); setDialog('delete'); setError(''); }} />
      {data.expenses.next_cursor && <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void moreExpenses()}>載入更多共同支出</PixelButton>}
    </PixelPanel>
    <PixelDialog open={dialog === 'expense'} title={editing ? '編輯共同支出' : '新增共同支出'} closeLabel="關閉" onClose={() => setDialog(null)} closeDisabled={busy}>
      {dialog === 'expense' && <SharedExpenseForm key={editing ? `${editing.id}:${editing.version}` : 'new'} spaceId={space.id} currency={space.currency} timezone={space.timezone}
        currentUserId={group.current_user_id} participants={data.participants} terms={data.terms} record={editing}
        onSaved={async result => { setDialog(null); setEditing(undefined); setNotice(`已確認「${result.record.title}」${money(result.record.amount_minor)}。`); try { await refresh(); } catch { setError('已確認儲存，但摘要更新失敗；請重新讀取。'); } }}
        onReload={async () => (await refresh()).expenses.items.find(item => item.id === editing?.id)} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'delete'} title="刪除此筆共同支出？" closeLabel="關閉" closeDisabled={busy} onClose={() => setDialog(null)}>
      <p>「{editing?.title}」將從位置計算移除，稽核紀錄仍保留。已鎖定期間不能刪除。</p>
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" disabled={busy || !online} onClick={() => void remove()}>確認刪除</PixelButton>
      <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void reload()}>重新讀取最新資料</PixelButton>
    </PixelDialog>
  </main>;
}
