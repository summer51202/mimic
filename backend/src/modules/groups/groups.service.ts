import { randomBytes } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupStatus,
  GroupType,
  InviteStatus,
  MemberRole,
  MemberStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateGroupInviteDto } from './dto/create-group-invite.dto';

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

  listMembers(groupId: string) {
    return this.prisma.groupMember.findMany({
      where: {
        groupId,
      },
      include: {
        user: true,
      },
      orderBy: { joinedAt: 'asc' },
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
    return this.prisma.$transaction(async (tx) => {
      const [invite, user] = await Promise.all([
        tx.groupInvite.findUnique({
          where: { inviteCode },
          include: { group: true },
        }),
        tx.user.findUnique({ where: { id: userId } }),
      ]);

      if (!invite || !user) {
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
      if (existingMembership) {
        throw new ConflictException('ALREADY_GROUP_MEMBER');
      }

      const consumed = await tx.groupInvite.updateMany({
        where: {
          id: invite.id,
          status: InviteStatus.PENDING,
          expiresAt: { gt: acceptedAt },
        },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedById: userId,
          acceptedAt,
        },
      });
      if (consumed.count !== 1) {
        throw new ConflictException('INVITE_ALREADY_USED');
      }

      const membership = await tx.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId,
          role: MemberRole.MEMBER,
          status: MemberStatus.ACTIVE,
        },
      });

      return { invite, group: invite.group, membership };
    });
  }
}
