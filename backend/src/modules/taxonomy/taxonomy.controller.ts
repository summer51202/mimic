import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { TaxonomyService } from './taxonomy.service';
import { ArchiveTaxonomyDto, CreateTaxonomyDto, MergeTaxonomyDto, RenameTaxonomyDto, TaxonomyQueryDto } from './dto/taxonomy.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}
  private group(id: string | undefined): string | null {
    if (id !== undefined && !isUUID(id)) throw new BadRequestException('SPACE_INPUT_INVALID');
    return id ?? null;
  }
  @Get(['me/taxonomy', 'groups/:groupId/taxonomy'])
  async list(@CurrentUser() user: RequestUser, @Param('groupId') group: string | undefined, @Query() query: TaxonomyQueryDto) {
    return { data: await this.taxonomy.list(user.userId, this.group(group), query) };
  }
  @Post(['me/taxonomy', 'groups/:groupId/taxonomy'])
  async create(@CurrentUser() user: RequestUser, @Param('groupId') group: string | undefined, @Body() dto: CreateTaxonomyDto) {
    return { data: await this.taxonomy.create(user.userId, this.group(group), dto) };
  }
  @Patch(['me/taxonomy/:termId', 'groups/:groupId/taxonomy/:termId'])
  async rename(@CurrentUser() user: RequestUser, @Param('groupId') group: string | undefined, @Param('termId', ParseUUIDPipe) id: string, @Body() dto: RenameTaxonomyDto) {
    return { data: await this.taxonomy.rename(user.userId, this.group(group), id, dto) };
  }
  @Post(['me/taxonomy/:termId/archive', 'groups/:groupId/taxonomy/:termId/archive'])
  @HttpCode(200)
  async archive(@CurrentUser() user: RequestUser, @Param('groupId') group: string | undefined, @Param('termId', ParseUUIDPipe) id: string, @Body() dto: ArchiveTaxonomyDto) {
    return { data: await this.taxonomy.archive(user.userId, this.group(group), id, dto.version) };
  }
  @Post(['me/taxonomy/:termId/merge', 'groups/:groupId/taxonomy/:termId/merge'])
  @HttpCode(200)
  async merge(@CurrentUser() user: RequestUser, @Param('groupId') group: string | undefined, @Param('termId', ParseUUIDPipe) id: string, @Body() dto: MergeTaxonomyDto) {
    return { data: await this.taxonomy.merge(user.userId, this.group(group), id, dto) };
  }
  @Get('spaces/:spaceId/taxonomy')
  async picker(@CurrentUser() user: RequestUser, @Param('spaceId', ParseUUIDPipe) id: string, @Query() query: TaxonomyQueryDto) {
    return { data: await this.taxonomy.listForSpace(id, user.userId, query) };
  }
}
