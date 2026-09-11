import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpaceVersionDto } from './dto/space-version.dto';
import { FinancialSpacesService } from './financial-spaces.service';
import { SpaceParticipantsService } from './space-participants.service';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantRoleDto } from './dto/update-participant-role.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class FinancialSpacesController {
  constructor(private readonly spaces: FinancialSpacesService, private readonly membership: SpaceParticipantsService) {}

  @Post('me/spaces')
  async createPersonal(@CurrentUser() user: RequestUser, @Body() dto: CreateSpaceDto) {
    return { data: await this.spaces.create(user.userId, null, dto) };
  }
  @Get('me/spaces')
  async listPersonal(@CurrentUser() user: RequestUser) {
    return { data: await this.spaces.listPersonal(user.userId) };
  }
  @Post('groups/:groupId/spaces')
  async createShared(@Param('groupId', ParseUUIDPipe) groupId: string, @CurrentUser() user: RequestUser, @Body() dto: CreateSpaceDto) {
    return { data: await this.spaces.create(user.userId, groupId, dto) };
  }
  @Get('groups/:groupId/spaces')
  async listShared(@Param('groupId', ParseUUIDPipe) groupId: string, @CurrentUser() user: RequestUser) {
    return { data: await this.spaces.listGroup(groupId, user.userId) };
  }
  @Get('spaces/:spaceId')
  async detail(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return { data: await this.spaces.get(id, user.userId) };
  }
  @Patch('spaces/:spaceId')
  async update(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateSpaceDto) {
    return { data: await this.spaces.update(id, user.userId, dto) };
  }
  @Post('spaces/:spaceId/archive')
  @HttpCode(200)
  async archive(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: SpaceVersionDto) {
    return { data: await this.spaces.archive(id, user.userId, dto.version) };
  }
  @Get('spaces/:spaceId/participants')
  async participants(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return { data: await this.spaces.listParticipants(id, user.userId) };
  }
  @Post('spaces/:spaceId/participants')
  async addParticipant(@Param('spaceId', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: AddParticipantDto) {
    return { data: await this.membership.add(id, user.userId, dto) };
  }
  @Patch('spaces/:spaceId/participants/:participantId/role')
  async changeRole(@Param('spaceId', ParseUUIDPipe) id: string, @Param('participantId', ParseUUIDPipe) participantId: string,
    @CurrentUser() user: RequestUser, @Body() dto: UpdateParticipantRoleDto) {
    return { data: await this.membership.changeRole(id, participantId, user.userId, dto) };
  }
  @Post('spaces/:spaceId/participants/:participantId/end')
  @HttpCode(200)
  async endParticipant(@Param('spaceId', ParseUUIDPipe) id: string, @Param('participantId', ParseUUIDPipe) participantId: string,
    @CurrentUser() user: RequestUser, @Body() dto: SpaceVersionDto) {
    return { data: await this.membership.end(id, participantId, user.userId, dto.version) };
  }
}
