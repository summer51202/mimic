import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function requirePooledParticipantReady(tx: Prisma.TransactionClient, spaceId: string, userId: string) {
  if (await tx.pooledContributionOccurrence.findFirst({ where: { commitment: { spaceId }, participantUserId: userId, status: 'EXPECTED' }, select: { id: true } }))
    throw new ConflictException('POOLED_OCCURRENCE_PENDING');
  if (await tx.pooledReimbursement.findFirst({ where: { spaceId, participantUserId: userId, status: { not: 'COMPLETED' } }, select: { id: true } }))
    throw new ConflictException('POOLED_REIMBURSEMENT_PENDING');
  if (await tx.pooledReturn.findFirst({ where: { plan: { spaceId }, recipientUserId: userId, status: { not: 'COMPLETED' } }, select: { id: true } }))
    throw new ConflictException('POOLED_RETURN_PENDING');
}
