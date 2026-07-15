import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pairfund_mobile/features/expenses/data/expense_repository.dart';
import 'package:pairfund_mobile/features/expenses/providers/expense_form_controller.dart';

class ThrowingExpenseRepository implements ExpenseRepository {
  @override
  Future<void> createExpense(ExpenseDraftPayload payload) async {
    throw const ExpenseRepositoryException('API unavailable');
  }
}

void main() {
  test('submit resets loading state and exposes repository error', () async {
    final container = ProviderContainer(
      overrides: <Override>[
        expenseRepositoryProvider.overrideWith((ref) {
          return ThrowingExpenseRepository();
        }),
      ],
    );
    addTearDown(container.dispose);

    final notifier =
        container.read(expenseFormControllerProvider('fund-date').notifier);

    notifier.updateTitle('Dinner');
    notifier.updateAmount('1200');
    notifier.updateNote('Shared date night');

    final bool success = await notifier.submit();
    final ExpenseFormState state =
        container.read(expenseFormControllerProvider('fund-date'));

    expect(success, isFalse);
    expect(state.isSubmitting, isFalse);
    expect(state.errorMessage, 'API unavailable');
    expect(state.note, 'Shared date night');
  });
}
