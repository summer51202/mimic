"use client";
import type { SharedExpense } from '@/shared/api/shared-finance-contracts';
import { formatMinorUnit } from '@/shared/finance/minor-unit';
import { PixelButton } from '@/shared/ui/pixel-button';

export function SharedExpenseList({ expenses, currency, currentUserId, manager, readOnly = false, nameFor, onEdit, onDelete, onReference }: {
  expenses: SharedExpense[]; currency: string; currentUserId: string; manager: boolean; readOnly?: boolean; nameFor: (id: string) => string;
  onEdit: (expense: SharedExpense) => void; onDelete: (expense: SharedExpense) => void;
  onReference?: (expense: SharedExpense) => void;
}) {
  if (!expenses.length) return <p>還沒有共同支出。從第一筆付款與分攤開始。</p>;
  return <ul className="shared-expense-list">{expenses.map(expense => <li key={expense.id}>
    <div><time>{expense.occurred_on}</time><h3>{expense.title}</h3>
      <p>付款：{expense.payers.map(row => `${nameFor(row.user_id)} ${formatMinorUnit(row.amount_minor, currency, 'zh-TW')}`).join('、')}</p>
      <p>分攤：{expense.allocations.map(row => `${nameFor(row.user_id)} ${formatMinorUnit(row.amount_minor, currency, 'zh-TW')}`).join('、')}</p>
    </div><div className="shared-expense-actions"><strong>{formatMinorUnit(expense.amount_minor, currency, 'zh-TW')}</strong>
      {onReference && expense.allocations.some(row => row.user_id === currentUserId && row.amount_minor !== '0')
        && <PixelButton emphasis="secondary" aria-label={`加入我的帳本－${expense.title}`} onClick={() => onReference(expense)}>加入我的帳本</PixelButton>}
      {!readOnly && (manager || expense.created_by === currentUserId) && <div>
        <PixelButton emphasis="ghost" aria-label={`編輯 ${expense.title}`} onClick={() => onEdit(expense)}>編輯</PixelButton>
        <PixelButton emphasis="ghost" aria-label={`刪除 ${expense.title}`} onClick={() => onDelete(expense)}>刪除</PixelButton>
      </div>}
    </div>
  </li>)}</ul>;
}
