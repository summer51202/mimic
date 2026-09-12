import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { HomeService } from './home.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly service: HomeService) {}

  @Get('home')
  async home(@CurrentUser() actor: RequestUser, @Query('group_id') groupId?: string) {
    return { data: await this.service.home(actor.userId, groupId) };
  }

  @Get('tasks')
  async tasks(@CurrentUser() actor: RequestUser) {
    return { data: await this.service.tasks(actor.userId) };
  }
}
