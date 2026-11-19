"use client";
import { nowrapDate } from '@/shared/i18n/nowrap-date';
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appFetch } from '@/shared/api/app-fetch';
import { expenseMutationSchema, personalMonthSchema, personalReferenceMutationSchema, type ExpenseMutation, type PersonalMonthEntry, type PersonalReferenceEntry, type PersonalReferenceMutation } from '@/shared/api/personal-expense-contracts';
import { taxonomyTermSchema } from '@/shared/api/taxonomy-contracts';
import { useFormatMoney } from '@/shared/i18n/format';
import { BlockedExpenseDrafts } from '@/shared/drafts/blocked-expense-drafts';
import { clearQuickExpense } from '@/shared/navigation/clear-quick-expense';
import { useRecordLedgerCompanion } from '@/shared/scene/record-ledger-companion';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { LedgerIcon, NotebookOfflineNotice, PixelNotebook } from '@/shared/ui/pixel-notebook';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { TaxonomyManager } from '../taxonomy/taxonomy-manager';
import { PersonalBoxForm } from './personal-box-form';
import { PersonalExpenseForm } from './personal-expense-form';
import { PersonalReferenceForm } from './personal-reference-form';
import type { PersonalPageData } from './personal-queries';
import { useOnline } from './use-online';

