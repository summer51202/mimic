import { Prisma } from '@prisma/client';

export async function lockGroupMutation(
  tx: Prisma.TransactionClient,
  groupId: string,
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${groupId}, 0))`,
  );
}
