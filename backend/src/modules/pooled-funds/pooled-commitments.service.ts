import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { CreatePooledCommitmentDto, PooledOverrideDto, PooledVersionDto, UpdatePooledCommitmentDto } from './dto/pooled-fund.dto';
import { PooledOperationsService } from './pooled-operations.service';
import { commitmentInclude, projectCommitment, projectContribution, projectOccurrence } from './pooled-projection';
import { materializeDueDates, parsePooledPositive } from './pooled-values';
import { PooledQueriesService } from './pooled-queries.service';

type OccurrenceRow = Prisma.PooledContributionOccurrenceGetPayload<{ include: { contribution: true } }>;

@Injectable()
export class PooledCommitmentsService {
  constructor(private readonly spaces: FinancialSpacesService, private readonly operations: PooledOperationsService,
    private readonly queries: PooledQueriesService) {}

  create(spaceId: string, actorId: string, dto: CreatePooledCommitmentDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'COMMITMENT_CREATE', dto, true, async (tx, space) => {
      this.spaces.requireWritable(space, dto.version);
      let dueDates: string[];
      try {
        parsePooledPositive(dto.default_amount_minor);
        dueDates = materializeDueDates({ cadence: dto.cadence, interval: dto.interval, startsOn: dto.starts_on, endsOn: dto.ends_on ?? null }, dto.generate_through);
      } catch { throw new BadRequestException('POOLED_RECURRENCE_INVALID'); }
      const participants = await tx.spaceParticipant.findMany({ where: { spaceId, effectiveTo: null,
        effectiveFrom: { lte: this.spaces.today(space.timezone) }, user: { status: 'ACTIVE' } }, select: { userId: true } });
      const overrides = this.parseOverrides(participants.map((row) => row.userId), dto.default_amount_minor, dto.overrides);
      const assignments = participants.map((row) => ({ participantUserId: row.userId, amountMinor: overrides.get(row.userId) ?? dto.default_amount_minor }));
      const commitment = await tx.pooledCommitment.create({ data: { spaceId, name: dto.name, cadence: dto.cadence, interval: dto.interval,
        startsOn: new Date(`${dto.starts_on}T00:00:00.000Z`), endsOn: dto.ends_on ? new Date(`${dto.ends_on}T00:00:00.000Z`) : null,
        generatedThrough: new Date(`${dto.generate_through}T00:00:00.000Z`), createdById: actorId,
        assignments: { create: assignments }, occurrences: { create: dueDates.flatMap((dueOn) => assignments.map((assignment) => ({
          participantUserId: assignment.participantUserId, amountMinor: assignment.amountMinor, dueOn: new Date(`${dueOn}T00:00:00.000Z`),
        }))) } }, include: commitmentInclude });
      const result = projectCommitment(commitment, this.today(space.timezone));
      await this.operations.changed(tx, space, actorId, 'POOLED_COMMITMENT_CREATED', null, result);
      return result;
    });
  }

  update(spaceId: string, commitmentId: string, actorId: string, dto: UpdatePooledCommitmentDto) {
    return this.operations.run(spaceId, actorId, dto.request_id, 'COMMITMENT_UPDATE', { commitmentId, ...dto }, true, async (tx, space) => {
      const current = await this.commitment(tx, spaceId, commitmentId);
      if (current.version !== dto.version) throw new ConflictException('POOLED_COMMITMENT_VERSION_CONFLICT');
      const overrides = this.parseOverrides(current.assignments.map((row) => row.participantUserId), dto.default_amount_minor, dto.overrides);
      for (const assignment of current.assignments) {
        const amountMinor = overrides.get(assignment.participantUserId) ?? dto.default_amount_minor;
        await tx.pooledCommitmentAssignment.update({ where: { commitmentId_participantUserId: { commitmentId, participantUserId: assignment.participantUserId } }, data: { amountMinor } });
        await tx.pooledContributionOccurrence.updateMany({ where: { commitmentId, participantUserId: assignment.participantUserId, status: 'EXPECTED' }, data: { amountMinor, version: { increment: 1 } } });
      }
      await tx.pooledCommitment.update({ where: { id: commitmentId }, data: { version: { increment: 1 } } });
      const updated = await this.commitment(tx, spaceId, commitmentId);
      const before = projectCommitment(current, this.today(space.timezone));
      const result = projectCommitment(updated, this.today(space.timezone));
      await this.operations.changed(tx, space, actorId, 'POOLED_COMMITMENT_UPDATED', before, result);
      return result;
    });
  }

  transition(spaceId: string, occurrenceId: string, actorId: string, dto: PooledVersionDto, action: 'confirm' | 'skip' | 'cancel') {
    const operation = action === 'confirm' ? 'OCCURRENCE_CONFIRM' : action === 'skip' ? 'OCCURRENCE_SKIP' : 'OCCURRENCE_CANCEL';
    return this.operations.run(spaceId, actorId, dto.request_id, operation, { occurrenceId, version: dto.version }, false, async (tx, space) => {
      const row = await tx.pooledContributionOccurrence.findFirst({ where: { id: occurrenceId, commitment: { spaceId } }, include: { contribution: true } });
      if (!row) throw new NotFoundException('POOLED_OCCURRENCE_NOT_FOUND');
      if (action === 'cancel') await this.spaces.requireParticipant(tx, spaceId, actorId, true);
      else if (row.participantUserId !== actorId) throw new ForbiddenException('POOLED_OCCURRENCE_ACTOR_REQUIRED');
      const target = action === 'confirm' ? 'CONFIRMED' : action === 'skip' ? 'SKIPPED' : 'CANCELED';
      if (row.status === target) return this.transitionResult(tx, row, spaceId, space.timezone);
      if (row.status !== 'EXPECTED') throw new ConflictException('POOLED_OCCURRENCE_STATE_CONFLICT');
      if (row.version !== dto.version) throw new ConflictException('POOLED_OCCURRENCE_VERSION_CONFLICT');
      const now = new Date();
      const updated = await tx.pooledContributionOccurrence.update({ where: { id: occurrenceId }, data: { status: target, version: { increment: 1 },
        ...(action === 'confirm' ? { confirmedById: actorId, confirmedAt: now } : action === 'skip' ? { skippedById: actorId, skippedAt: now } : { canceledById: actorId, canceledAt: now }) }, include: { contribution: true } });
      let contribution = updated.contribution;
      if (action === 'confirm') {
        contribution = await tx.pooledContribution.create({ data: { spaceId, occurrenceId, participantUserId: row.participantUserId,
          amountMinor: row.amountMinor, confirmedById: actorId, confirmedAt: now } });
        await tx.pooledTransitionPosting.create({ data: { spaceId, entityType: 'CONTRIBUTION', entityId: occurrenceId,
          transition: 'CONFIRMED', amountMinor: row.amountMinor, actorUserId: actorId, postedAt: now } });
      }
      const result = { occurrence: projectOccurrence({ ...updated, contribution } as OccurrenceRow, this.today(space.timezone)),
        contribution: contribution ? projectContribution(contribution) : null, summary: await this.queries.summaryTx(tx, spaceId) };
      const audit = action === 'confirm' ? 'POOLED_OCCURRENCE_CONFIRMED' : action === 'skip' ? 'POOLED_OCCURRENCE_SKIPPED' : 'POOLED_OCCURRENCE_CANCELED';
      await this.operations.changed(tx, space, actorId, audit, projectOccurrence(row, this.today(space.timezone)), result.occurrence);
      return result;
    });
  }

  private async transitionResult(tx: Prisma.TransactionClient, row: OccurrenceRow, spaceId: string, timezone: string) {
    const loaded = await tx.pooledContributionOccurrence.findUniqueOrThrow({ where: { id: row.id }, include: { contribution: true } });
    return { occurrence: projectOccurrence(loaded, this.today(timezone)), contribution: loaded.contribution ? projectContribution(loaded.contribution) : null,
      summary: await this.queries.summaryTx(tx, spaceId) };
  }
  private parseOverrides(userIds: string[], defaultAmount: string, rows: PooledOverrideDto[]) {
    const result = new Map<string, string>();
    try { parsePooledPositive(defaultAmount); } catch { throw new BadRequestException('POOLED_ASSIGNMENT_INVALID'); }
    for (const row of rows) {
      if (!userIds.includes(row.user_id) || result.has(row.user_id)) throw new BadRequestException('POOLED_ASSIGNMENT_INVALID');
      try { parsePooledPositive(row.amount_minor); } catch { throw new BadRequestException('POOLED_ASSIGNMENT_INVALID'); }
      result.set(row.user_id, row.amount_minor);
    }
    return result;
  }
  private async commitment(tx: Prisma.TransactionClient, spaceId: string, id: string) {
    const row = await tx.pooledCommitment.findFirst({ where: { id, spaceId }, include: commitmentInclude });
    if (!row) throw new NotFoundException('POOLED_COMMITMENT_NOT_FOUND');
    return row;
  }
  private today(timezone: string) { return this.spaces.today(timezone).toISOString().slice(0, 10); }
}
