import { Transform } from 'class-transformer';
import { IsInt, IsString, IsUUID, Matches, Max, Min, ValidateIf } from 'class-validator';
import { SpaceRequestDto } from '../../financial-spaces/dto/space-request.dto';
import { ExpenseInputDto } from '../../expense-records/expense-input.dto';
export class CreatePersonalExpenseDto extends ExpenseInputDto {}
export class UpdatePersonalExpenseDto extends CreatePersonalExpenseDto {
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
}
export class DeletePersonalExpenseDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version: number;
}
export class PersonalMonthQueryDto extends SpaceRequestDto {
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month: string;
  @ValidateIf((_o, value) => value !== undefined) @IsUUID() cursor?: string;
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value)
  @IsInt() @Min(1) @Max(100) limit?: number;
}
