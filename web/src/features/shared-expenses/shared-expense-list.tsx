"use client";
import { nowrapDate } from '@/shared/i18n/nowrap-date';
import { useTranslations } from 'next-intl';
import type { SharedCorrection, SharedExpense } from '@/shared/api/shared-finance-contracts';
import { useFormatMoney } from '@/shared/i18n/format';
import { LedgerIcon } from '@/shared/ui/pixel-notebook';
import { PixelButton } from '@/shared/ui/pixel-button';

export function SharedExpenseList({ expenses, corrections = [], currency, currentUserId, manager, readOnly = false, nameFor, onEdit, onDelete, onReference }: {
  corrections?: SharedCorrection[];
  expenses: SharedExpense[]; currency: string; currentUserId: string; manager: boolean; readOnly?: boolean; nameFor: (id: string) => string;
  onEdit: (expense: SharedExpense) => void; onDelete: (expense: SharedExpense) => void;
  onReference?: (expense: SharedExpense) => void;
}) {
  const t = useTranslations();
  const money = useFormatMoney();
  const namedAmount = (id: string, amount: string) => t('shared.list.namedAmount', { name: nameFor(id), amount: money(amount, currency) });
  if (!expenses.length) return <p>{t('shared.list.empty')}</p>;
  return <ul className="notebook-list">{expenses.map(expense => {
    const history = corrections.filter(item => item.source_expense_id === expense.id);
    const latest = history.reduce<SharedCorrection | undefined>((current, item) => !current || item.revision > current.revision ? item : current, undefined);
    return <li key={expense.id} className="notebook-row">
    <LedgerIcon name="event-expense" />
    <div><time>{t.rich('shared.list.date', { nowrap: nowrapDate, date: () => <>{expense.occurred_on}</> })}</time><h3>{expense.title}</h3>
      <p>{t.rich('shared.list.payments', {
        items: () => <>{expense.payers.map(row => namedAmount(row.user_id, row.amount_minor)).join(t('common.listSeparator'))}</>,
      })}</p>
      <p>{t.rich('shared.list.shares', {
        items: () => <>{expense.allocations.map(row => namedAmount(row.user_id, row.amount_minor)).join(t('common.listSeparator'))}</>,
      })}</p>
      {latest && <div className="shared-correction-label"><LedgerIcon name="event-correction" size={32} /><div>
        <p>{latest.target_amount_minor === '0'
          ? t('shared.list.correctedVoid', { count: history.length })
          : t.rich('shared.list.correctedTo', { count: history.length, amount: () => <>{money(latest.target_amount_minor, currency)}</> })}</p>
        <p>{t.rich('shared.list.correctionReason', { reason: () => <>{latest.reason}</> })}</p>
      </div></div>}
    </div><div className="notebook-amount"><strong>{money(expense.amount_minor, currency)}</strong>
      {onReference && expense.allocations.some(row => row.user_id === currentUserId && row.amount_minor !== '0')
        && <PixelButton emphasis="secondary" aria-label={t('shared.list.addToLedger', { title: expense.title })} onClick={() => onReference(expense)}>{t('common.addToLedger')}</PixelButton>}
      {!readOnly && (manager || expense.created_by === currentUserId) && <div>
        <PixelButton emphasis="ghost" aria-label={t('shared.list.edit', { title: expense.title })} onClick={() => onEdit(expense)}>{t('common.edit')}</PixelButton>
        <PixelButton emphasis="ghost" aria-label={t('shared.list.delete', { title: expense.title })} onClick={() => onDelete(expense)}>{t('common.delete')}</PixelButton>
      </div>}
    </div>
  </li>;
  })}</ul>;
}
