import { Prisma } from '@prisma/client';
import { lockGroupMutation } from '../prisma/group-mutation-lock';

export async function lockFinancialSpace(tx: Prisma.TransactionClient, spaceId: string, groupId: string | null): Promise<void> {
  if (groupId !== null) await lockGroupMutation(tx, groupId);
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`space:${spaceId}`}, 0))`);
}