export function PersonalPage({ data, quick = false }: { data: PersonalPageData; quick?: boolean }) {
  const t = useTranslations('personal');
  const common = useTranslations('common');
  const nav = useTranslations('nav');
  const formatMoney = useFormatMoney();
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
  const { celebrate, companion, preload } = useRecordLedgerCompanion();
  const space = data.selected;
  useEffect(() => {
    if (quick && !previousQuick.current && space?.status === 'ACTIVE') {
      setEditing(undefined);
      setDialog('expense');
    }
    previousQuick.current = quick;
  }, [quick, space?.status]);
  useEffect(() => {
    if (dialog === 'expense' && !editing) preload();
  }, [dialog, editing, preload]);
  const money = (minor: string) => formatMoney(minor, monthData?.currency ?? 'TWD');
  function termName(id: string) {
    const term = terms.find(item => item.id === id);
    return terms.find(item => item.id === term?.canonical_id)?.name ?? term?.name ?? t('uncategorized');
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
  async function saved(result: ExpenseMutation, creating = false) {
    if (creating) closeExpense();
    else { setDialog(null); setEditing(undefined); }
    setNotice(result.record.status === 'DELETED' ? t('deleted', { title: result.record.title }) : t('saved', { title: result.record.title, amount: money(result.record.amount_minor) }));
    const { record } = result;
    if (creating && record.status !== 'DELETED') {
      celebrate({ context: 'personal', record });
    }
    try { await refresh(); } catch { setError(t('refreshAfterSaveFailed')); }
  }
  function closeExpense() {
    if (!editing) clearQuickExpense(router);
    setDialog(null); setEditing(undefined);
  }
  async function referenceSaved(result: PersonalReferenceMutation) {
    setDialog(null); setEditing(undefined);
    setNotice(result.reference.status === 'REMOVED' ? t('linkRemoved') : t('privateDetailsSaved'));
    try { await refresh(); } catch { setError(t('refreshAfterSaveFailed')); }
  }
  async function reload() {
    setBusy(true);
    try {
      const latest = await refresh();
      if (editing && latest) {
        const record = latest.items.find(item => item.id === editing.id);
        if (record) setEditing(record);
        else { setDialog(null); setEditing(undefined); setNotice(t('listRefreshed')); }
      }
    } catch { setError(t('reloadFailed')); }
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
    } catch { setError(t('deleteUnconfirmed')); }
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
    } catch { setError(t('removeUnconfirmed')); }
    finally { setBusy(false); }
  }
  async function more() {
    if (!space || !monthData?.next_cursor || busy) return;
    setBusy(true);
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${space.id}/personal-expenses?month=${monthData.month}&cursor=${monthData.next_cursor}`, { method: 'GET' });
      const next = personalMonthSchema.parse(response.data);
      if (next.view_version !== monthData.view_version) { await refresh(); setNotice(t('firstPageReloaded')); }
      else setMonthData({ ...next, items: [...monthData.items, ...next.items] });
    } catch { setError(t('moreFailed')); }
    finally { setBusy(false); }
  }
  return <div className="personal-page">
    <header className="personal-heading"><div><p className="personal-eyebrow ledger-with-icon"><LedgerIcon name="mode-personal" />{t('eyebrow')}</p><h1>{nav('chests')}</h1><p>{t('intro')}</p></div>
      <PixelButton onClick={() => setDialog('box')}>{t('addChest')}</PixelButton></header>
    {space && space.status !== 'ACTIVE' && <BlockedExpenseDrafts actorUserId={space.owner_user_id!} groupId={null} spaceId={space.id}
      mode="PERSONAL_EXPENSES" spaceVersion={space.version} />}
    {notice && <p role="status" className="personal-notice">{notice}</p>}
    {error && <div role="alert"><p>{error}</p><PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>{common('reload')}</PixelButton></div>}
    {!space || !monthData ? <PixelPanel><h2>{t('firstChest')}</h2><p>{t('firstChestIntro')}</p></PixelPanel> : <>
      <div className="personal-controls">
        <label className="pixel-field">{t('currentChest')}<select className="pixel-field__input" value={space.id} onChange={e => router.push(`/app/personal?space=${e.target.value}&month=${monthData.month}`)}>
          {data.spaces.map(item => <option value={item.id} key={item.id}>{item.name}{item.access === 'PARTICIPANT' ? t('withCurrency', { currency: item.currency }) : ''}{item.status === 'ARCHIVED' ? t('archivedSuffix') : ''}</option>)}
        </select></label>
        <label className="pixel-field">{t('month')}<input className="pixel-field__input" type="month" value={monthData.month} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(`/app/personal?space=${space.id}&month=${e.target.value}`); }} /></label>
      </div>
      <div className="personal-summary">
        <PixelPanel className="personal-total">
          <p>{t.rich('monthlySpending', {
            nowrap: nowrapDate,
            month: () => <>{monthData.month}</>,
            currency: () => <>{monthData.currency}</>,
          })}</p>
          <strong data-testid="monthly-spending">{money(monthData.spending_minor)}</strong>
          <p>{t.rich('onlyChest', { chest: () => <>{space.name}</> })}</p>
        </PixelPanel>
        <PixelPanel><h2>{t('breakdown')}</h2>{monthData.categories.length ? <ul className="personal-breakdown">{monthData.categories.map(category => <li key={category.category_id}><span>{category.category_name}</span><strong>{money(category.spending_minor)}</strong></li>)}</ul> : <p>{t('noExpenses')}</p>}</PixelPanel>
      </div>
      <PixelNotebook titleId="personal-records-title"><div className="personal-heading"><h2 id="personal-records-title">{t('dailyExpenses')}</h2><PixelButton disabled={space.status !== 'ACTIVE'} onClick={() => { setEditing(undefined); setDialog('expense'); }}>{t('record')}</PixelButton></div>
        {!online && <NotebookOfflineNotice />}
        <ul className="notebook-list personal-records">{monthData.items.map(record => <li key={record.id} className="notebook-row"><LedgerIcon name="event-expense" /><div>{record.entry_type === 'SHARED_REFERENCE' && <div className="personal-record-source"><span className="personal-source-badge">{t('sharedSource')}</span>{record.source_locked && <span className="personal-lock-badge notebook-secondary"><LedgerIcon name="status-lock" size={32} />{t('sourceLocked')}</span>}</div>}
          <time>{record.entry_type === 'MANUAL' ? t.rich('expenseDate', { nowrap: nowrapDate, date: () => <>{record.occurred_on}</> }) : t.rich('referenceDate', { date: record.occurred_on, nowrap: nowrapDate })}</time>
          <h3>{record.title}</h3><p>{record.category_name}{record.tag_ids.map(id => t('withTag', { tag: termName(id) })).join('')}</p>{record.note && <p>{record.note}</p>}</div><div className="notebook-amount"><strong>{money(record.amount_minor)}</strong><div>
          {record.entry_type === 'MANUAL' ? <><PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={t('editExpenseLabel', { title: record.title })} onClick={() => { setEditing(record); setDialog('expense'); }}>{common('edit')}</PixelButton>
          <PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={t('deleteExpenseLabel', { title: record.title })} onClick={() => { setEditing(record); setError(''); setDialog('delete'); }}>{common('delete')}</PixelButton></> : <><PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={t('editDetailsLabel', { title: record.title })} onClick={() => { setEditing(record); setDialog('reference'); }}>{t('editDetails')}</PixelButton>
          <PixelButton emphasis="ghost" disabled={space.status !== 'ACTIVE'} aria-label={t('removeLinkLabel', { title: record.title })} onClick={() => { setEditing(record); setError(''); setDialog('remove-reference'); }}>{t('removeLink')}</PixelButton></>}
        </div></div></li>)}</ul>
        {monthData.next_cursor && <PixelButton emphasis="secondary" onClick={() => void more()} disabled={busy || !online}>{common('loadMore')}</PixelButton>}
      </PixelNotebook>
      <PixelButton emphasis="secondary" onClick={() => setDialog('taxonomy')}>{t('manageTaxonomy')}</PixelButton>
    </>}
    <PixelDialog open={dialog === 'box'} title={t('addPersonalChest')} onClose={() => setDialog(null)} closeLabel={common('close')}>
      {dialog === 'box' && <PersonalBoxForm onCreated={created => { setDialog(null); router.push(`/app/personal?space=${created.id}`); }} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'expense'} title={editing ? t('editExpense') : t('record')} onClose={closeExpense} closeLabel={common('close')}>
      {dialog === 'expense' && space && <PersonalExpenseForm key={editing ? `${editing.id}:${editing.version}` : 'new'}
        actorUserId={space.owner_user_id!} spaceId={space.id} spaceVersion={monthData?.space_version ?? space.version}
        writable={space.status === 'ACTIVE'} currency={space.currency} timezone={space.timezone}
        record={editing?.entry_type === 'MANUAL' ? editing : undefined} terms={terms} onSaved={result => void saved(result, !editing)}
        onReload={async () => (await refresh())?.items.find(item => item.id === editing?.id && item.entry_type === 'MANUAL') as Extract<PersonalMonthEntry, { entry_type: 'MANUAL' }> | undefined} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'reference'} title={t('editSharedDetails')} onClose={() => setDialog(null)} closeLabel={common('close')}>
      {dialog === 'reference' && space && editing?.entry_type === 'SHARED_REFERENCE' && <PersonalReferenceForm key={`${editing.id}:${editing.version}`} spaceId={space.id} reference={editing} terms={terms} onSaved={result => void referenceSaved(result)} onReload={async () => (await refresh())?.items.find((item): item is PersonalReferenceEntry => item.id === editing.id && item.entry_type === 'SHARED_REFERENCE')} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'taxonomy'} title={t('manageTaxonomy')} onClose={() => setDialog(null)} closeLabel={common('close')}>
      {dialog === 'taxonomy' && <TaxonomyManager terms={terms} onChanged={() => void reload()} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'delete'} title={t('deleteTitle')} onClose={() => setDialog(null)} closeDisabled={busy} closeLabel={common('close')}>
      <p>{t.rich('deleteDescription', {
        title: () => <>{editing?.title}</>,
        amount: () => <>{editing && money(editing.amount_minor)}</>,
      })}</p>
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" onClick={() => void remove()} disabled={busy || !online}>{t('confirmDelete')}</PixelButton>
      <PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>{common('loadLatest')}</PixelButton>
    </PixelDialog>
    <PixelDialog open={dialog === 'remove-reference'} title={t('removeTitle')} onClose={() => setDialog(null)} closeDisabled={busy} closeLabel={common('close')}>
      <p>{t.rich('removeDescription', { title: () => <>{editing?.title}</> })}</p>
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" onClick={() => void removeReference()} disabled={busy || !online}>{t('confirmRemove')}</PixelButton>
      <PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>{common('loadLatest')}</PixelButton>
    </PixelDialog>
    {companion}
  </div>;
}
