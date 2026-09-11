import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { ExpenseInputDto } from '../../expense-records/expense-input.dto';
import { SpaceRequestDto } from '../../financial-spaces/dto/space-request.dto';

export class SharedAmountDto {
  @IsUUID() user_id: string;
  @IsString() @Matches(/^(0|[1-9][0-9]*)$/) @MaxLength(19) amount_minor: string;
}
export class CreateSharedExpenseDto extends ExpenseInputDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(16) @ValidateNested({ each: true }) @Type(() => SharedAmountDto)
  payers: SharedAmountDto[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(16) @ValidateNested({ each: true }) @Type(() => SharedAmountDto)
  allocations: SharedAmountDto[];
}
export class UpdateSharedExpenseDto extends CreateSharedExpenseDto {
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
}
export class DeleteSharedExpenseDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
}
export class SharedExpenseQueryDto extends SpaceRequestDto {
  @ValidateIf((_o, value) => value !== undefined) @IsUUID() cursor?: string;
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value)
  @IsInt() @Min(1) @Max(100) limit?: number;
}
