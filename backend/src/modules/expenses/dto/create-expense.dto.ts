import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ExpensePayerDto {
  @IsString()
  payer_user_id: string;

  @IsInt()
  @Min(1)
  amount_minor: number;
}

class ExpenseSplitDto {
  @IsString()
  user_id: string;

  @IsIn(['equal', 'ratio', 'fixed'])
  split_type: 'equal' | 'ratio' | 'fixed';

  @IsOptional()
  @IsNumber()
  ratio_value?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  fixed_amount_minor?: number | null;

  @IsInt()
  sort_order: number;
}

export class CreateExpenseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsInt()
  @Min(1)
  amount_minor: number;

  @IsIn(['equal', 'ratio', 'fixed', 'hybrid'])
  split_mode: 'equal' | 'ratio' | 'fixed' | 'hybrid';

  @IsIn(['fund_expense', 'refund', 'adjustment', 'correction'])
  expense_type: 'fund_expense' | 'refund' | 'adjustment' | 'correction';

  @IsDateString()
  occurred_on: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpensePayerDto)
  payers: ExpensePayerDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  splits: ExpenseSplitDto[];
}

export type ExpenseSplitInput = ExpenseSplitDto;
