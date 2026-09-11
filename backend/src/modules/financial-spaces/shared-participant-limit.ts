import { FinancialSpaceMode } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { MAX_SETTLEMENT_POSITIONS } from '../shared-settlements/minimum-transfers';
export function requireSharedParticipantLimit(mode: FinancialSpaceMode, count: number): void {
  if (mode === 'SHARED_EXPENSES' && count > MAX_SETTLEMENT_POSITIONS) throw new ConflictException('SHARED_PARTICIPANT_LIMIT');
}
