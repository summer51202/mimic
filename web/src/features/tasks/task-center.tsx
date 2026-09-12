'use client';

import Link from 'next/link';
import type { HomeTask, TaskCenter as TaskCenterData } from '@/shared/api/home-contracts';
import { formatMinorUnit } from '@/shared/finance/minor-unit';
import { PixelPanel } from '@/shared/ui/pixel-panel';
import { useOnline } from '../personal-expenses/use-online';

const taskCopy: Record<HomeTask['kind'], { title: string; detail: string }> = {
  POOLED_CONTRIBUTION: { title: '確認本次投入', detail: '完成你自己的基金投入確認。' },
  POOLED_REIMBURSEMENT_SEND: { title: '確認基金已送出代墊款', detail: '你是管理者，請在實際付款後確認。' },
  POOLED_REIMBURSEMENT_RECEIVE: { title: '確認收到代墊款', detail: '你是代墊者，請在款項入帳後確認。' },
  SHARED_TRANSFER_SEND: { title: '確認已送出結算款', detail: '你是付款方，請在實際轉帳後確認。' },
  SHARED_TRANSFER_RECEIVE: { title: '確認收到結算款', detail: '你是收款方，請在款項入帳後確認。' },
  POOLED_SHORTFALL: { title: '處理資金缺口', detail: '基金可用餘額不足，請檢查待投入與待付項目。' },
};

function urgency(task: HomeTask) {
  if (task.urgency === 'OVERDUE') return task.due_on ? `已逾期 · ${task.due_on}` : '已逾期';
  if (task.urgency === 'ATTENTION') return '需要注意';
  return task.due_on ? `待處理 · ${task.due_on}` : '待處理';
}

export function TaskCenter({ data }: { data: TaskCenterData }) {
  const online = useOnline();
  return <main className="task-center">
    <header className="task-center__hero"><div><p>QUEST BOARD</p><h1>任務中心</h1><p>只列出現在由你確認、付款、收款或處理的事項。</p></div><strong>{data.count}</strong></header>
    {!online && <p className="task-center__state" role="status">目前離線，顯示最後載入的任務；請恢復連線後再執行確認。</p>}
    {!data.items.length ? <PixelPanel><h2>目前沒有待辦</h2><p>寶箱都整理好了。之後若有需要你處理的事項，會出現在這裡。</p></PixelPanel>
      : <section aria-label="待辦任務" className="task-center__list">{data.items.map((task) => {
        const copy = taskCopy[task.kind];
        return <Link className={`task-card task-card--${task.urgency.toLowerCase()}`} href={task.href} key={task.id}>
          <span className="task-card__urgency">{urgency(task)}</span><h2>{copy.title}</h2><p>{task.space.name} · {copy.detail}</p>
          <strong>{formatMinorUnit(task.amount_minor, task.space.currency, 'zh-TW')}</strong><span aria-hidden="true">開啟寶箱 →</span>
        </Link>;
      })}</section>}
    <small className="task-center__generated">狀態時間：{new Date(data.generated_at).toLocaleString('zh-TW')}</small>
  </main>;
}
