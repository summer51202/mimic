import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../groups/data/group_summary.dart';
import '../../groups/providers/selected_group_provider.dart';
import '../data/home_repository.dart';

final homeGroupsProvider = FutureProvider.autoDispose<List<GroupSummary>>(
  (Ref ref) async {
    final groups = await ref.watch(homeRepositoryProvider).fetchGroups();
    await Future<void>.delayed(Duration.zero);
    await ref.read(selectedGroupProvider.notifier).reconcile(groups);
    return groups;
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
