import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ExpenseSplitMode,
  ExpenseType,
  Prisma,
  RecordStatus,
  SplitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, ExpenseSplitInput } from './dto/create-expense.dto';

interface AllocatedSplit {
  userId: string;
  splitType: SplitType;
  ratioValue: Prisma.Decimal | null;
  fixedAmountMinor: bigint | null;
  allocatedAmountMinor: bigint;
  sortOrder: number;
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async createExpense(fundId: string, actorUserId: string, dto: CreateExpenseDto) {
    this.validatePayerTotal(dto);
    const allocatedSplits = this.allocateSplits(dto);

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          fundId,
          title: dto.title,
          note: dto.note,
          amountMinor: BigInt(dto.amount_minor),
          splitMode: this.mapSplitMode(dto.split_mode),
          expenseType: this.mapExpenseType(dto.expense_type),
          occurredOn: this.toUtcDate(dto.occurred_on),
          createdById: actorUserId,
          updatedById: actorUserId,
        },
      });

      await tx.expensePayer.createMany({
        data: dto.payers.map((payer) => ({
          expenseId: expense.id,
          payerUserId: payer.payer_user_id,
          amountMinor: BigInt(payer.amount_minor),
        })),
      });

      await tx.expenseSplit.createMany({
        data: allocatedSplits.map((split) => ({
          expenseId: expense.id,
          userId: split.userId,
          splitType: split.splitType,
          ratioValue: split.ratioValue,
          fixedAmountMinor: split.fixedAmountMinor,
          allocatedAmountMinor: split.allocatedAmountMinor,
          sortOrder: split.sortOrder,
        })),
      });

      return expense;
    });
  }

  listExpenses(fundId: string) {
    return this.prisma.expense.findMany({
      where: {
        fundId,
        status: RecordStatus.ACTIVE,
      },
      include: {
        payers: true,
        splits: true,
      },
      orderBy: [{ occurredOn: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private validatePayerTotal(dto: CreateExpenseDto) {
    const payerTotal = dto.payers.reduce(
      (sum, payer) => sum + payer.amount_minor,
      0,
    );

    if (payerTotal !== dto.amount_minor) {
      throw new BadRequestException('PAYER_TOTAL_MISMATCH');
    }
  }

  private allocateSplits(dto: CreateExpenseDto): AllocatedSplit[] {
    const orderedSplits = [...dto.splits].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const fixedTotal = orderedSplits.reduce((sum, split) => {
      if (split.split_type !== 'fixed') {
        return sum;
      }

      return sum + (split.fixed_amount_minor ?? 0);
    }, 0);

    if (fixedTotal > dto.amount_minor) {
      throw new BadRequestException('SPLIT_TOTAL_MISMATCH');
    }

    const variableSplits = orderedSplits.filter(
      (split) => split.split_type !== 'fixed',
    );
    const remainingAmount = dto.amount_minor - fixedTotal;
    const variableAllocations = this.allocateVariableSplits(
      remainingAmount,
      variableSplits,
    );

    const allocated = orderedSplits.map((split) => {
      if (split.split_type === 'fixed') {
        const fixedAmount = split.fixed_amount_minor ?? 0;

        return this.toAllocatedSplit(split, fixedAmount);
      }

      return this.toAllocatedSplit(
        split,
        variableAllocations.get(split.user_id) ?? 0,
      );
    });
    const totalAllocated = allocated.reduce(
      (sum, split) => sum + Number(split.allocatedAmountMinor),
      0,
    );

    if (totalAllocated !== dto.amount_minor) {
      throw new BadRequestException('SPLIT_TOTAL_MISMATCH');
    }

    return allocated;
  }

  private allocateVariableSplits(
    amount: number,
    splits: ExpenseSplitInput[],
  ): Map<string, number> {
    const allocations = new Map<string, number>();
    if (splits.length === 0) {
      if (amount !== 0) {
        throw new BadRequestException('SPLIT_TOTAL_MISMATCH');
      }

      return allocations;
    }

    const ratioTotal = splits.reduce((sum, split) => {
      if (split.split_type === 'equal') {
        return sum + 1;
      }

      const ratioValue = split.ratio_value ?? 0;
      if (ratioValue <= 0) {
        throw new BadRequestException('INVALID_SPLIT_MODE');
      }

      return sum + ratioValue;
    }, 0);
    let allocatedSoFar = 0;

    splits.forEach((split, index) => {
      const isLast = index === splits.length - 1;
      const weight = split.split_type === 'equal' ? 1 : split.ratio_value ?? 0;
      const allocation = isLast
        ? amount - allocatedSoFar
        : Math.round((amount * weight) / ratioTotal);

      allocations.set(split.user_id, allocation);
      allocatedSoFar += allocation;
    });

    return allocations;
  }

  private toAllocatedSplit(
    split: ExpenseSplitInput,
    allocatedAmountMinor: number,
  ): AllocatedSplit {
    return {
      userId: split.user_id,
      splitType: this.mapSplitType(split.split_type),
      ratioValue:
        split.ratio_value === undefined || split.ratio_value === null
          ? null
          : new Prisma.Decimal(split.ratio_value),
      fixedAmountMinor:
        split.fixed_amount_minor === undefined ||
        split.fixed_amount_minor === null
          ? null
          : BigInt(split.fixed_amount_minor),
      allocatedAmountMinor: BigInt(allocatedAmountMinor),
      sortOrder: split.sort_order,
    };
  }

  private mapSplitMode(type: CreateExpenseDto['split_mode']) {
    const splitModes: Record<CreateExpenseDto['split_mode'], ExpenseSplitMode> = {
      equal: ExpenseSplitMode.EQUAL,
      ratio: ExpenseSplitMode.RATIO,
      fixed: ExpenseSplitMode.FIXED,
      hybrid: ExpenseSplitMode.HYBRID,
    };

    return splitModes[type];
  }

  private mapExpenseType(type: CreateExpenseDto['expense_type']) {
    const expenseTypes: Record<CreateExpenseDto['expense_type'], ExpenseType> = {
      fund_expense: ExpenseType.FUND_EXPENSE,
      refund: ExpenseType.REFUND,
      adjustment: ExpenseType.ADJUSTMENT,
      correction: ExpenseType.CORRECTION,
    };

    return expenseTypes[type];
  }

  private mapSplitType(type: ExpenseSplitInput['split_type']) {
    const splitTypes: Record<ExpenseSplitInput['split_type'], SplitType> = {
      equal: SplitType.EQUAL,
      ratio: SplitType.RATIO,
      fixed: SplitType.FIXED,
    };

    return splitTypes[type];
  }

  private toUtcDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }
}
