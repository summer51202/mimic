import { IsISO8601, IsOptional } from 'class-validator';

export class CompleteSettlementDto {
  @IsOptional()
  @IsISO8601()
  completed_at?: string;
}
