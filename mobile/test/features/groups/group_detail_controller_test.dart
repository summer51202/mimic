import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_repository.dart';
import 'package:pairfund_mobile/features/groups/providers/group_detail_controller.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';

class _FakeRepository implements GroupRepository {
  int fetchCount = 0;
  String? renamedTo;
  Object? renameError;

  @override
  Future<GroupDetail> fetchGroup(String groupId) async {
    fetchCount++;
    return const GroupDetail(
      id: 'group-1',
      name: 'Our Home',
      groupType: 'couple',
      defaultCurrency: 'TWD',
      role: 'owner',
      members: [],
      funds: [],
    );
  }

  @override
  Future<RenamedGroup> renameGroup(String groupId, String name) async {
    if (renameError != null) throw renameError!;
    renamedTo = name;
    return RenamedGroup(id: groupId, name: name);
  }

  @override
  Future<void> updateMemberRole(
    String groupId,
    String userId,
    String role,
  ) async {}

  @override
  Future<void> removeMember(String groupId, String userId) async {}

  @override
  Future<void> leaveGroup(String groupId) async {}
}

void main() {
  test('rejects blank rename without calling repository', () async {
    final repository = _FakeRepository();
    final container = ProviderContainer(overrides: [
      groupRepositoryProvider.overrideWithValue(repository),
    ]);
    addTearDown(container.dispose);

    final success = await container
        .read(groupRenameControllerProvider('group-1').notifier)
        .submit('  ');

    expect(success, isFalse);
    expect(repository.renamedTo, isNull);
    expect(
      container.read(groupRenameControllerProvider('group-1')).errorMessage,
      'Please enter a group name.',
    );
  });

  test('trims rename and invalidates group detail', () async {
    final repository = _FakeRepository();
    final container = ProviderContainer(overrides: [
      groupRepositoryProvider.overrideWithValue(repository),
    ]);
    addTearDown(container.dispose);
    await container.read(groupDetailProvider('group-1').future);

    final success = await container
        .read(groupRenameControllerProvider('group-1').notifier)
        .submit('  Renamed Home  ');
    await container.read(groupDetailProvider('group-1').future);

    expect(success, isTrue);
    expect(repository.renamedTo, 'Renamed Home');
    expect(repository.fetchCount, 2);
  });

  test('maps owner denial to friendly copy', () async {
    final repository = _FakeRepository()
      ..renameError = const ApiException(
        code: 'OWNER_REQUIRED',
        message: 'OWNER_REQUIRED',
      );
    final container = ProviderContainer(overrides: [
      groupRepositoryProvider.overrideWithValue(repository),
    ]);
    addTearDown(container.dispose);

    final success = await container
        .read(groupRenameControllerProvider('group-1').notifier)
        .submit('Renamed Home');

    expect(success, isFalse);
    expect(
      container.read(groupRenameControllerProvider('group-1')).errorMessage,
      'Only the group owner can rename this group.',
    );
  });
}
