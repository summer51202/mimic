import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { SharedSettlementsService } from './shared-settlements.service';
import { CreateSharedBatchDto, SharedPageDto, SharedVersionDto } from './dto/shared-settlement.dto';
@Controller('spaces/:spaceId/shared-settlements')
@UseGuards(JwtAuthGuard)
export class SharedSettlementsController {
  constructor(private readonly settlements: SharedSettlementsService) {}
  @Post()
  async start(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() actor: RequestUser, @Body() dto: CreateSharedBatchDto) {
    return { data: await this.settlements.start(spaceId, actor.userId, dto) };
  }
  @Get()
  async list(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() actor: RequestUser, @Query() query: SharedPageDto) {
    return { data: await this.settlements.list(spaceId, actor.userId, query) };
  }
  @Get(':batchId')
  async get(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('batchId', ParseUUIDPipe) batchId: string, @CurrentUser() actor: RequestUser) {
    return { data: await this.settlements.get(spaceId, batchId, actor.userId) };
  }
  @Post(':batchId/cancel') @HttpCode(200)
  async cancel(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('batchId', ParseUUIDPipe) batchId: string, @CurrentUser() actor: RequestUser, @Body() dto: SharedVersionDto) {
    return { data: await this.settlements.cancel(spaceId, batchId, actor.userId, dto) };
  }
  @Post(':batchId/transfers/:transferId/sent') @HttpCode(200)
  async sent(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('transferId', ParseUUIDPipe) transferId: string, @CurrentUser() actor: RequestUser, @Body() dto: SharedVersionDto) {
    return { data: await this.settlements.confirm(spaceId, batchId, transferId, actor.userId, dto, false) };
  }
  @Post(':batchId/transfers/:transferId/received') @HttpCode(200)
  async received(@Param('spaceId', ParseUUIDPipe) spaceId: string, @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('transferId', ParseUUIDPipe) transferId: string, @CurrentUser() actor: RequestUser, @Body() dto: SharedVersionDto) {
    return { data: await this.settlements.confirm(spaceId, batchId, transferId, actor.userId, dto, true) };
  }
}
