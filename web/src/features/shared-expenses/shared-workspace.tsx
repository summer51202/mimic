"use client";
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { financialSpaceSchema } from '@/shared/api/financial-space-contracts';
import { sharedBatchPageSchema, sharedCorrectionPageSchema, sharedExpenseMutationSchema, sharedExpensePageSchema,
  sharedParticipantSchema, sharedSummarySchema, type SharedExpense } from '@/shared/api/shared-finance-contracts';
import { parseMinorUnit } from '@/shared/finance/minor-unit';
import { useFormatMoney } from '@/shared/i18n/format';
import { BlockedExpenseDrafts } from '@/shared/drafts/blocked-expense-drafts';
import { clearQuickExpense } from '@/shared/navigation/clear-quick-expense';
import { useRecordLedgerCompanion } from '@/shared/scene/record-ledger-companion';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelDialog } from '@/shared/ui/pixel-dialog';
import { LedgerIcon, NotebookOfflineNotice, PixelNotebook } from '@/shared/ui/pixel-notebook';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';
import { SharedExpenseForm } from './shared-expense-form';
import { SharedExpenseList } from './shared-expense-list';
import { applyExpenseCorrections } from './shared-money';
import type { SharedWorkspaceData } from './shared-queries';
import { SettlementPanel } from '../shared-settlements/settlement-panel';
import { CorrectionForm } from '../shared-settlements/correction-form';
import { SharedLifecyclePanel } from '../shared-settlements/shared-lifecycle-panel';
import { PersonalReferenceForm } from './personal-reference-form';

