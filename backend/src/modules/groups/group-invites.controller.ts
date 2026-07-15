import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { AcceptGroupInviteDto } from './dto/accept-group-invite.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('group-invites')
export class GroupInvitesController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('accept')
  async acceptInvite(
    @CurrentUser() user: RequestUser,
    @Body() dto: AcceptGroupInviteDto,
  ) {
    const result = await this.groupsService.acceptInvite(
      user.userId,
      dto.invite_code,
    );
    return {
      data: {
        group_id: result.group.id,
        group_name: result.group.name,
        role: result.membership.role.toLowerCase(),
        joined_at: result.membership.joinedAt.toISOString(),
      },
    };
  }
}
