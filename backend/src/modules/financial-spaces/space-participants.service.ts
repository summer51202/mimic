import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SpaceParticipant, SpaceParticipantRole } from '@prisma/client';
import { FinancialSpacesService } from './financial-spaces.service';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantRoleDto } from './dto/update-participant-role.dto';
import { requireSharedParticipantLimit } from './shared-participant-limit';
import { requireSharedLifecycleReady } from '../shared-settlements/shared-lifecycle';

@Injectable()
export class SpaceParticipantsService {
  constructor(private readonly spaces: FinancialSpacesService) {}

  add(spaceId: string, actorId: string, dto: AddParticipantDto) {
    return this.spaces.mutate(spaceId, async tx => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId, true);
      this.spaces.requireWritable(space, dto.version);
      if (!space.groupId) throw new ConflictException('SPACE_SCOPE_IMMUTABLE');
      const target = await tx.groupMember.findFirst({ where: {
        groupId: space.groupId, userId: dto.user_id, status: 'ACTIVE',
        user: { status: 'ACTIVE' }, group: { status: 'ACTIVE' },
      } });
      if (!target) throw new NotFoundException('MEMBER_NOT_FOUND');
      const current = await tx.spaceParticipant.findFirst({ where: { spaceId, userId: dto.user_id, effectiveTo: null } });
      if (current) throw new ConflictException('SPACE_PARTICIPANT_EXISTS');
      requireSharedParticipantLimit(space.mode, 1 + await tx.spaceParticipant.count({ where: { spaceId, effectiveTo: null } }));
      const participant = await tx.spaceParticipant.create({ data: {
        spaceId, userId: dto.user_id, effectiveFrom: this.spaces.today(space.timezone), role: 'PARTICIPANT',
      } });
      await tx.financialSpace.update({ where: { id: spaceId }, data: { version: { increment: 1 } } });
      const after = this.project(participant);
      await this.spaces.audit(tx, spaceId, actorId, 'PARTICIPANT_ADDED', null, after);
      return after;
    });
  }

  changeRole(spaceId: string, participantId: string, actorId: string, dto: UpdateParticipantRoleDto) {
    return this.spaces.mutate(spaceId, async tx => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId, true);
      this.spaces.requireWritable(space, dto.version);
      if (!space.groupId) throw new ConflictException('SPACE_SCOPE_IMMUTABLE');
      const target = await this.target(tx, spaceId, participantId);
      if (target.effectiveTo !== null) throw new NotFoundException('SPACE_PARTICIPANT_NOT_FOUND');
      if (target.role === dto.role) return this.project(target);
      if (dto.role !== 'MANAGER') await this.requireOtherManager(tx, target, this.spaces.today(space.timezone), space.groupId);
      const updated = await tx.spaceParticipant.update({ where: { id: target.id }, data: { role: dto.role } });
      await tx.financialSpace.update({ where: { id: spaceId }, data: { version: { increment: 1 } } });
      const after = this.project(updated);
      await this.spaces.audit(tx, spaceId, actorId, 'ROLE_CHANGED', this.project(target), after);
      return after;
    });
  }

  end(spaceId: string, participantId: string, actorId: string, version: number) {
    return this.spaces.mutate(spaceId, async tx => {
      const target = await this.target(tx, spaceId, participantId);
      // A retry of one's own ended interval exposes no other participant or financial data.
      if (target.effectiveTo !== null && target.userId === actorId) {
        const actor = await tx.user.findFirst({ where: { id: actorId, status: 'ACTIVE' }, select: { id: true } });
        if (!actor) throw new NotFoundException('SPACE_NOT_FOUND');
        return this.project(target);
      }
      const { space, role } = await this.spaces.requireParticipant(tx, spaceId, actorId);
      if (target.userId !== actorId && role !== 'MANAGER') throw new ForbiddenException('SPACE_MANAGER_REQUIRED');
      if (target.effectiveTo !== null) return this.project(target);
      if (space.version !== version) throw new ConflictException('SPACE_VERSION_CONFLICT');
      if (!space.groupId) throw new ConflictException('SPACE_SCOPE_IMMUTABLE');
      if (space.mode === 'SHARED_EXPENSES') await requireSharedLifecycleReady(tx, spaceId, target.userId);
      else this.spaces.requireEmpty(space);
      const today = this.spaces.today(space.timezone);
      await this.requireOtherManager(tx, target, today, space.groupId);
      const ended = await tx.spaceParticipant.update({ where: { id: target.id }, data: { effectiveTo: today } });
      await tx.financialSpace.update({ where: { id: spaceId }, data: { version: { increment: 1 } } });
      const after = this.project(ended);
      await this.spaces.audit(tx, spaceId, actorId, 'PARTICIPANT_ENDED', this.project(target), after);
      return after;
    });
  }

  private async target(tx: Prisma.TransactionClient, spaceId: string, participantId: string) {
    const target = await tx.spaceParticipant.findFirst({ where: { id: participantId, spaceId } });
    if (!target) throw new NotFoundException('SPACE_NOT_FOUND');
    return target;
  }

  private async requireOtherManager(tx: Prisma.TransactionClient, target: SpaceParticipant, today: Date, groupId: string) {
    if (target.role !== SpaceParticipantRole.MANAGER) return;
    const count = await tx.spaceParticipant.count({ where: {
      id: { not: target.id }, spaceId: target.spaceId, role: 'MANAGER', effectiveTo: null, effectiveFrom: { lte: today },
      user: { status: 'ACTIVE', memberships: { some: { groupId, status: 'ACTIVE' } } },
    } });
    if (count === 0) throw new ConflictException('SPACE_MANAGER_REQUIRED');
  }

  private project(participant: SpaceParticipant) {
    return { id: participant.id, user_id: participant.userId, role: participant.role,
      effective_from: participant.effectiveFrom.toISOString().slice(0, 10),
      effective_to: participant.effectiveTo?.toISOString().slice(0, 10) ?? null };
  }
}
