import { createHash } from 'crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { ExpenseMutationAction, FinancialSpace, Prisma, SpaceAuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { lockFinancialSpace } from '../financial-spaces/financial-space-lock';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { ExpenseMutationResult, ExpenseWriteResult } from './expense-records.types';

@Injectable()
export class ExpenseMutationService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService, private readonly taxonomy: TaxonomyService) {}
  run(spaceId: string, actorId: string, requestId: string, action: ExpenseMutationAction, payload: object,
    operation: (tx: Prisma.TransactionClient, space: FinancialSpace) => Promise<ExpenseWriteResult>): Promise<ExpenseMutationResult> {
    return this.prisma.$transaction(async tx => {
      await this.taxonomy.lockScope(tx, actorId, null);
      await lockFinancialSpace(tx, spaceId, null);
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId);
      if (space.mode !== 'PERSONAL_EXPENSES' || space.ownerUserId !== actorId) throw new ConflictException('SPACE_MODE_MISMATCH');
      const payloadHash = createHash('sha256').update(JSON.stringify([action, payload])).digest('hex');
      const receipt = await tx.expenseMutationReceipt.findUnique({ where: { spaceId_actorUserId_requestId: { spaceId, actorUserId: actorId, requestId } } });
      if (receipt) {
        if (receipt.payloadHash !== payloadHash || receipt.action !== action) throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
        return receipt.response as unknown as ExpenseMutationResult;
      }
      if (space.status !== 'ACTIVE') throw new ConflictException('SPACE_ARCHIVED');
      const written = await operation(tx, space);
      if (written.changed) {
        await tx.financialSpace.update({ where: { id: spaceId }, data: { version: { increment: 1 },
          ...(action === 'CREATE' && space.firstFormalRecordAt === null ? { firstFormalRecordAt: new Date() } : {}),
        } });
        const actions: Record<ExpenseMutationAction, SpaceAuditAction> = { CREATE: 'EXPENSE_CREATED', UPDATE: 'EXPENSE_UPDATED', DELETE: 'EXPENSE_DELETED' };
        await this.spaces.audit(tx, spaceId, actorId, actions[action], written.before, written.record);
      }
      const result: ExpenseMutationResult = { record: written.record, change_minor: written.delta.toString() };
      await tx.expenseMutationReceipt.create({ data: { spaceId, actorUserId: actorId, requestId, action, payloadHash, response: JSON.parse(JSON.stringify(result)) } });
      return result;
    });
  }
}
