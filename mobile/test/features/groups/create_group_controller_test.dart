import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_creation_repository.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/groups/providers/create_group_controller.dart';
import 'package:pairfund_mobile/features/groups/providers/selected_group_provider.dart';

class _FakeRepository implements GroupCreationRepository {
  CreateGroupDraft? draft;

  @override
  Future<CreatedGroup> createGroup(CreateGroupDraft draft) async {
    this.draft = draft;
    return const CreatedGroup(
      id: 'new-group',
      name: 'Our Home',
      groupType: 'couple',
      defaultCurrency: 'TWD',
    );
  }
}

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
  test('rejects a blank group name without calling repository', () async {
    final repository = _FakeRepository();
    final container = ProviderContainer(overrides: <Override>[
      groupCreationRepositoryProvider.overrideWithValue(repository),
      selectedGroupPersistenceProvider.overrideWithValue(_MemoryPersistence()),
    ]);
    addTearDown(container.dispose);

    final success =
        await container.read(createGroupControllerProvider.notifier).submit();

    expect(success, isFalse);
    expect(repository.draft, isNull);
    expect(container.read(createGroupControllerProvider).errorMessage,
        'Please enter a group name.');
  });

  test('creates and selects the new group', () async {
    final repository = _FakeRepository();
    final persistence = _MemoryPersistence();
    final container = ProviderContainer(overrides: <Override>[
      groupCreationRepositoryProvider.overrideWithValue(repository),
      selectedGroupPersistenceProvider.overrideWithValue(persistence),
    ]);
    addTearDown(container.dispose);
    final controller = container.read(createGroupControllerProvider.notifier);
    controller.updateName('  Our Home  ');
    controller.updateGroupType('couple');

    final success = await controller.submit();

    expect(success, isTrue);
    expect(repository.draft?.name, 'Our Home');
    expect(repository.draft?.groupType, 'couple');
    expect(container.read(selectedGroupProvider), 'new-group');
    expect(persistence.value, 'new-group');
  });
}
