import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SpaceRequestDto } from '../../financial-spaces/dto/space-request.dto';

class PersonalReferenceMetadataDto extends SpaceRequestDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  tag_ids?: string[];

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export class CreatePersonalReferenceDto extends PersonalReferenceMetadataDto {
  @IsUUID()
  request_id: string;

  @IsUUID()
  source_expense_id: string;
}

export class UpdatePersonalReferenceDto extends PersonalReferenceMetadataDto {
  @IsUUID()
  request_id: string;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  version: number;
}

export class RemovePersonalReferenceDto extends SpaceRequestDto {
  @IsUUID()
  request_id: string;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  version: number;
}
