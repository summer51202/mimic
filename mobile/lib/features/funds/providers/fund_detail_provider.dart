import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/fund_repository.dart';

final fundDetailProvider =
    FutureProvider.autoDispose.family<FundDetailSummary, String>((
  Ref ref,
  String fundId,
) {
  return ref.watch(fundRepositoryProvider).fetchFundDetail(fundId);
});
