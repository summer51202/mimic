import { FinancialSpaceMode, FinancialSpaceStatus } from '@prisma/client';

export interface HomeActivity {
  id: string;
  title: string;
  occurred_on: string;
  amount_minor: string;
}

export interface GovernanceHomeCard {
  access: 'GOVERNANCE'; id: string; name: string;
  mode: Exclude<FinancialSpaceMode, 'PERSONAL_EXPENSES'>; status: FinancialSpaceStatus;
}

export interface ParticipantHomeCardBase {
  access: 'PARTICIPANT'; id: string; name: string; currency: string;
  status: FinancialSpaceStatus; recent_activity: HomeActivity[];
}

export type ParticipantHomeCard = ParticipantHomeCardBase & (
  | { mode: 'PERSONAL_EXPENSES'; month: string; spending_minor: string;
      recent_categories: Array<{ category_id: string; category_name: string; spending_minor: string }> }
  | { mode: 'SHARED_EXPENSES'; spending_minor: string; current_user_position_minor: string;
      pending_batch: { id: string; period_end: string } | null }
  | { mode: 'POOLED_FUND'; book_balance_minor: string; pending_reimbursement_minor: string;
      available_balance_minor: string; shortfall_minor: string;
      next_occurrence: { id: string; due_on: string; amount_minor: string; timing: 'UPCOMING' | 'DUE' | 'OVERDUE' } | null }
);

export type HomeCard = GovernanceHomeCard | ParticipantHomeCard;
