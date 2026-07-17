import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/fund_repository.dart';
import '../../home/data/group_dashboard.dart';

final fundDetailProvider =
    FutureProvider.autoDispose.family<FundDetailSummary, String>((
  Ref ref,
  String fundId,
) {
  return ref.watch(fundRepositoryProvider).fetchFundDetail(fundId);
});

final fundDetailScopeProvider =
    StateProvider.autoDispose.family<DashboardScope, String>(
  (Ref ref, String fundId) => DashboardScope.current,
);
