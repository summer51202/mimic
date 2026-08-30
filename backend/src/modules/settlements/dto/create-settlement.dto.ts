import { IsISO8601, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateSettlementDto {
  @IsString()
  from_user_id: string;

  @IsString()
  to_user_id: string;

  @IsInt()
  @Min(1)
  amount_minor: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  period_start?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  period_end?: string;

  @IsOptional()
  @IsIn(['manual', 'scheduled'])
  settlement_type?: 'manual' | 'scheduled';

  @IsOptional()
  @IsString()
  note?: string;
}
