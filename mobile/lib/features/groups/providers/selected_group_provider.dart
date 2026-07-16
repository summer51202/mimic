import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/group_summary.dart';
import '../data/selected_group_persistence.dart';

class SelectedGroupNotifier extends StateNotifier<String?> {
  SelectedGroupNotifier(this._persistence) : super(null);

  final SelectedGroupPersistence _persistence;

  Future<void> reconcile(List<GroupSummary> groups) async {
    if (groups.isEmpty) {
      state = null;
      await _persistence.clear();
      return;
    }

    final validIds = groups.map((group) => group.id).toSet();
    final storedId = state ?? await _persistence.read();
    final selectedId =
        validIds.contains(storedId) ? storedId! : groups.first.id;

    state = selectedId;
    await _persistence.write(selectedId);
  }

  Future<void> select(String groupId) async {
    state = groupId;
    await _persistence.write(groupId);
  }
}

final selectedGroupProvider =
    StateNotifierProvider<SelectedGroupNotifier, String?>((Ref ref) {
  return SelectedGroupNotifier(ref.watch(selectedGroupPersistenceProvider));
});
