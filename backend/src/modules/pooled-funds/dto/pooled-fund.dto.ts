import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { SpaceRequestDto } from '../../financial-spaces/dto/space-request.dto';
import { ExpenseInputDto } from '../../expense-records/expense-input.dto';

export class PooledOverrideDto {
  @IsUUID() user_id: string;
  @IsString() @Matches(/^[1-9]\d*$/) @MaxLength(65) amount_minor: string;
}
export class CreatePooledCommitmentDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
  @IsString() @MaxLength(100) name: string;
  @IsIn(['WEEKLY', 'MONTHLY']) cadence: 'WEEKLY' | 'MONTHLY';
  @IsInt() @Min(1) @Max(52) interval: number;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) starts_on: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) ends_on?: string | null;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) generate_through: string;
  @IsString() @Matches(/^[1-9]\d*$/) @MaxLength(65) default_amount_minor: string;
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PooledOverrideDto) overrides: PooledOverrideDto[];
}
export class UpdatePooledCommitmentDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
  @IsString() @Matches(/^[1-9]\d*$/) @MaxLength(65) default_amount_minor: string;
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PooledOverrideDto) overrides: PooledOverrideDto[];
}
export class PooledVersionDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
}
export class CreatePooledExpenseDto extends ExpenseInputDto {
  @IsIn(['FUND_PAID', 'PARTICIPANT_ADVANCED']) payment_source: 'FUND_PAID' | 'PARTICIPANT_ADVANCED';
  @IsOptional() @IsUUID() advanced_by_user_id?: string;
}
export class UpdatePooledExpenseDto extends CreatePooledExpenseDto {
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
}
export class CreatePooledCorrectionDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsIn(['EXPENSE', 'REIMBURSEMENT', 'RETURN', 'CONTRIBUTION'])
  source_kind: 'EXPENSE' | 'REIMBURSEMENT' | 'RETURN' | 'CONTRIBUTION';
  @IsUUID() source_id: string;
  @IsString() @Matches(/^-?[1-9]\d*$/) @MaxLength(66) amount_minor: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) occurred_on: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(2000) reason: string;
}
export class PooledReturnDto {
  @IsUUID() recipient_user_id: string;
  @IsString() @Matches(/^[1-9]\d*$/) @MaxLength(65) amount_minor: string;
}
export class CreatePooledReturnPlanDto extends PooledVersionDto {
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PooledReturnDto) returns: PooledReturnDto[];
}
