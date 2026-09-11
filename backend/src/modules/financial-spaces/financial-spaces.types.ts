import { FinancialSpaceMode, FinancialSpaceStatus, SpaceParticipantRole } from '@prisma/client';

export interface ParticipantSpace {
  access: 'PARTICIPANT';
  id: string;
  name: string;
  mode: FinancialSpaceMode;
  status: FinancialSpaceStatus;
  currency: string;
  timezone: string;
  opened_on: string;
  group_id: string | null;
  owner_user_id: string | null;
  role: SpaceParticipantRole;
  version: number;
  first_formal_record_at: string | null;
}

export interface GovernanceSpace {
  access: 'GOVERNANCE';
  id: string;
  name: string;
  mode: Exclude<FinancialSpaceMode, 'PERSONAL_EXPENSES'>;
  status: FinancialSpaceStatus;
}

export type SpaceListItem = ParticipantSpace | GovernanceSpace;
