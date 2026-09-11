import { createHash } from 'crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { FinancialSpace, Prisma, SharedOperationAction, SpaceAuditAction } from '@prisma/client';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
@Injectable()
export class SharedOperationsService {
  constructor(private readonly spaces: FinancialSpacesService) {}
  run<T extends object>(spaceId: string, actorId: string, requestId: string, action: SharedOperationAction, payload: object, manager: boolean,
    operation: (tx: Prisma.TransactionClient, space: FinancialSpace) => Promise<T>): Promise<T> {
    return this.spaces.mutate(spaceId, async tx => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId, manager);
      if (space.mode !== 'SHARED_EXPENSES') throw new ConflictException('SPACE_MODE_MISMATCH');
      const payloadHash = createHash('sha256').update(JSON.stringify(canonical({ action, payload }))).digest('hex');
      const receipt = await tx.sharedOperationReceipt.findUnique({ where: { spaceId_actorUserId_requestId: { spaceId, actorUserId: actorId, requestId } } });
      if (receipt) {
        if (receipt.action !== action || receipt.payloadHash !== payloadHash) throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
        return receipt.response as unknown as T;
      }
      if (space.status !== 'ACTIVE') throw new ConflictException('SPACE_ARCHIVED');
      const result = await operation(tx, space);
      await tx.sharedOperationReceipt.create({ data: { spaceId, actorUserId: actorId, requestId, action, payloadHash, response: JSON.parse(JSON.stringify(result)) } });
      return result;
    });
  }
  async changed(tx: Prisma.TransactionClient, space: FinancialSpace, actorId: string, action: SpaceAuditAction, before: object | null, after: object) {
    await tx.financialSpace.update({ where: { id: space.id }, data: { version: { increment: 1 },
      ...(space.firstFormalRecordAt === null ? { firstFormalRecordAt: new Date() } : {}) } });
    await this.spaces.audit(tx, space.id, actorId, action, before, after);
  }
}