export function SharedWorkspace({ initial, quick = false }: { initial: SharedWorkspaceData; quick?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [dialog, setDialog] = useState<'expense' | 'delete' | 'correction' | 'reference' | null>(
    quick && initial.space.status === 'ACTIVE' ? 'expense' : null,
  );
  const [editing, setEditing] = useState<SharedExpense>();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const deleteAttempt = useRef({ fingerprint: '', id: '' });
  const previousQuick = useRef(quick);
  const online = useOnline();
  const { celebrate, companion, preload } = useRecordLedgerCompanion();
  const { space, group } = data;
  useEffect(() => {
    if (quick && !previousQuick.current && space.status === 'ACTIVE') {
      setEditing(undefined);
      setDialog('expense');
    }
    previousQuick.current = quick;
  }, [quick, space.status]);
  useEffect(() => {
    if (dialog === 'expense' && !editing) preload();
  }, [dialog, editing, preload]);
  const manager = space.role === 'MANAGER';
  const active = space.status === 'ACTIVE';
  const nameFor = (id: string) => data.participants.find(person => person.user_id === id)?.display_name ?? t('shared.formerParticipant');
  const formatMoney = useFormatMoney();
  const money = (minor: string) => formatMoney(minor, space.currency);
  function closeExpense() {
    if (!editing) clearQuickExpense(router);
    setDialog(null); setEditing(undefined);
  }
  const lockKind = (record: SharedExpense | undefined) => {
    if (!record) return undefined;
    const batch = data.batches.items.find(item => item.status !== 'CANCELED' && item.period_start <= record.occurred_on && item.period_end >= record.occurred_on);
    return batch?.status === 'PENDING' ? 'PENDING' as const : batch?.status === 'COMPLETED' ? 'PERMANENT' as const : undefined;
  };
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
    try { await refresh(); setNotice(t('shared.reloaded')); }
    catch { setError(t('shared.reloadFailed')); }
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
      setNotice(t('shared.deleted', { title: editing.title })); await refresh();
    } catch { setError(t('shared.deleteFailed')); }
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
        await refresh(); setNotice(t('shared.pageReset'));
      } else setData(current => ({ ...current, expenses: { ...page, items: [...current.expenses.items, ...page.items] } }));
    } catch { setError(t('shared.pageFailed')); }
    finally { setBusy(false); }
  }
  return <main className="shared-page">
    <header className="shared-hero"><div><p className="shared-eyebrow ledger-with-icon"><LedgerIcon name="mode-shared" />{t('shared.eyebrow')}</p><h1>{space.name}</h1><p>{t.rich('shared.chestDetails', {
      group: () => <>{group.name}</>, currency: () => <>{space.currency}</>,
      role: () => <>{t(manager ? 'shared.chestKeeper' : 'common.participant')}</>,
    })}</p>
      {!active && <p className="shared-archive-state">{t('shared.archived')}</p>}</div></header>
    {!active && <BlockedExpenseDrafts actorUserId={group.current_user_id} groupId={group.id} spaceId={space.id}
      mode="SHARED_EXPENSES" spaceVersion={space.version} />}
    {notice && <p role="status" className="shared-notice">{notice}</p>}
    {error && <div role="alert"><p>{error}</p><PixelButton emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>{t('common.reload')}</PixelButton></div>}
    <section className="shared-summary" aria-labelledby="shared-summary-title"><PixelPanel><p>{t('shared.total')}</p><strong data-testid="shared-spending">{money(data.summary.spending_minor)}</strong><p>{t('shared.notBalance')}</p></PixelPanel>
      <PixelPanel><h2 id="shared-summary-title">{t('shared.position')}</h2><ul>{data.summary.positions.map(position => {
        const value = parseMinorUnit(position.amount_minor); const state = value > BigInt(0) ? t('shared.owed') : value < BigInt(0) ? t('shared.owe') : t('shared.settled');
        const amount = value < BigInt(0) ? (-value).toString() : value.toString();
        return <li key={position.user_id}>{t.rich('shared.positionLine', {
          name: () => <>{nameFor(position.user_id)}</>, state: () => <>{state}</>, amount: () => <>{money(amount)}</>,
        })}</li>;
      })}</ul></PixelPanel></section>
    <SettlementPanel spaceId={space.id} spaceVersion={space.version} currency={space.currency} timezone={space.timezone} currentUserId={group.current_user_id}
      manager={active && manager} batches={data.batches.items} nameFor={nameFor} onChanged={async () => { await refresh(); setNotice(t('shared.settlementUpdated')); }} />
    <PixelNotebook titleId="shared-expenses-title"><div className="shared-section-heading"><h2 id="shared-expenses-title">{t('shared.expenses')}</h2>
      {active && <PixelButton onClick={() => { setEditing(undefined); setDialog('expense'); }}>{t('shared.addExpense')}</PixelButton>}
    </div>
      {!online && <NotebookOfflineNotice />}
      <SharedExpenseList expenses={data.expenses.items} currency={space.currency} currentUserId={group.current_user_id} manager={manager} readOnly={!active} nameFor={nameFor}
        onEdit={record => { setEditing(record); setDialog('expense'); }} onDelete={record => { setEditing(record); setDialog('delete'); setError(''); }}
        onReference={record => { setEditing(record); setDialog('reference'); setError(''); }} />
      {data.expenses.next_cursor && <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void moreExpenses()}>{t('shared.moreExpenses')}</PixelButton>}
    </PixelNotebook>
    <PixelDialog open={dialog === 'expense'} title={editing ? t('shared.editExpense') : t('shared.addExpense')} closeLabel={t('common.close')} onClose={closeExpense} closeDisabled={busy}>
      {dialog === 'expense' && <SharedExpenseForm key={editing ? `${editing.id}:${editing.version}` : 'new'} groupId={group.id} spaceId={space.id} spaceVersion={space.version} writable={active} currency={space.currency} timezone={space.timezone}
        currentUserId={group.current_user_id} participants={data.participants} terms={data.terms} record={editing}
        lockKind={lockKind(editing)}
        onCorrection={record => { setEditing(applyExpenseCorrections(record, data.corrections.items)); setDialog('correction'); }}
        onSaved={async ({ record }) => {
          closeExpense();
          setNotice(t('shared.saved', { title: record.title, amount: money(record.amount_minor) }));
          if (!editing) celebrate({ context: group.id, record });
          try { await refresh(); } catch { setError(t('shared.updateFailed')); }
        }}
        onReload={async () => (await refresh()).expenses.items.find(item => item.id === editing?.id)} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'reference'} title={t('common.addToLedger')} closeLabel={t('common.close')} closeDisabled={busy} onClose={() => setDialog(null)}>
      {dialog === 'reference' && editing && <PersonalReferenceForm sourceExpenseId={editing.id}
        sourceLocked={lockKind(editing) === 'PERMANENT'} personalSpaces={data.personalSpaces} personalTags={data.personalTags}
        onSaved={(_result, personalSpaceId) => { const destination = data.personalSpaces.find(item => item.id === personalSpaceId);
          setDialog(null); setEditing(undefined); setNotice(t('shared.referenceAdded', { name: destination?.name ?? t('shared.personalChest') })); }}
        onReload={refresh} />}
    </PixelDialog>
    <PixelDialog open={dialog === 'delete'} title={t('shared.deleteExpense')} closeLabel={t('common.close')} closeDisabled={busy} onClose={() => setDialog(null)}>
      <p>{t.rich('shared.deleteDescription', { title: () => <>{editing?.title}</> })}</p>
      {error && <p role="alert">{error}</p>}
      <PixelButton emphasis="danger" disabled={busy || !online} onClick={() => void remove()}>{t('common.confirmDelete')}</PixelButton>
      <PixelButton emphasis="secondary" disabled={busy || !online} onClick={() => void reload()}>{t('common.loadLatest')}</PixelButton>
    </PixelDialog>
    <PixelDialog open={dialog === 'correction'} title={t('shared.createCorrection')} closeLabel={t('common.close')} closeDisabled={busy} onClose={() => setDialog(null)}>
      {dialog === 'correction' && editing && <CorrectionForm spaceId={space.id} currency={space.currency} timezone={space.timezone}
        sourceExpense={editing} participants={data.participants}
        sourceRevision={Math.max(0, ...data.corrections.items.filter(item => item.source_expense_id === editing.id).map(item => item.revision))}
        onSaved={async () => { setDialog(null); setEditing(undefined); await refresh(); setNotice(t('shared.correctionSaved')); }}
        onReload={async () => { const latest = await refresh(); return Math.max(0, ...latest.corrections.items.filter(item => item.source_expense_id === editing.id).map(item => item.revision)); }} />}
    </PixelDialog>
    <SharedLifecyclePanel space={space} currentUserId={group.current_user_id} participants={data.participants} members={data.members}
      onChanged={async () => { try { await refresh(); setNotice(t('shared.participationUpdated')); }
        catch { window.location.assign(`/app/groups/${group.id}`); } }} />
    {companion}
  </main>;
}
