import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateGroupInviteDto } from './dto/create-group-invite.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateGroupMemberDto } from './dto/update-group-member.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGroupDto,
  ) {
    const group = await this.groupsService.createGroup(user.userId, dto);
    return { data: this.mapGroup(group) };
  }

  @Get()
  async listGroups(@CurrentUser() user: RequestUser) {
    const groups = await this.groupsService.listGroups(user.userId);
    return { data: groups.map((group) => this.mapGroup(group)) };
  }

  @Get(':groupId/members')
  async listMembers(
    @Param('groupId') groupId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const members = await this.groupsService.listMembers(groupId, user.userId);
    return {
      data: members.map((member) => ({
        user_id: member.userId,
        display_name: member.user.displayName,
        role: member.role.toLowerCase(),
        status: member.status.toLowerCase(),
      })),
    };
  }

  @Get(':groupId')
  async getGroupDetail(
    @Param('groupId') groupId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.groupsService.getGroupDetail(
      groupId,
      user.userId,
    );
    return {
      data: {
        ...this.mapGroup(result.group),
        role: result.role.toLowerCase(),
        current_user_id: user.userId,
      },
    };
  }

  @Patch(':groupId/members/:userId')
  async updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateGroupMemberDto,
  ) {
    const member = await this.groupsService.updateMemberRole(
      groupId,
      user.userId,
      targetUserId,
      dto,
    );
    return {
      data: {
        user_id: member.userId,
        display_name: member.user.displayName,
        role: member.role.toLowerCase(),
        status: member.status.toLowerCase(),
      },
    };
  }

  @Delete(':groupId/members/:userId')
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const member = await this.groupsService.removeMember(
      groupId,
      user.userId,
      targetUserId,
    );
    return {
      data: {
        user_id: member.userId,
        status: member.status.toLowerCase(),
      },
    };
  }

  @Post(':groupId/leave')
  async leaveGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const member = await this.groupsService.leaveGroup(groupId, user.userId);
    return {
      data: {
        group_id: member.groupId,
        status: member.status.toLowerCase(),
      },
    };
  }

  @Patch(':groupId')
  async updateGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateGroupDto,
  ) {
    const group = await this.groupsService.updateGroup(
      groupId,
      user.userId,
      dto,
    );
    return { data: this.mapGroup(group) };
  }

  @Post(':groupId/invites')
  async createInvite(
    @Param('groupId') groupId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGroupInviteDto,
  ) {
    const invite = await this.groupsService.createInvite(
      groupId,
      user.userId,
      dto,
    );
    return {
      data: {
        invite_id: invite.id,
        invite_code: invite.inviteCode,
        invited_email: invite.invitedEmail,
        expires_at: invite.expiresAt.toISOString(),
        status: invite.status.toLowerCase(),
      },
    };
  }

  private mapGroup(group: {
    id: string;
    name: string;
    groupType: string;
    defaultCurrency: string;
    status: string;
  }) {
    return {
      id: group.id,
      name: group.name,
      group_type: group.groupType.toLowerCase(),
      default_currency: group.defaultCurrency,
      status: group.status.toLowerCase(),
    };
  }
}
