import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    const currentUser = await this.usersService.findById(user.userId);
    return { data: this.mapMe(currentUser) };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateMeDto) {
    return this.updateCurrentUser(user, dto);
  }

  @Post('me')
  async updateMeCompatibility(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMeDto,
  ) {
    return this.updateCurrentUser(user, dto);
  }

  private async updateCurrentUser(
    user: RequestUser,
    dto: UpdateMeDto,
  ) {
    const updatedUser = await this.usersService.updateProfile(user.userId, {
      displayName: dto.display_name,
      locale: dto.locale,
      timezone: dto.timezone,
    });
    return { data: this.mapMe(updatedUser) };
  }

  private mapMe(
    user: {
      id: string;
      mimicId: string;
      email: string;
      displayName: string;
      locale: string;
      timezone: string;
    } | null,
  ) {
    if (!user) {
      return {};
    }

    return {
      id: user.id,
      mimic_id: user.mimicId,
      email: user.email,
      display_name: user.displayName,
      locale: user.locale,
      timezone: user.timezone,
    };
  }
}
