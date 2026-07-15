import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateContributionDto {
  @IsString()
  contributor_user_id: string;

  @IsInt()
  @Min(1)
  amount_minor: number;

  @IsIn(['regular', 'one_time', 'adjustment', 'correction'])
  contribution_type: 'regular' | 'one_time' | 'adjustment' | 'correction';

  @IsDateString()
  occurred_on: string;

  @IsOptional()
  @IsString()
  note?: string;
}
