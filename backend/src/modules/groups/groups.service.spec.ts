import { ForbiddenException } from '@nestjs/common';
import { GroupStatus, MemberRole, MemberStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateGroupInviteDto } from './dto/create-group-invite.dto';
import { GroupsService } from './groups.service';

describe('GroupsService.createInvite', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows an active owner of an active group to create a seven-day invite', async () => {
    const now = new Date('2026-07-16T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const invite = { id: 'invite-1' };
    const prisma = {
      group: {
        findFirst: jest.fn().mockResolvedValue({ id: 'group-1' }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      },
      groupInvite: {
        create: jest.fn().mockResolvedValue(invite),
      },
    };
    const service = new GroupsService(prisma as never);

    await expect(
      service.createInvite('group-1', 'owner-1', {
        email: 'partner@example.com',
      }),
    ).resolves.toBe(invite);
    expect(prisma.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
    });
    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'owner-1',
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });
    expect(prisma.groupInvite.create).toHaveBeenCalledWith({
      data: {
        groupId: 'group-1',
        invitedById: 'owner-1',
        invitedEmail: 'partner@example.com',
        inviteCode: expect.stringMatching(/^[A-Za-z0-9_-]{12}$/),
        expiresAt: new Date('2026-07-23T00:00:00.000Z'),
      },
    });
  });

  it('rejects an actor who is not an active owner', async () => {
    const prisma = {
      group: {
        findFirst: jest.fn().mockResolvedValue({ id: 'group-1' }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      groupInvite: {
        create: jest.fn(),
      },
    };
    const service = new GroupsService(prisma as never);

    await expect(
      service.createInvite('group-1', 'member-1', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.groupInvite.create).not.toHaveBeenCalled();
  });
});

describe('CreateGroupInviteDto', () => {
  it('trims and lowercases an optional email', async () => {
    const dto = plainToInstance(CreateGroupInviteDto, {
      email: '  Partner@Example.COM  ',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.email).toBe('partner@example.com');
  });
});
