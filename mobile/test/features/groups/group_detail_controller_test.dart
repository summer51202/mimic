import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_repository.dart';
import 'package:pairfund_mobile/features/groups/providers/group_detail_controller.dart';
import 'package:pairfund_mobile/features/groups/providers/selected_group_provider.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/home/providers/home_summary_provider.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';

class _FakeRepository implements GroupRepository {
  int fetchCount = 0;
  String? renamedTo;
  Object? renameError;
  Object? mutationError;
  final List<String> mutations = [];
  Completer<void>? mutationGate;

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
  ) async {
    if (mutationGate != null) await mutationGate!.future;
    if (mutationError != null) throw mutationError!;
    mutations.add('role:$userId:$role');
  }

  @override
  Future<void> removeMember(String groupId, String userId) async {
    if (mutationGate != null) await mutationGate!.future;
    if (mutationError != null) throw mutationError!;
    mutations.add('remove:$userId');
  }

  @override
  Future<void> leaveGroup(String groupId) async {
    if (mutationGate != null) await mutationGate!.future;
    if (mutationError != null) throw mutationError!;
    mutations.add('leave');
  }
}

class _MemoryPersistence implements SelectedGroupPersistence {
  String? value = 'group-1';
  @override
  Future<void> clear() async => value = null;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String groupId) async => value = groupId;
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

  group('member mutations', () {
    var homeLoadCount = 0;
    ProviderContainer makeContainer(
      _FakeRepository repository, {
      _MemoryPersistence? persistence,
      bool leaveFinalGroup = false,
    }) {
      return ProviderContainer(overrides: [
        groupRepositoryProvider.overrideWithValue(repository),
        selectedGroupPersistenceProvider
            .overrideWithValue(persistence ?? _MemoryPersistence()),
        homeGroupsProvider.overrideWith((ref) async {
          homeLoadCount++;
          final groups =
              leaveFinalGroup && repository.mutations.contains('leave')
                  ? const <GroupSummary>[]
                  : repository.mutations.contains('leave')
                      ? const [
                          GroupSummary(
                              id: 'group-2',
                              name: 'Other',
                              groupType: 'group',
                              memberCount: 1,
                              role: 'member')
                        ]
                      : const [
                          GroupSummary(
                              id: 'group-1',
                              name: 'Home',
                              groupType: 'couple',
                              memberCount: 2,
                              role: 'owner')
                        ];
          await Future<void>.delayed(Duration.zero);
          await ref.read(selectedGroupProvider.notifier).reconcile(groups);
          return groups;
        }),
      ]);
    }

    test('promotes and demotes with operation-aware state', () async {
      final repository = _FakeRepository()..mutationGate = Completer<void>();
      final container = makeContainer(repository);
      addTearDown(container.dispose);
      final notifier = container
          .read(groupMemberMutationControllerProvider('group-1').notifier);

      final promote = notifier.changeRole('user-2', 'owner');
      await Future<void>.delayed(Duration.zero);
      expect(
          container
              .read(groupMemberMutationControllerProvider('group-1'))
              .isSubmitting,
          isTrue);
      expect(
          container
              .read(groupMemberMutationControllerProvider('group-1'))
              .operation,
          GroupMemberOperation.promote);
      repository.mutationGate!.complete();
      expect(await promote, isTrue);

      repository.mutationGate = Completer<void>();
      final demote = notifier.changeRole('user-2', 'member');
      await Future<void>.delayed(Duration.zero);
      expect(
          container
              .read(groupMemberMutationControllerProvider('group-1'))
              .isSubmitting,
          isTrue);
      expect(
          container
              .read(groupMemberMutationControllerProvider('group-1'))
              .operation,
          GroupMemberOperation.demote);
      repository.mutationGate!.complete();
      expect(await demote, isTrue);
      expect(repository.mutations, ['role:user-2:owner', 'role:user-2:member']);
      expect(
          container
              .read(groupMemberMutationControllerProvider('group-1'))
              .operation,
          isNull);
    });

    for (final operation in ['promote', 'demote', 'remove']) {
      test('$operation refreshes group detail and Home groups', () async {
        homeLoadCount = 0;
        final repository = _FakeRepository();
        final container = makeContainer(repository);
        addTearDown(container.dispose);
        await container.read(groupDetailProvider('group-1').future);
        await container.read(homeGroupsProvider.future);
        expect(repository.fetchCount, 1);
        expect(homeLoadCount, 1);
        final notifier = container
            .read(groupMemberMutationControllerProvider('group-1').notifier);
        final success = operation == 'remove'
            ? await notifier.remove('user-2')
            : await notifier.changeRole(
                'user-2', operation == 'promote' ? 'owner' : 'member');
        expect(success, isTrue);
        await container.read(groupDetailProvider('group-1').future);
        await container.read(homeGroupsProvider.future);
        expect(repository.fetchCount, greaterThan(1));
        expect(homeLoadCount, greaterThan(1));
      });
    }

    test('removes a member', () async {
      final repository = _FakeRepository();
      final container = makeContainer(repository);
      addTearDown(container.dispose);
      expect(
          await container
              .read(groupMemberMutationControllerProvider('group-1').notifier)
              .remove('user-2'),
          isTrue);
      expect(repository.mutations, ['remove:user-2']);
    });

    test('prevents duplicate submits and exposes active operation', () async {
      final repository = _FakeRepository();
      final gate = Completer<void>();
      final slow = _SlowRepository(repository, gate.future);
      final container = ProviderContainer(
          overrides: [groupRepositoryProvider.overrideWithValue(slow)]);
      addTearDown(container.dispose);
      final notifier = container
          .read(groupMemberMutationControllerProvider('group-1').notifier);
      final first = notifier.remove('user-2');
      await Future<void>.delayed(Duration.zero);
      final state =
          container.read(groupMemberMutationControllerProvider('group-1'));
      expect(state.isSubmitting, isTrue);
      expect(state.operation, GroupMemberOperation.remove);
      expect(await notifier.remove('user-3'), isFalse);
      gate.complete();
      expect(await first, isTrue);
    });

    test('in-flight mutation survives listener removal and auto-dispose',
        () async {
      final repository = _FakeRepository()..mutationGate = Completer<void>();
      final container = makeContainer(repository);
      addTearDown(container.dispose);
      final provider = groupMemberMutationControllerProvider('group-1');
      final subscription = container.listen(provider, (_, __) {});
      final mutation = container.read(provider.notifier).remove('user-2');
      await Future<void>.delayed(Duration.zero);
      subscription.close();
      await Future<void>.delayed(Duration.zero);
      repository.mutationGate!.complete();
      expect(await mutation, isTrue);
      expect(repository.mutations, ['remove:user-2']);
    });

    test('leave awaits home refresh and selection reconciliation', () async {
      final repository = _FakeRepository()..mutationGate = Completer<void>();
      final container = makeContainer(repository);
      addTearDown(container.dispose);
      await container.read(homeGroupsProvider.future);
      final provider = groupMemberMutationControllerProvider('group-1');
      final leave = container.read(provider.notifier).leave();
      await Future<void>.delayed(Duration.zero);
      expect(container.read(provider).isSubmitting, isTrue);
      expect(container.read(provider).operation, GroupMemberOperation.leave);
      repository.mutationGate!.complete();
      expect(await leave, isTrue);
      expect(container.read(selectedGroupProvider), 'group-2');
    });

    test('leaving final group clears selected and persisted group', () async {
      final repository = _FakeRepository();
      final persistence = _MemoryPersistence();
      final container = makeContainer(repository,
          persistence: persistence, leaveFinalGroup: true);
      addTearDown(container.dispose);
      await container.read(homeGroupsProvider.future);
      expect(
          await container
              .read(groupMemberMutationControllerProvider('group-1').notifier)
              .leave(),
          isTrue);
      expect(container.read(selectedGroupProvider), isNull);
      expect(persistence.value, isNull);
    });

    const messages = <String, String>{
      'OWNER_REQUIRED': 'Only an Owner can manage members.',
      'MEMBER_NOT_FOUND':
          'This member is no longer available. Refresh and try again.',
      'LAST_OWNER_REQUIRED': 'Make another member an Owner first.',
      'MEMBER_HAS_OPEN_BALANCE':
          "Complete this member's balances in every fund first.",
      'MEMBER_HAS_PENDING_SETTLEMENT':
          'Complete or cancel the pending settlement first.',
      'GROUP_ACCESS_DENIED': 'You no longer have access to this group.',
      'ROLE_UNCHANGED': 'The member already has this role.',
      'CANNOT_REMOVE_SELF': 'Use Leave group instead.',
    };
    for (final entry in messages.entries) {
      test('maps ${entry.key} without exposing raw backend copy', () async {
        final repository = _FakeRepository()
          ..mutationError = ApiException(code: entry.key, message: 'raw');
        final container = makeContainer(repository);
        addTearDown(container.dispose);
        expect(
            await container
                .read(groupMemberMutationControllerProvider('group-1').notifier)
                .remove('user-2'),
            isFalse);
        final state =
            container.read(groupMemberMutationControllerProvider('group-1'));
        expect(state.errorCode, entry.key);
        expect(state.errorMessage, entry.value);
      });
    }
  });
}

class _SlowRepository implements GroupRepository {
  _SlowRepository(this.delegate, this.wait);
  final GroupRepository delegate;
  final Future<void> wait;
  @override
  Future<GroupDetail> fetchGroup(String id) => delegate.fetchGroup(id);
  @override
  Future<RenamedGroup> renameGroup(String id, String name) =>
      delegate.renameGroup(id, name);
  @override
  Future<void> updateMemberRole(String g, String u, String r) async {
    await wait;
    return delegate.updateMemberRole(g, u, r);
  }

  @override
  Future<void> removeMember(String g, String u) async {
    await wait;
    return delegate.removeMember(g, u);
  }

  @override
  Future<void> leaveGroup(String g) async {
    await wait;
    return delegate.leaveGroup(g);
  }
}
