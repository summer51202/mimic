import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class ExpenseParticipantDraft {
  const ExpenseParticipantDraft({
    required this.userId,
    required this.name,
    required this.allocationLabel,
    required this.sortOrder,
  });

  final String userId;
  final String name;
  final String allocationLabel;
  final int sortOrder;
}

class ExpenseDraftPayload {
  const ExpenseDraftPayload({
    required this.fundId,
    required this.title,
    required this.amountText,
    required this.payerUserId,
    required this.splitMode,
    required this.note,
    required this.splits,
  });

  final String fundId;
  final String title;
  final String amountText;
  final String payerUserId;
  final String splitMode;
  final String note;
  final List<ExpenseParticipantDraft> splits;
}

abstract class ExpenseRepository {
  Future<void> createExpense(ExpenseDraftPayload payload);
}

class ExpenseRepositoryException implements Exception {
  const ExpenseRepositoryException(this.message);

  final String message;
}

class DemoExpenseRepository implements ExpenseRepository {
  @override
  Future<void> createExpense(ExpenseDraftPayload payload) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
  }
}

class RemoteExpenseRepository implements ExpenseRepository {
  RemoteExpenseRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<void> createExpense(ExpenseDraftPayload payload) async {
    final amountMinor = int.tryParse(payload.amountText) ?? 0;

    await _apiClient.post(
      '/funds/${payload.fundId}/expenses',
      data: <String, dynamic>{
        'title': payload.title,
        'note': payload.note,
        'amount_minor': amountMinor,
        'split_mode': payload.splitMode,
        'expense_type': 'fund_expense',
        'occurred_on': DateTime.now().toIso8601String().split('T').first,
        'payers': <Map<String, dynamic>>[
          <String, dynamic>{
            'payer_user_id': payload.payerUserId,
            'amount_minor': amountMinor,
          },
        ],
        'splits': payload.splits
            .map(
              (split) => <String, dynamic>{
                'user_id': split.userId,
                'split_type': payload.splitMode == 'hybrid'
                    ? 'ratio'
                    : payload.splitMode,
                'ratio_value': payload.splitMode == 'equal' ||
                        payload.splitMode == 'ratio' ||
                        payload.splitMode == 'hybrid'
                    ? 0.5
                    : null,
                'fixed_amount_minor': payload.splitMode == 'fixed'
                    ? amountMinor
                    : null,
                'sort_order': split.sortOrder,
              },
            )
            .toList(),
      },
    );
  }
}

final expenseRepositoryProvider = Provider<ExpenseRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteExpenseRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoExpenseRepository();
});

