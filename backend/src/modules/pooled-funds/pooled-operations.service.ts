import { createHash } from 'crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { FinancialSpace, FinancialSpaceStatus, PooledOperationAction, Prisma, SpaceAuditAction } from '@prisma/client';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
@Injectable()
export class PooledOperationsService {
  constructor(private readonly spaces: FinancialSpacesService) {}
  run<T extends object>(spaceId: string, actorId: string, requestId: string, action: PooledOperationAction, payload: object,
    manager: boolean, operation: (tx: Prisma.TransactionClient, space: FinancialSpace) => Promise<T>,
    allowedStatuses: FinancialSpaceStatus[] = ['ACTIVE']): Promise<T> {
    return this.spaces.mutate(spaceId, async (tx) => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId, manager);
      if (space.mode !== 'POOLED_FUND') throw new ConflictException('SPACE_MODE_MISMATCH');
      const payloadHash = createHash('sha256').update(JSON.stringify(canonical({ action, payload }))).digest('hex');
      const receipt = await tx.pooledOperationReceipt.findUnique({ where: { spaceId_actorUserId_requestId: { spaceId, actorUserId: actorId, requestId } } });
      if (receipt) {
        if (receipt.action !== action || receipt.payloadHash !== payloadHash) throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
        return receipt.response as unknown as T;
      }
      if (!allowedStatuses.includes(space.status)) throw new ConflictException('POOLED_SPACE_STATE_CONFLICT');
      const result = await operation(tx, space);
      await tx.pooledOperationReceipt.create({ data: { spaceId, actorUserId: actorId, requestId, action, payloadHash, response: JSON.parse(JSON.stringify(result)) } });
      return result;
    });
  }
  async changed(tx: Prisma.TransactionClient, space: FinancialSpace, actorId: string, action: SpaceAuditAction, before: object | null, after: object) {
    await tx.financialSpace.update({ where: { id: space.id }, data: { version: { increment: 1 }, ...(space.firstFormalRecordAt === null ? { firstFormalRecordAt: new Date() } : {}) } });
    await this.spaces.audit(tx, space.id, actorId, action, before, after);
  }
}
