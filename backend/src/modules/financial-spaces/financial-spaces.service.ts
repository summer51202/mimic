import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialSpace, Prisma, SpaceAuditAction, SpaceParticipantRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { canChangeMode } from './financial-space-policy';
import { lockFinancialSpace } from './financial-space-lock';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { ParticipantSpace, SpaceListItem } from './financial-spaces.types';
import { requireSharedParticipantLimit } from './shared-participant-limit';

@Injectable()
export class FinancialSpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actorId: string, groupId: string | null, dto: CreateSpaceDto): Promise<ParticipantSpace> {
    if ((groupId === null) !== (dto.mode === 'PERSONAL_EXPENSES')) {
      throw new BadRequestException('SPACE_INPUT_INVALID');
    }
    const id = randomUUID();
    return this.prisma.$transaction(async tx => {
      await lockFinancialSpace(tx, id, groupId);
      const membership = groupId ? await this.requireGroupMember(tx, groupId, actorId) : null;
      const actor = await tx.user.findFirst({ where: { id: actorId, status: 'ACTIVE' }, select: { timezone: true } });
      if (!actor) throw new NotFoundException('SPACE_NOT_FOUND');
      const timezone = dto.timezone ?? actor.timezone;
      const openedOn = this.today(timezone);
      const currency = dto.currency ?? membership?.group.defaultCurrency ?? 'TWD';
      if (!Intl.supportedValuesOf('currency').includes(currency)) throw new BadRequestException('SPACE_INPUT_INVALID');
      const space = await tx.financialSpace.create({ data: {
        id, name: dto.name, mode: dto.mode, currency,
        timezone, openedOn, groupId, ownerUserId: groupId === null ? actorId : null, createdById: actorId,
        participants: { create: { userId: actorId, role: 'MANAGER', effectiveFrom: openedOn } },
      } });
      const projection = this.project(space, 'MANAGER');
      await this.audit(tx, id, actorId, 'CREATE', null, projection);
      return projection;
    });
  }

  async listPersonal(actorId: string): Promise<ParticipantSpace[]> {
    const spaces = await this.prisma.financialSpace.findMany({
      where: { ownerUserId: actorId, owner: { status: 'ACTIVE' } }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return spaces.map(space => this.project(space, 'MANAGER'));
  }

  listGroup(groupId: string, actorId: string): Promise<SpaceListItem[]> {
    return this.prisma.$transaction(async tx => {
      const member = await this.requireGroupMember(tx, groupId, actorId);
      const spaces = await tx.financialSpace.findMany({
        where: { groupId, participants: { some: { userId: actorId, effectiveTo: null } } },
        include: { participants: { where: { userId: actorId, effectiveTo: null } } },
      });
      const items: SpaceListItem[] = spaces.filter(space => space.participants[0].effectiveFrom <= this.today(space.timezone))
        .map(space => this.project(space, space.participants[0].role));
      if (member.role === 'OWNER') {
        const governance = await tx.financialSpace.findMany({
          where: { groupId, id: { notIn: items.map(item => item.id) } },
          select: { id: true, name: true, mode: true, status: true },
        });
        for (const space of governance) {
          if (space.mode !== 'PERSONAL_EXPENSES') items.push({ ...space, mode: space.mode, access: 'GOVERNANCE' });
        }
      }
      return items.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    }, { isolationLevel: 'RepeatableRead' });
  }

  get(spaceId: string, actorId: string): Promise<ParticipantSpace> {
    return this.prisma.$transaction(async tx => {
      const { space, role } = await this.requireParticipant(tx, spaceId, actorId);
      return this.project(space, role);
    }, { isolationLevel: 'RepeatableRead' });
  }

  update(spaceId: string, actorId: string, dto: UpdateSpaceDto): Promise<ParticipantSpace> {
    return this.mutate(spaceId, async tx => {
      const { space, role } = await this.requireParticipant(tx, spaceId, actorId, true);
      this.requireWritable(space, dto.version);
      const mode = dto.mode ?? space.mode;
      if (!canChangeMode(space.mode, mode, space.firstFormalRecordAt !== null)) {
        throw new ConflictException(space.mode === 'PERSONAL_EXPENSES' || mode === 'PERSONAL_EXPENSES'
          ? 'SPACE_SCOPE_IMMUTABLE' : 'SPACE_MODE_LOCKED');
      }
      if ((dto.name === undefined || dto.name === space.name) && mode === space.mode) {
        return this.project(space, role);
      }
      if (mode !== space.mode) requireSharedParticipantLimit(mode, await tx.spaceParticipant.count({ where: { spaceId, effectiveTo: null } }));
      const updated = await tx.financialSpace.update({ where: { id: spaceId }, data: {
        name: dto.name, mode, version: { increment: 1 },
      } });
      const after = this.project(updated, role);
      await this.audit(tx, spaceId, actorId, 'UPDATE', this.project(space, role), after);
      return after;
    });
  }

  archive(spaceId: string, actorId: string, version: number): Promise<ParticipantSpace> {
    return this.mutate(spaceId, async tx => {
      const { space, role } = await this.requireParticipant(tx, spaceId, actorId, true);
      if (space.status === 'ARCHIVED') return this.project(space, role);
      this.requireWritable(space, version);
      this.requireEmpty(space);
      const updated = await tx.financialSpace.update({ where: { id: spaceId }, data: {
        status: 'ARCHIVED', archivedAt: new Date(), version: { increment: 1 },
      } });
      const after = this.project(updated, role);
      await this.audit(tx, spaceId, actorId, 'ARCHIVE', this.project(space, role), after);
      return after;
    });
  }

  async listParticipants(spaceId: string, actorId: string) {
    return this.prisma.$transaction(async tx => {
      await this.requireParticipant(tx, spaceId, actorId);
      const participants = await tx.spaceParticipant.findMany({ where: { spaceId },
        include: { user: { select: { displayName: true } } }, orderBy: [{ effectiveFrom: 'asc' }, { id: 'asc' }],
      });
      return participants.map(p => ({ id: p.id, user_id: p.userId, display_name: p.user.displayName,
        role: p.role, effective_from: p.effectiveFrom.toISOString().slice(0, 10),
        effective_to: p.effectiveTo?.toISOString().slice(0, 10) ?? null }));
    }, { isolationLevel: 'RepeatableRead' });
  }

  async mutate<T>(spaceId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const identity = await this.prisma.financialSpace.findUnique({ where: { id: spaceId }, select: { groupId: true } });
    if (!identity) throw new NotFoundException('SPACE_NOT_FOUND');
    return this.prisma.$transaction(async tx => {
      await lockFinancialSpace(tx, spaceId, identity.groupId);
      return operation(tx);
    });
  }

  async requireParticipant(tx: Prisma.TransactionClient, spaceId: string, actorId: string, manager = false) {
    const space = await tx.financialSpace.findFirst({ where: {
      id: spaceId, participants: { some: { userId: actorId, effectiveTo: null, user: { status: 'ACTIVE' } } },
    } });
    if (!space) throw new NotFoundException('SPACE_NOT_FOUND');
    if (space.groupId) {
      const groupMember = await tx.groupMember.findFirst({ where: { groupId: space.groupId, userId: actorId, status: 'ACTIVE' } });
      if (!groupMember) throw new NotFoundException('SPACE_NOT_FOUND');
    }
    const participant = await tx.spaceParticipant.findFirst({ where: {
      spaceId, userId: actorId, effectiveTo: null, effectiveFrom: { lte: this.today(space.timezone) },
    } });
    if (!participant) throw new NotFoundException('SPACE_NOT_FOUND');
    if (manager && participant.role !== 'MANAGER') throw new ForbiddenException('SPACE_MANAGER_REQUIRED');
    return { space, role: participant.role, participant };
  }

  async requireGroupMember(tx: Prisma.TransactionClient, groupId: string, actorId: string) {
    const membership = await tx.groupMember.findFirst({ where: {
      groupId, userId: actorId, status: 'ACTIVE', group: { status: 'ACTIVE' }, user: { status: 'ACTIVE' },
    }, include: { group: { select: { defaultCurrency: true } } } });
    if (!membership) throw new ForbiddenException('GROUP_ACCESS_DENIED');
    return membership;
  }

  requireWritable(space: FinancialSpace, version: number): void {
    if (space.status !== 'ACTIVE') throw new ConflictException('SPACE_ARCHIVED');
    if (space.version !== version) throw new ConflictException('SPACE_VERSION_CONFLICT');
  }

  requireEmpty(space: FinancialSpace): void {
    if (space.firstFormalRecordAt !== null) throw new ConflictException('SPACE_HAS_FINANCIAL_HISTORY');
  }

  today(timezone: string): Date {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date());
      const part = (type: string) => parts.find(p => p.type === type)!.value;
      return new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`);
    } catch {
      throw new BadRequestException('SPACE_INPUT_INVALID');
    }
  }

  project(space: FinancialSpace, role: SpaceParticipantRole): ParticipantSpace {
    return { access: 'PARTICIPANT', id: space.id, name: space.name, mode: space.mode, status: space.status,
      currency: space.currency, timezone: space.timezone, opened_on: space.openedOn.toISOString().slice(0, 10),
      group_id: space.groupId, owner_user_id: space.ownerUserId, role, version: space.version,
      first_formal_record_at: space.firstFormalRecordAt?.toISOString() ?? null };
  }

  async audit(tx: Prisma.TransactionClient, spaceId: string, actorId: string, action: SpaceAuditAction, before: object | null, after: object) {
    await tx.spaceAuditEvent.create({ data: {
      spaceId, actorUserId: actorId, action,
      before: before === null ? Prisma.DbNull : JSON.parse(JSON.stringify(before)),
      after: JSON.parse(JSON.stringify(after)),
    } });
  }
}
