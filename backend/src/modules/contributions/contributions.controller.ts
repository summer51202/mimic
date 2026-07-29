import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActivityQueryDto } from '../../common/dto/activity-query.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post('funds/:fundId/contributions')
  async createContribution(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateContributionDto,
  ) {
    const contribution = await this.contributionsService.createContribution(
      fundId,
      user.userId,
      dto,
    );

    return { data: this.mapContribution(contribution) };
  }

  @Get('funds/:fundId/contributions')
  async listContributions(
    @Param('fundId') fundId: string,
    @CurrentUser() user: RequestUser,
    @Query() query: ActivityQueryDto,
  ) {
    const contributions =
      await this.contributionsService.listContributions(fundId, user.userId, query);

    return { data: contributions.map((item) => this.mapContribution(item)) };
  }

  private mapContribution(contribution: {
    id: string;
    fundId: string;
    contributorUserId: string;
    amountMinor: bigint;
    contributionType: string;
    note: string | null;
    occurredOn: Date;
    status: string;
  }) {
    return {
      id: contribution.id,
      fund_id: contribution.fundId,
      contributor_user_id: contribution.contributorUserId,
      amount_minor: contribution.amountMinor.toString(),
      contribution_type: contribution.contributionType.toLowerCase(),
      occurred_on: contribution.occurredOn.toISOString().slice(0, 10),
      note: contribution.note,
      status: contribution.status.toLowerCase(),
    };
  }
}
