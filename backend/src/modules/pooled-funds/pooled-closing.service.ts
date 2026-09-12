import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { CreatePooledReturnPlanDto, PooledVersionDto } from './dto/pooled-fund.dto';
import { PooledOperationsService } from './pooled-operations.service';
import { projectReturnPlan, returnPlanInclude } from './pooled-projection';
import { PooledQueriesService } from './pooled-queries.service';
import { parsePooledPositive } from './pooled-values';

@Injectable()
export class PooledClosingService {
  constructor(private readonly spaces: FinancialSpacesService, private readonly operations: PooledOperationsService,
    private readonly queries: PooledQueriesService) {}

  start(spaceId: string, actorId: string, dto: PooledVersionDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'CLOSING_START', dto, true, async (tx, space) => {
      this.spaces.requireWritable(space, dto.version);
      if (await tx.pooledContributionOccurrence.findFirst({ where: { commitment: { spaceId }, status: 'EXPECTED' } })) throw new ConflictException('POOLED_OCCURRENCE_PENDING');
      if (await tx.pooledReimbursement.findFirst({ where: { spaceId, status: { not: 'COMPLETED' } } })) throw new ConflictException('POOLED_REIMBURSEMENT_PENDING');
      const summary = await this.queries.summaryTx(tx, spaceId);
      if (summary.shortfall_minor !== '0') throw new ConflictException('POOLED_SHORTFALL');
      const updated = await tx.financialSpace.update({ where: { id: spaceId }, data: { status: 'CLOSING', version: { increment: 1 } } });
      const result = { space: this.spaces.project(updated, 'MANAGER'), summary };
      await this.spaces.audit(tx, spaceId, actorId, 'POOLED_CLOSING_STARTED', this.spaces.project(space, 'MANAGER'), result.space);
      return result;
    });
  }

  createPlan(spaceId: string, actorId: string, dto: CreatePooledReturnPlanDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'RETURN_PLAN_CREATE', dto, true, async (tx, space) => {
      if (space.version !== dto.version) throw new ConflictException('SPACE_VERSION_CONFLICT');
      const summary = await this.queries.summaryTx(tx, spaceId);
      const book = BigInt(summary.book_balance_minor);
      if (book <= 0n || dto.returns.length === 0) throw new ConflictException('POOLED_RETURN_TOTAL_INVALID');
      const users = new Set<string>(); let total = 0n;
      for (const item of dto.returns) {
        if (users.has(item.recipient_user_id)) throw new BadRequestException('POOLED_RETURN_RECIPIENT_INVALID');
        users.add(item.recipient_user_id);
        try { total += parsePooledPositive(item.amount_minor); } catch { throw new BadRequestException('POOLED_RETURN_TOTAL_INVALID'); }
      }
      if (total !== book) throw new ConflictException('POOLED_RETURN_TOTAL_INVALID');
      const eligible = await tx.spaceParticipant.count({ where: { spaceId, userId: { in: [...users] }, effectiveTo: null, user: { status: 'ACTIVE' } } });
      if (eligible !== users.size) throw new BadRequestException('POOLED_RETURN_RECIPIENT_INVALID');
      const plan = await tx.pooledReturnPlan.create({ data: { spaceId, createdById: actorId,
        returns: { create: dto.returns.map((item) => ({ recipientUserId: item.recipient_user_id, amountMinor: item.amount_minor })) } }, include: returnPlanInclude });
      await tx.financialSpace.update({ where: { id: spaceId }, data: { version: { increment: 1 } } });
      const result = projectReturnPlan(plan);
      await this.spaces.audit(tx, spaceId, actorId, 'POOLED_RETURN_PLAN_CREATED', null, result);
      return result;
    }, ['CLOSING']);
  }

  transition(spaceId: string, returnId: string, actorId: string, dto: PooledVersionDto, received: boolean) {
    return this.operations.run(spaceId, actorId, dto.request_id, received ? 'RETURN_RECEIVED' : 'RETURN_SENT',
      { returnId, version: dto.version }, !received, async (tx, space) => {
        const row = await tx.pooledReturn.findFirst({ where: { id: returnId, plan: { spaceId } }, include: { plan: true } });
        if (!row) throw new NotFoundException('POOLED_RETURN_NOT_FOUND');
        if (received && row.recipientUserId !== actorId) throw new ForbiddenException('POOLED_RETURN_ACTOR_REQUIRED');
        if ((!received && (row.status === 'SENT' || row.status === 'COMPLETED')) || (received && row.status === 'COMPLETED')) {
          const current = await tx.pooledReturnPlan.findUniqueOrThrow({ where: { id: row.planId }, include: returnPlanInclude });
          return { plan: projectReturnPlan(current), summary: await this.queries.summaryTx(tx, spaceId) };
        }
        if ((received && row.status !== 'SENT') || (!received && row.status !== 'AWAITING_PAYMENT')) throw new ConflictException('POOLED_RETURN_STATE_CONFLICT');
        if (row.version !== dto.version) throw new ConflictException('POOLED_RETURN_VERSION_CONFLICT');
        const now = new Date();
        await tx.pooledReturn.update({ where: { id: returnId }, data: { status: received ? 'COMPLETED' : 'SENT', version: { increment: 1 },
          ...(received ? { receivedById: actorId, receivedAt: now } : { sentById: actorId, sentAt: now }) } });
        await tx.pooledTransitionPosting.create({ data: { spaceId, entityType: 'RETURN', entityId: returnId,
          transition: received ? 'RECEIVED' : 'SENT', amountMinor: row.amountMinor, actorUserId: actorId, postedAt: now } });
        if (received && await tx.pooledReturn.count({ where: { planId: row.planId, status: { not: 'COMPLETED' } } }) === 0) {
          await tx.pooledReturnPlan.update({ where: { id: row.planId }, data: { status: 'COMPLETED', version: { increment: 1 } } });
        }
        const plan = await tx.pooledReturnPlan.findUniqueOrThrow({ where: { id: row.planId }, include: returnPlanInclude });
        const result = { plan: projectReturnPlan(plan), summary: await this.queries.summaryTx(tx, spaceId) };
        await this.operations.changed(tx, space, actorId, received ? 'POOLED_RETURN_RECEIVED' : 'POOLED_RETURN_SENT', null, result.plan);
        return result;
      }, ['CLOSING']);
  }

  archive(spaceId: string, actorId: string, dto: PooledVersionDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'ARCHIVE', dto, true, async (tx, space) => {
      if (space.version !== dto.version) throw new ConflictException('SPACE_VERSION_CONFLICT');
      if (await tx.pooledContributionOccurrence.findFirst({ where: { commitment: { spaceId }, status: 'EXPECTED' } })) throw new ConflictException('POOLED_OCCURRENCE_PENDING');
      if (await tx.pooledReimbursement.findFirst({ where: { spaceId, status: { not: 'COMPLETED' } } })) throw new ConflictException('POOLED_REIMBURSEMENT_PENDING');
      if (await tx.pooledReturn.findFirst({ where: { plan: { spaceId }, status: { not: 'COMPLETED' } } })) throw new ConflictException('POOLED_RETURN_PENDING');
      const summary = await this.queries.summaryTx(tx, spaceId);
      if (summary.book_balance_minor !== '0' || summary.pending_reimbursement_minor !== '0') throw new ConflictException('POOLED_BALANCE_NOT_ZERO');
      const updated = await tx.financialSpace.update({ where: { id: spaceId }, data: { status: 'ARCHIVED', archivedAt: new Date(), version: { increment: 1 } } });
      const result = { space: this.spaces.project(updated, 'MANAGER'), summary };
      await this.spaces.audit(tx, spaceId, actorId, 'ARCHIVE', this.spaces.project(space, 'MANAGER'), result.space);
      return result;
    }, ['CLOSING']);
  }
}
