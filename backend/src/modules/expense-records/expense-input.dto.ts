import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString, IsUUID, Length, Matches, MaxLength, ValidateIf } from 'class-validator';
import { SpaceRequestDto } from '../financial-spaces/dto/space-request.dto';

export class ExpenseInputDto extends SpaceRequestDto {
  @IsUUID() request_id: string;
  @IsString() @Matches(/^[1-9][0-9]*$/) @MaxLength(19) amount_minor: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) occurred_on: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 200) title: string;
  @ValidateIf((_o, value) => value !== undefined) @IsUUID() category_id?: string;
  @ValidateIf((_o, value) => value !== undefined) @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID('all', { each: true }) tag_ids?: string[];
  @ValidateIf((_o, value) => value !== undefined && value !== null) @IsString() @MaxLength(2000) note?: string | null;
}
