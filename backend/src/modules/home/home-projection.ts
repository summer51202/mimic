export type TaskUrgency = 'ACTION_REQUIRED' | 'OVERDUE' | 'ATTENTION';
export type HomeTaskKind = 'POOLED_CONTRIBUTION' | 'POOLED_REIMBURSEMENT_SEND'
  | 'POOLED_REIMBURSEMENT_RECEIVE' | 'SHARED_TRANSFER_SEND'
  | 'SHARED_TRANSFER_RECEIVE' | 'POOLED_SHORTFALL';

export interface HomeTask {
  id: string;
  kind: HomeTaskKind;
  urgency: TaskUrgency;
  space: { id: string; name: string; mode: 'SHARED_EXPENSES' | 'POOLED_FUND'; currency: string };
  amount_minor: string;
  due_on: string | null;
  href: string;
}

export function occurrenceUrgency(dueOn: string, today: string): TaskUrgency {
  return dueOn < today ? 'OVERDUE' : 'ACTION_REQUIRED';
}

const urgencyOrder: Record<TaskUrgency, number> = { OVERDUE: 0, ATTENTION: 1, ACTION_REQUIRED: 2 };

export function compareTasks(left: HomeTask, right: HomeTask): number {
  return urgencyOrder[left.urgency] - urgencyOrder[right.urgency]
    || (left.due_on ?? '9999-12-31').localeCompare(right.due_on ?? '9999-12-31')
    || left.space.name.localeCompare(right.space.name)
    || left.id.localeCompare(right.id);
}
