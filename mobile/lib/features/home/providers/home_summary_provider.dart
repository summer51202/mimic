import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../groups/data/group_summary.dart';
import '../../groups/providers/selected_group_provider.dart';
import '../data/home_repository.dart';
import '../data/group_dashboard.dart';

final dashboardScopeProvider = StateProvider.autoDispose
    .family<DashboardScope, String?>((Ref ref, String? groupId) {
  return DashboardScope.current;
});

class HomeGroupsReconciliationCoordinator {
  int _latestGeneration = 0;

  Future<List<GroupSummary>> run(
    Future<List<GroupSummary>> groupsFuture,
    Future<void> Function(List<GroupSummary>) reconcile, {
    bool Function()? isActive,
  }) async {
    final generation = ++_latestGeneration;
    final groups = await groupsFuture;
    await Future<void>(() {});
    if (generation == _latestGeneration && (isActive?.call() ?? true)) {
      await reconcile(groups);
    }
    return groups;
  }
}

final homeGroupsReconciliationCoordinatorProvider =
    Provider<HomeGroupsReconciliationCoordinator>(
  (Ref ref) => HomeGroupsReconciliationCoordinator(),
);

final homeGroupsProvider = FutureProvider.autoDispose<List<GroupSummary>>(
  (Ref ref) async {
    var active = true;
    ref.onDispose(() => active = false);
    return ref.watch(homeGroupsReconciliationCoordinatorProvider).run(
          ref.watch(homeRepositoryProvider).fetchGroups(),
          (groups) =>
              ref.read(selectedGroupProvider.notifier).reconcile(groups),
          isActive: () => active,
        );
  },
);

final homeSummaryProvider =
    FutureProvider.autoDispose<HomeSummary>((Ref ref) async {
  final selectedGroupId = ref.watch(selectedGroupProvider);
  await ref.watch(homeGroupsProvider.future);
  return ref.watch(homeRepositoryProvider).fetchSummary(
        groupId: selectedGroupId ?? ref.read(selectedGroupProvider),
      );
});
