import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSettlementDto {
  @IsString()
  from_user_id: string;

  @IsString()
  to_user_id: string;

  @IsInt()
  @Min(1)
  amount_minor: number;

  @IsOptional()
  @IsDateString()
  period_start?: string;

  @IsOptional()
  @IsDateString()
  period_end?: string;

  @IsOptional()
  @IsIn(['manual', 'scheduled'])
  settlement_type?: 'manual' | 'scheduled';

  @IsOptional()
  @IsString()
  note?: string;
}
