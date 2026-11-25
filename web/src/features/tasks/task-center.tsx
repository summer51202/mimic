'use client';

import { nowrapDate } from '@/shared/i18n/nowrap-date';
import { LedgerIcon } from '@/shared/ui/pixel-notebook';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { TaskCenter as TaskCenterData } from '@/shared/api/home-contracts';
import { useFormatMoney } from '@/shared/i18n/format';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { formatGeneratedAt } from '@/shared/ui/format-generated-at';
import { useOnline } from '../personal-expenses/use-online';

const taskIcons = {
  POOLED_CONTRIBUTION: 'event-contribution',
  POOLED_REIMBURSEMENT_SEND: 'event-reimbursement',
  POOLED_REIMBURSEMENT_RECEIVE: 'event-reimbursement',
  SHARED_TRANSFER_SEND: 'event-settlement',
  SHARED_TRANSFER_RECEIVE: 'event-settlement',
  POOLED_SHORTFALL: 'event-shortfall',
} satisfies Record<TaskCenterData['items'][number]['kind'], string>;

export function TaskCenter({ data }: { data: TaskCenterData }) {
  const t = useTranslations('tasks');
  const common = useTranslations('common');
  const money = useFormatMoney();
  const online = useOnline();
  return <main className="task-center">
    <header className="task-center__hero"><div><p>{t('eyebrow')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div><strong>{data.count}</strong></header>
    {!online && <p className="task-center__state ledger-with-icon" role="status"><LedgerIcon name="status-offline" size={32} />{t('offline')}</p>}
    {!data.items.length ? <PixelPanel><h2>{t('empty')}</h2><p>{t('emptyDescription')}</p></PixelPanel>
      : <section aria-label={t('list')} className="task-center__list">{data.items.map((task) => {
        const urgency = task.urgency === 'ATTENTION' ? t('attention')
          : task.due_on ? t.rich(task.urgency === 'OVERDUE' ? 'overdueDated' : 'todoDated', { date: task.due_on, nowrap: nowrapDate })
            : t(task.urgency === 'OVERDUE' ? 'overdue' : 'todo');
        return <Link className={`task-card task-card--${task.urgency.toLowerCase()}`} href={task.href} key={task.id}>
          <div className="task-card__icon"><LedgerIcon name={taskIcons[task.kind]} /></div>
          <span className="task-card__urgency">{urgency}</span><h2>{t(`${task.kind}.title`)}</h2>
          <p>{t.rich('cardDetail', {
            name: () => <>{task.space.name}</>,
            detail: () => <>{t(`${task.kind}.detail`)}</>,
          })}</p>
          <strong>{money(task.amount_minor, task.space.currency)}</strong><span aria-hidden="true">{t('openChest')}</span>
        </Link>;
      })}</section>}
    <small className="task-center__generated">{common.rich('asOf', { nowrap: nowrapDate, date: () => <>{formatGeneratedAt(data.generated_at)}</> })}</small>
  </main>;
}
