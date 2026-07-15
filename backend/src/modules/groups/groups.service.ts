import { randomBytes } from 'crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { GroupStatus, GroupType, MemberRole, MemberStatus } from '@prisma/client';
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
      throw new ForbiddenException('Group is not active');
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
      throw new ForbiddenException('Only an active owner can create invites');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.groupInvite.create({
      data: {
        groupId,
        inviteCode: randomBytes(9).toString('base64url'),
        invitedById: actorUserId,
        invitedEmail: dto.email,
        expiresAt,
      },
    });
  }
}
