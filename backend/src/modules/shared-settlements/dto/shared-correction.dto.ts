import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { SpaceRequestDto } from '../../financial-spaces/dto/space-request.dto';
import { SharedAmountDto } from '../../shared-expenses/dto/shared-expense.dto';

export class SharedCorrectionDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) source_revision: number;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) occurred_on: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(2000) reason: string;
}
export class SharedExpenseCorrectionDto extends SharedCorrectionDto {
  @IsUUID() source_expense_id: string;
  @IsString() @Matches(/^(0|[1-9][0-9]*)$/) @MaxLength(19) amount_minor: string;
  @IsArray() @ArrayMaxSize(16) @ValidateNested({ each: true }) @Type(() => SharedAmountDto) payers: SharedAmountDto[];
  @IsArray() @ArrayMaxSize(16) @ValidateNested({ each: true }) @Type(() => SharedAmountDto) allocations: SharedAmountDto[];
}
export class SharedTransferCorrectionDto extends SharedCorrectionDto {
  @IsUUID() source_transfer_id: string;
  @IsString() @Matches(/^(0|[1-9][0-9]*)$/) @MaxLength(65) actual_amount_minor: string;
}
