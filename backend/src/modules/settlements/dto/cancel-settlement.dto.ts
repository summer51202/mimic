import { IsOptional, IsString } from 'class-validator';

export class CancelSettlementDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
