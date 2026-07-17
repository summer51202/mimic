import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/groups/providers/selected_group_provider.dart';
import 'package:pairfund_mobile/features/home/providers/home_summary_provider.dart';

class _MemoryPersistence implements SelectedGroupPersistence {
  String? value;
  @override
  Future<void> clear() async => value = null;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String groupId) async => value = groupId;
}

void main() {
  test('older overlapping load cannot reconcile after a newer load', () async {
    final coordinator = HomeGroupsReconciliationCoordinator();
    final persistence = _MemoryPersistence();
    final selection = SelectedGroupNotifier(persistence);
    addTearDown(selection.dispose);
    final older = Completer<List<GroupSummary>>();
    final newer = Completer<List<GroupSummary>>();

    final olderLoad = coordinator.run(
      older.future,
      selection.reconcile,
    );
    final newerLoad = coordinator.run(
      newer.future,
      selection.reconcile,
    );

    newer.complete(const [
      GroupSummary(
        id: 'newer',
        name: 'Newer',
        groupType: 'group',
        memberCount: 1,
        role: 'member',
      ),
    ]);
    await newerLoad;
    older.complete(const [
      GroupSummary(
        id: 'stale',
        name: 'Stale',
        groupType: 'group',
        memberCount: 1,
        role: 'member',
      ),
    ]);
    await olderLoad;

    expect(selection.state, 'newer');
    expect(persistence.value, 'newer');
  });
}
