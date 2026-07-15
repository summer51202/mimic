import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class CorrectionDraft {
  const CorrectionDraft({
    required this.fundId,
    required this.title,
    required this.amountText,
    required this.note,
  });

  final String fundId;
  final String title;
  final String amountText;
  final String note;
}

class CorrectionRepositoryException implements Exception {
  const CorrectionRepositoryException(this.message);

  final String message;
}

abstract class CorrectionRepository {
  Future<void> createCorrection(CorrectionDraft draft);
}

class DemoCorrectionRepository implements CorrectionRepository {
  @override
  Future<void> createCorrection(CorrectionDraft draft) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }
}

class RemoteCorrectionRepository implements CorrectionRepository {
  RemoteCorrectionRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<void> createCorrection(CorrectionDraft draft) async {
    final amountMinor = int.tryParse(draft.amountText.trim()) ?? 0;

    await _apiClient.post(
      '/funds/${draft.fundId}/expenses',
      data: <String, dynamic>{
        'title': draft.title,
        'note': draft.note,
        'amount_minor': amountMinor,
        'split_mode': 'equal',
        'expense_type': 'correction',
        'occurred_on': DateTime.now().toIso8601String().split('T').first,
        'payers': <Map<String, dynamic>>[
          <String, dynamic>{
            'payer_user_id': 'user-a',
            'amount_minor': amountMinor,
          },
        ],
        'splits': <Map<String, dynamic>>[
          <String, dynamic>{
            'user_id': 'user-a',
            'split_type': 'equal',
            'sort_order': 1,
          },
          <String, dynamic>{
            'user_id': 'user-b',
            'split_type': 'equal',
            'sort_order': 2,
          },
        ],
      },
    );
  }
}

final correctionRepositoryProvider = Provider<CorrectionRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteCorrectionRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoCorrectionRepository();
});
