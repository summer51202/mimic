"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appFetch } from '@/shared/api/app-fetch';
import { expenseMutationSchema, personalMonthSchema, personalReferenceMutationSchema, type ExpenseMutation, type PersonalMonthEntry, type PersonalReferenceEntry, type PersonalReferenceMutation } from '@/shared/api/personal-expense-contracts';
import { taxonomyTermSchema } from '@/shared/api/taxonomy-contracts';
import { formatMinorUnit } from '@/shared/finance/minor-unit';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { TaxonomyManager } from '../taxonomy/taxonomy-manager';
import { PersonalBoxForm } from './personal-box-form';
import { PersonalExpenseForm } from './personal-expense-form';
import { PersonalReferenceForm } from './personal-reference-form';
import type { PersonalPageData } from './personal-queries';
import { useOnline } from './use-online';

export function PersonalPage({ data, quick = false }: { data: PersonalPageData; quick?: boolean }) {
  const router = useRouter();
  const [monthData, setMonthData] = useState(data.monthData);
  const [terms, setTerms] = useState(data.terms);
  const [dialog, setDialog] = useState<'box' | 'expense' | 'reference' | 'taxonomy' | 'delete' | 'remove-reference' | null>(
    quick && data.selected?.status === 'ACTIVE' ? 'expense' : null,
  );
  const [editing, setEditing] = useState<PersonalMonthEntry>();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const deleteAttempt = useRef({ fingerprint: '', id: '' });
  const referenceRemoveAttempt = useRef({ fingerprint: '', id: '' });
  const previousQuick = useRef(quick);
  const online = useOnline();
  const space = data.selected;
  useEffect(() => {
    if (quick && !previousQuick.current && space?.status === 'ACTIVE') setDialog('expense');
    previousQuick.current = quick;
  }, [quick, space?.status]);
  const money = (minor: string) => formatMinorUnit(minor, monthData?.currency ?? 'TWD', 'zh-TW');
  function termName(id: string) {
    const term = terms.find(item => item.id === id);
    return terms.find(item => item.id === term?.canonical_id)?.name ?? term?.name ?? '未分類';
  }
  async function refresh() {
    if (!space || !monthData) return null;
    const [month, categories, tags] = await Promise.all([
      appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/personal-expenses?month=${monthData.month}`, { method: 'GET' }),
      appFetch<{ data: unknown }>('/api/app/me/taxonomy?kind=CATEGORY&include_inactive=true', { method: 'GET' }),
      appFetch<{ data: unknown }>('/api/app/me/taxonomy?kind=TAG&include_inactive=true', { method: 'GET' }),
    ]);
    const latest = personalMonthSchema.parse(month.data);
    const latestTerms = [...taxonomyTermSchema.array().parse(categories.data), ...taxonomyTermSchema.array().parse(tags.data)];
    setMonthData(latest); setTerms(latestTerms); setError(''); return latest;
  }
  async function saved(result: ExpenseMutation) {
    setDialog(null); setEditing(undefined);
    setNotice(result.record.status === 'DELETED' ? `已刪除「${result.record.title}」，月支出將重新計算。` : `已儲存「${result.record.title}」${money(result.record.amount_minor)}。`);
    try { await refresh(); } catch { setError('已確認儲存，但月支出更新失敗；目前顯示先前資料，請重新讀取。'); }
  }
  async function referenceSaved(result: PersonalReferenceMutation) {
    setDialog(null); setEditing(undefined);
    setNotice(result.reference.status === 'REMOVED' ? '已移除私人參照，月支出將重新計算。' : '已儲存共同分帳的私人資訊。');
    try { await refresh(); } catch { setError('已確認儲存，但月支出更新失敗；目前顯示先前資料，請重新讀取。'); }
  }
  async function reload() {
    setBusy(true);
    try {
      const latest = await refresh();
      if (editing && latest) {
        const record = latest.items.find(item => item.id === editing.id);
        if (record) setEditing(record);
        else { setDialog(null); setEditing(undefined); setNotice('清單已更新，請重新選擇要操作的支出。'); }
      }
    } catch { setError('讀取失敗，目前仍顯示先前資料。請稍後重新讀取。'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!space || !editing || editing.entry_type !== 'MANUAL' || busy || !online) return;
    const fingerprint = `${editing.id}:${editing.version}`;
    if (deleteAttempt.current.fingerprint !== fingerprint) deleteAttempt.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/personal-expenses/${editing.id}/delete`, {
        method: 'POST', body: JSON.stringify({ version: editing.version, request_id: deleteAttempt.current.id }),
      });
      await saved(expenseMutationSchema.parse(response.data));
    } catch { setError('刪除尚未確認。若資料已變更，請重新讀取後再確認。'); }
    finally { setBusy(false); }
  }
  async function removeReference() {
    if (!space || !editing || editing.entry_type !== 'SHARED_REFERENCE' || busy || !online) return;
    const fingerprint = `${editing.id}:${editing.version}`;
    if (referenceRemoveAttempt.current.fingerprint !== fingerprint) referenceRemoveAttempt.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/personal-references/${editing.id}/remove`, {
        method: 'POST', body: JSON.stringify({ version: editing.version, request_id: referenceRemoveAttempt.current.id }),
      });
      await referenceSaved(personalReferenceMutationSchema.parse(response.data));
    } catch { setError('移除尚未確認。若資料已變更，請重新讀取後再確認。'); }
    finally { setBusy(false); }
  }
  async function more() {
    if (!space || !monthData?.next_cursor || busy) return;
    setBusy(true);
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/personal-expenses?month=${monthData.month}&cursor=${monthData.next_cursor}`, { method: 'GET' });
      const next = personalMonthSchema.parse(response.data);
      if (next.view_version !== monthData.view_version) { await refresh(); setNotice('支出已有變更，已重新載入第一頁。'); }
      else setMonthData({ ...next, items: [...monthData.items, ...next.items] });
    } catch { setError('無法載入更多支出，請重新讀取。'); }
    finally { setBusy(false); }
  }
  return <div className="personal-page">
    <header className="personal-heading"><div><p className="personal-eyebrow">PERSONAL EXPENSES · 個人記帳</p><h1>我的寶箱</h1><p>把日常花費記下來，慢慢看懂自己的生活。</p></div>
      <PixelButton onClick={() => setDialog('box')}>新增寶箱</PixelButton></header>
    {notice && <p role="status" className="personal-notice">{notice}</p>}
    {error && <div role="alert"><p>{error}</p><PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取</PixelButton></div>}
    {!space || !monthData ? <PixelPanel><h2>你的第一個個人寶箱</h2><p>不需要群組。建立寶箱後，就能記錄每天的支出。</p></PixelPanel> : <>
      <div className="personal-controls">
        <label className="pixel-field">目前寶箱<select className="pixel-field__input" value={space.id} onChange={e => router.push(`/app/personal?space=${e.target.value}&month=${monthData.month}`)}>
          {data.spaces.map(item => <option value={item.id} key={item.id}>{item.name}{item.access === 'PARTICIPANT' ? ` · ${item.currency}` : ''}{item.status === 'ARCHIVED' ? '（已封存）' : ''}</option>)}
        </select></label>
        <label className="pixel-field">查看月份<input className="pixel-field__input" type="month" value={monthData.month} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(`/app/personal?space=${space.id}&month=${e.target.value}`); }} /></label>
      </div>
      <div className="personal-summary">
        <PixelPanel className="personal-total"><p>{monthData.month} 月支出 · {monthData.currency}</p><strong data-testid="monthly-spending">{money(monthData.spending_minor)}</strong><p>僅計入「{space.name}」的支出</p></PixelPanel>
        <PixelPanel><h2>花在哪裡</h2>{monthData.categories.length ? <ul className="personal-breakdown">{monthData.categories.map(category => <li key={category.category_id}><span>{category.category_name}</span><strong>{money(category.spending_minor)}</strong></li>)}</ul> : <p>這個月還沒有支出。</p>}</PixelPanel>
      </div>
      <section aria-labelledby="personal-records-title"><div className="personal-heading"><h2 id="personal-records-title">日常支出</h2><PixelButton disabled={space.status !== 'ACTIVE'} onClick={() => { setEditing(undefined); setDialog('expense'); }}>記一筆支出</PixelButton></div>
        <ul className="personal-records">{monthData.items.map(record => <li key={record.id}><div>{record.entry_type === 'SHARED_REFERENCE' && <div className="personal-record-source"><span className="personal-source-badge">來自共同分帳</span>{record.source_locked && <span className="personal-lock-badge">來源已鎖定</span>}</div>}<time>{record.occurred_on}</time><h3>{record.title}</h3><p>{record.category_name}{record.tag_ids.map(id => ` · ${termName(id)}`).join('')}</p>{record.note && <p>{record.note}</p>}</div><div className="personal-record-actions"><strong>{money(record.amount_minor)}</strong><div>
          {record.entry_type === 'MANUAL' ? <><PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`編輯 ${record.title}`} onClick={() => { setEditing(record); setDialog('expense'); }}>編輯</PixelButton>
          <PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`刪除 ${record.title}`} onClick={() => { setEditing(record); setError(''); setDialog('delete'); }}>刪除</PixelButton></> : <><PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`編輯私人資訊－${record.title}`} onClick={() => { setEditing(record); setDialog('reference'); }}>編輯私人資訊</PixelButton>
          <PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={`移除私人參照－${record.title}`} onClick={() => { setEditing(record); setError(''); setDialog('remove-reference'); }}>移除參照</PixelButton></>}
        </div></div></li>)}</ul>
        {monthData.next_cursor && <PixelButton emphasis="secondary" onClick={() => void more()} disabled={busy || !online}>載入更多</PixelButton>}
      </section>
      <PixelButton emphasis="secondary" onClick={() => setDialog('taxonomy')}>管理類別與標籤</PixelButton>
    </>}
    <PixelDialog open={dialog === 'box'} title="新增個人寶箱" onClose={() => setDialog(null)} closeLabel="關閉">
      {dialog === 'box' && <PersonalBoxForm onCreated={created => { setDialog(null); router.push(`/app/personal?space=${created.id}`); router.refresh(); }} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'expense'} title={editing ? '編輯支出' : '記一筆支出'} onClose={() => setDialog(null)} closeLabel="關閉">
      {dialog === 'expense' && space && <PersonalExpenseForm key={editing ? `${editing.id}:${editing.version}` : 'new'} spaceId={space.id} currency={space.currency} timezone={space.timezone} record={editing?.entry_type === 'MANUAL' ? editing : undefined} terms={terms} onSaved={result => void saved(result)} onReload={async () => (await refresh())?.items.find(item => item.id === editing?.id && item.entry_type === 'MANUAL') as Extract<PersonalMonthEntry, { entry_type: 'MANUAL' }> | undefined} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'reference'} title="編輯共同分帳的私人資訊" onClose={() => setDialog(null)} closeLabel="關閉">
      {dialog === 'reference' && space && editing?.entry_type === 'SHARED_REFERENCE' && <PersonalReferenceForm key={`${editing.id}:${editing.version}`} spaceId={space.id} reference={editing} terms={terms} onSaved={result => void referenceSaved(result)} onReload={async () => (await refresh())?.items.find((item): item is PersonalReferenceEntry => item.id === editing.id && item.entry_type === 'SHARED_REFERENCE')} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'taxonomy'} title="管理類別與標籤" onClose={() => setDialog(null)} closeLabel="關閉">
      {dialog === 'taxonomy' && <TaxonomyManager terms={terms} onChanged={() => void reload()} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'delete'} title="刪除此筆支出？" onClose={() => setDialog(null)} closeDisabled={busy} closeLabel="關閉">
      <p>「{editing?.title}」{editing && money(editing.amount_minor)} 將從月支出中移除，稽核紀錄會保留。</p>
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" onClick={() => void remove()} disabled={busy || !online}>確認刪除</PixelButton>
      <PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取最新資料</PixelButton>
    </PixelDialog>
    <PixelDialog open={dialog === 'remove-reference'} title="移除這筆私人參照？" onClose={() => setDialog(null)} closeDisabled={busy} closeLabel="關閉">
      <p>只會把「{editing?.title}」從你的個人帳本移除；共同交易不會被刪除或修改。</p>
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" onClick={() => void removeReference()} disabled={busy || !online}>確認移除</PixelButton>
      <PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>重新讀取最新資料</PixelButton>
    </PixelDialog>
  </div>;
}
