import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/groups/providers/selected_group_provider.dart';

class MemorySelectedGroupPersistence implements SelectedGroupPersistence {
  MemorySelectedGroupPersistence([this.value]);

  String? value;

  @override
  Future<void> clear() async => value = null;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String groupId) async => value = groupId;
}

const groups = <GroupSummary>[
  GroupSummary(
    id: 'group-1',
    name: 'Home',
    groupType: 'couple',
    memberCount: 2,
    role: 'owner',
  ),
  GroupSummary(
    id: 'group-2',
    name: 'Trip',
    groupType: 'group',
    memberCount: 3,
    role: 'member',
  ),
];

ProviderContainer containerWith(MemorySelectedGroupPersistence persistence) {
  return ProviderContainer(
    overrides: <Override>[
      selectedGroupPersistenceProvider.overrideWithValue(persistence),
    ],
  );
}

void main() {
  test('restores a valid persisted group', () async {
    final persistence = MemorySelectedGroupPersistence('group-2');
    final container = containerWith(persistence);
    addTearDown(container.dispose);

    await container.read(selectedGroupProvider.notifier).reconcile(groups);

    expect(container.read(selectedGroupProvider), 'group-2');
  });

  test('falls back to and persists the first group', () async {
    final persistence = MemorySelectedGroupPersistence('missing-group');
    final container = containerWith(persistence);
    addTearDown(container.dispose);

    await container.read(selectedGroupProvider.notifier).reconcile(groups);

    expect(container.read(selectedGroupProvider), 'group-1');
    expect(persistence.value, 'group-1');
  });

  test('select persists a valid explicit choice', () async {
    final persistence = MemorySelectedGroupPersistence();
    final container = containerWith(persistence);
    addTearDown(container.dispose);
    final notifier = container.read(selectedGroupProvider.notifier);
    await notifier.reconcile(groups);

    await notifier.select('group-2');

    expect(container.read(selectedGroupProvider), 'group-2');
    expect(persistence.value, 'group-2');
  });

  test('reconcile clears selection when no groups remain', () async {
    final persistence = MemorySelectedGroupPersistence('group-2');
    final container = containerWith(persistence);
    addTearDown(container.dispose);

    await container
        .read(selectedGroupProvider.notifier)
        .reconcile(const <GroupSummary>[]);

    expect(container.read(selectedGroupProvider), isNull);
    expect(persistence.value, isNull);
  });
}
