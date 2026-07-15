import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/settlement_repository.dart';

final settlementProvider =
    FutureProvider.autoDispose.family<SettlementSummary, String>((
  Ref ref,
  String fundId,
) {
  return ref.watch(settlementRepositoryProvider).fetchSettlementSummary(fundId);
});
