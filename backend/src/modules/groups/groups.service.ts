import { randomBytes } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
  GroupStatus,
  GroupType,
  InviteStatus,
  MemberRole,
  MemberStatus,
  Prisma,
  SettlementStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lockGroupMutation } from '../prisma/group-mutation-lock';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateGroupInviteDto } from './dto/create-group-invite.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateGroupMemberDto } from './dto/update-group-member.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(userId: string, dto: CreateGroupDto) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: dto.name,
          groupType: dto.group_type === 'couple' ? GroupType.COUPLE : GroupType.GROUP,
          defaultCurrency: dto.default_currency,
          createdById: userId,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: MemberRole.OWNER,
        },
      });

      return group;
    });
  }

  listGroups(userId: string) {
    return this.prisma.group.findMany({
      where: {
        status: GroupStatus.ACTIVE,
        members: {
          some: {
            userId,
            status: MemberStatus.ACTIVE,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getGroupDetail(groupId: string, userId: string) {
    const access = await this.requireGroupAccess(groupId, userId);
    return { group: access.group, role: access.membership.role };
  }

  async listMembers(groupId: string, userId: string) {
    await this.requireGroupAccess(groupId, userId);
    return this.prisma.groupMember.findMany({
      where: {
        groupId,
        status: MemberStatus.ACTIVE,
      },
      include: {
        user: true,
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateGroup(
    groupId: string,
    userId: string,
    dto: UpdateGroupDto,
  ) {
    const access = await this.requireGroupAccess(groupId, userId);
    if (access.membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('OWNER_REQUIRED');
    }
    const updated = await this.prisma.group.updateMany({
      where: {
        id: groupId,
        status: GroupStatus.ACTIVE,
        members: {
          some: {
            userId,
            role: MemberRole.OWNER,
            status: MemberStatus.ACTIVE,
          },
        },
      },
      data: { name: dto.name },
    });
    if (updated.count !== 1) {
      throw new ForbiddenException('OWNER_REQUIRED');
    }
    return this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  }

  async updateMemberRole(
    groupId: string,
    actorUserId: string,
    targetUserId: string,
    dto: UpdateGroupMemberDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockGroupMutation(tx, groupId);

      const group = await tx.group.findFirst({
        where: { id: groupId, status: GroupStatus.ACTIVE },
      });
      if (!group) {
        throw new NotFoundException('GROUP_NOT_FOUND');
      }

      const actor = await tx.groupMember.findFirst({
        where: {
          groupId,
          userId: actorUserId,
          status: MemberStatus.ACTIVE,
        },
      });
      if (!actor) {
        throw new ForbiddenException('GROUP_ACCESS_DENIED');
      }
      if (actor.role !== MemberRole.OWNER) {
        throw new ForbiddenException('OWNER_REQUIRED');
      }

      const target = await tx.groupMember.findFirst({
        where: {
          groupId,
          userId: targetUserId,
          status: MemberStatus.ACTIVE,
        },
      });
      if (!target) {
        throw new NotFoundException('MEMBER_NOT_FOUND');
      }

      const requestedRole =
        dto.role === 'owner' ? MemberRole.OWNER : MemberRole.MEMBER;
      if (target.role === requestedRole) {
        throw new ConflictException('ROLE_UNCHANGED');
      }

      if (target.role === MemberRole.OWNER) {
        const activeOwnerCount = await tx.groupMember.count({
          where: {
            groupId,
            role: MemberRole.OWNER,
            status: MemberStatus.ACTIVE,
          },
        });
        if (activeOwnerCount <= 1) {
          throw new ConflictException('LAST_OWNER_REQUIRED');
        }
      }

      const updatedTarget = await tx.groupMember.update({
        where: { id: target.id },
        data: { role: requestedRole },
        include: { user: true },
      });

      await tx.auditLog.create({
        data: {
          groupId,
          actorUserId,
          entityType: AuditEntityType.GROUP,
          entityId: groupId,
          action: AuditAction.ROLE_CHANGE,
          beforeSnapshot: {
            role: target.role.toLowerCase(),
            status: target.status.toLowerCase(),
          },
          afterSnapshot: {
            role: requestedRole.toLowerCase(),
            status: target.status.toLowerCase(),
          },
          metadata: {
            operation:
              requestedRole === MemberRole.OWNER
                ? 'promote_member'
                : 'demote_owner',
            target_user_id: targetUserId,
          },
        },
      });

      return updatedTarget;
    });
  }

  async removeMember(
    groupId: string,
    actorUserId: string,
    targetUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockGroupMutation(tx, groupId);
      await this.requireActiveGroup(tx, groupId);

      const actor = await this.findActiveMembership(tx, groupId, actorUserId);
      if (!actor) {
        throw new ForbiddenException('GROUP_ACCESS_DENIED');
      }
      if (actor.role !== MemberRole.OWNER) {
        throw new ForbiddenException('OWNER_REQUIRED');
      }

      const target = await this.findActiveMembership(tx, groupId, targetUserId);
      if (!target) {
        throw new NotFoundException('MEMBER_NOT_FOUND');
      }
      if (actorUserId === targetUserId) {
        throw new ConflictException('CANNOT_REMOVE_SELF');
      }

      await this.requireOwnerCanDepart(tx, groupId, target.role);
      await this.requireFinancialEligibility(tx, groupId, targetUserId);

      const updated = await tx.groupMember.update({
        where: { id: target.id },
        data: { status: MemberStatus.REMOVED },
      });
      await this.auditMemberDeparture(
        tx, groupId, actorUserId, targetUserId, target.role,
        MemberStatus.REMOVED, 'remove_member',
      );
      return updated;
    });
  }

  async leaveGroup(groupId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockGroupMutation(tx, groupId);
      await this.requireActiveGroup(tx, groupId);

      const actor = await this.findActiveMembership(tx, groupId, actorUserId);
      if (!actor) {
        throw new ForbiddenException('GROUP_ACCESS_DENIED');
      }

      await this.requireOwnerCanDepart(tx, groupId, actor.role);
      await this.requireFinancialEligibility(tx, groupId, actorUserId);

      const updated = await tx.groupMember.update({
        where: { id: actor.id },
        data: { status: MemberStatus.LEFT },
      });
      await this.auditMemberDeparture(
        tx, groupId, actorUserId, actorUserId, actor.role,
        MemberStatus.LEFT, 'leave_group',
      );
      return updated;
    });
  }

  private async requireActiveGroup(
    tx: Prisma.TransactionClient,
    groupId: string,
  ) {
    const group = await tx.group.findFirst({
      where: { id: groupId, status: GroupStatus.ACTIVE },
    });
    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }
  }

  private findActiveMembership(
    tx: Prisma.TransactionClient,
    groupId: string,
    userId: string,
  ) {
    return tx.groupMember.findFirst({
      where: { groupId, userId, status: MemberStatus.ACTIVE },
    });
  }

  private async requireOwnerCanDepart(
    tx: Prisma.TransactionClient,
    groupId: string,
    role: MemberRole,
  ) {
    if (role !== MemberRole.OWNER) return;
    const ownerCount = await tx.groupMember.count({
      where: { groupId, role: MemberRole.OWNER, status: MemberStatus.ACTIVE },
    });
    if (ownerCount <= 1) {
      throw new ConflictException('LAST_OWNER_REQUIRED');
    }
  }

  private async requireFinancialEligibility(
    tx: Prisma.TransactionClient,
    groupId: string,
    userId: string,
  ) {
    const openPositions = await tx.$queryRaw<
      Array<{ fund_id: string; position_minor: bigint }>
    >(Prisma.sql`
      WITH input AS (
        SELECT ${groupId}::uuid AS group_id, ${userId}::uuid AS user_id
      ),
      entries AS (
        SELECT c.fund_id, c.amount_minor
        FROM contributions c
        JOIN input i ON c.contributor_user_id = i.user_id
        WHERE c.status = 'ACTIVE'

        UNION ALL

        SELECT e.fund_id,
          CASE WHEN e.expense_type = 'REFUND'
            THEN -p.amount_minor ELSE p.amount_minor END AS amount_minor
        FROM expense_payers p
        JOIN expenses e ON e.id = p.expense_id
        JOIN input i ON p.payer_user_id = i.user_id
        WHERE e.status = 'ACTIVE'

        UNION ALL

        SELECT e.fund_id,
          CASE WHEN e.expense_type = 'REFUND'
            THEN s.allocated_amount_minor ELSE -s.allocated_amount_minor END AS amount_minor
        FROM expense_splits s
        JOIN expenses e ON e.id = s.expense_id
        JOIN input i ON s.user_id = i.user_id
        WHERE e.status = 'ACTIVE'

        UNION ALL

        SELECT st.fund_id, -st.amount_minor AS amount_minor
        FROM settlements st
        JOIN input i ON st.from_user_id = i.user_id
        WHERE st.status = 'COMPLETED' AND st.from_user_id = i.user_id

        UNION ALL

        SELECT st.fund_id, st.amount_minor
        FROM settlements st
        JOIN input i ON st.to_user_id = i.user_id
        WHERE st.status = 'COMPLETED' AND st.to_user_id = i.user_id
      )
      SELECT f.id AS fund_id,
        SUM(entries.amount_minor)::bigint AS position_minor
      FROM funds f
      JOIN input i ON f.group_id = i.group_id
      LEFT JOIN entries ON entries.fund_id = f.id
      GROUP BY f.id
      HAVING SUM(entries.amount_minor) <> 0::bigint
    `);

    if (openPositions.length > 0) {
      throw new ConflictException('MEMBER_HAS_OPEN_BALANCE');
    }

    const pendingSettlement = await tx.settlement.findFirst({
      where: {
        fund: { groupId },
        status: SettlementStatus.PENDING,
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      select: { id: true },
    });
    if (pendingSettlement) {
      throw new ConflictException('MEMBER_HAS_PENDING_SETTLEMENT');
    }
  }

  private auditMemberDeparture(
    tx: Prisma.TransactionClient,
    groupId: string,
    actorUserId: string,
    targetUserId: string,
    role: MemberRole,
    status: MemberStatus,
    operation: 'remove_member' | 'leave_group',
  ) {
    return tx.auditLog.create({
      data: {
        groupId,
        actorUserId,
        entityType: AuditEntityType.GROUP,
        entityId: groupId,
        action: AuditAction.DELETE,
        beforeSnapshot: { role: role.toLowerCase(), status: 'active' },
        afterSnapshot: { role: role.toLowerCase(), status: status.toLowerCase() },
        metadata: { operation, target_user_id: targetUserId },
      },
    });
  }

  async createInvite(
    groupId: string,
    actorUserId: string,
    dto: CreateGroupInviteDto,
  ) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, status: GroupStatus.ACTIVE },
    });

    if (!group) {
      throw new ForbiddenException('GROUP_OWNER_REQUIRED');
    }

    const ownerMembership = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: actorUserId,
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!ownerMembership) {
      throw new ForbiddenException('GROUP_OWNER_REQUIRED');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.groupInvite.create({
      data: {
        groupId,
        inviteCode: randomBytes(9).toString('base64url'),
        invitedById: actorUserId,
        invitedEmail: dto.invited_email,
        expiresAt,
      },
    });
  }

  async acceptInvite(userId: string, inviteCode: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [invite, user] = await Promise.all([
        tx.groupInvite.findUnique({
          where: { inviteCode },
          include: { group: true },
        }),
        tx.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true },
        }),
      ]);

      if (!invite || !user || invite.group.status !== GroupStatus.ACTIVE) {
        throw new NotFoundException('INVITE_NOT_FOUND');
      }
      if (invite.status !== InviteStatus.PENDING) {
        throw new ConflictException('INVITE_ALREADY_USED');
      }

      const acceptedAt = new Date();
      if (invite.expiresAt <= acceptedAt) {
        throw new GoneException('INVITE_EXPIRED');
      }
      if (
        invite.invitedEmail &&
        invite.invitedEmail.toLowerCase() !== user.email.toLowerCase()
      ) {
        throw new ForbiddenException('INVITE_EMAIL_MISMATCH');
      }

      const existingMembership = await tx.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: invite.groupId, userId },
        },
      });
      if (existingMembership?.status === MemberStatus.ACTIVE) {
        throw new ConflictException('ALREADY_GROUP_MEMBER');
      }

      const consumed = await tx.groupInvite.updateMany({
        where: {
          id: invite.id,
          status: InviteStatus.PENDING,
          expiresAt: { gt: acceptedAt },
          group: { status: GroupStatus.ACTIVE },
        },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedById: userId,
          acceptedAt,
        },
      });
      if (consumed.count !== 1) {
        const currentInvite = await tx.groupInvite.findUnique({
          where: { inviteCode },
          select: {
            status: true,
            group: { select: { status: true } },
          },
        });
        if (
          !currentInvite ||
          currentInvite.group.status !== GroupStatus.ACTIVE
        ) {
          throw new NotFoundException('INVITE_NOT_FOUND');
        }
        throw new ConflictException('INVITE_ALREADY_USED');
      }

      let membership;
      if (existingMembership) {
        const reactivated = await tx.groupMember.updateMany({
          where: {
            id: existingMembership.id,
            status: existingMembership.status,
          },
          data: {
            status: MemberStatus.ACTIVE,
            role: MemberRole.MEMBER,
            joinedAt: acceptedAt,
          },
        });
        if (reactivated.count !== 1) {
          throw new ConflictException('ALREADY_GROUP_MEMBER');
        }
        membership = await tx.groupMember.findUniqueOrThrow({
          where: { id: existingMembership.id },
        });
      } else {
        membership = await tx.groupMember.create({
          data: {
            groupId: invite.groupId,
            userId,
            role: MemberRole.MEMBER,
            status: MemberStatus.ACTIVE,
          },
        });
      }

      return { invite, group: invite.group, membership };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        isGroupMembershipUniqueTarget(error.meta?.target)
      ) {
        throw new ConflictException('ALREADY_GROUP_MEMBER');
      }
      throw error;
    }
  }

  private async requireGroupAccess(groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, status: GroupStatus.ACTIVE },
    });
    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }
    const membership = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        status: MemberStatus.ACTIVE,
      },
    });
    if (!membership) {
      throw new ForbiddenException('GROUP_ACCESS_DENIED');
    }
    return { group, membership };
  }
}

function isGroupMembershipUniqueTarget(target: unknown): boolean {
  const fields = Array.isArray(target) ? target.map(String) : [String(target)];
  const normalized = fields.join(',').toLowerCase();
  return (
    (normalized.includes('group_id') || normalized.includes('groupid')) &&
    (normalized.includes('user_id') || normalized.includes('userid'))
  );
}
