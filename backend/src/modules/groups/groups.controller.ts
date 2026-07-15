import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
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
  async listMembers(@Param('groupId') groupId: string) {
    const members = await this.groupsService.listMembers(groupId);
    return {
      data: members.map((member) => ({
        user_id: member.userId,
        display_name: member.user.displayName,
        role: member.role.toLowerCase(),
        status: member.status.toLowerCase(),
      })),
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
