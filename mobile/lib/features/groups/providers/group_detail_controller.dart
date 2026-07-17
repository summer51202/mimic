import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_exception.dart';
import '../../home/providers/home_summary_provider.dart';
import '../data/group_repository.dart';

final groupDetailProvider =
    FutureProvider.autoDispose.family<GroupDetail, String>((Ref ref, groupId) {
  return ref.watch(groupRepositoryProvider).fetchGroup(groupId);
});

class GroupRenameState {
  const GroupRenameState({this.isSubmitting = false, this.errorMessage});

  final bool isSubmitting;
  final String? errorMessage;
}

class GroupRenameController extends StateNotifier<GroupRenameState> {
  GroupRenameController(this._ref, this._groupId)
      : super(const GroupRenameState());

  final Ref _ref;
  final String _groupId;

  Future<bool> submit(String name) async {
    final trimmedName = name.trim();
    if (trimmedName.isEmpty) {
      state = const GroupRenameState(
        errorMessage: 'Please enter a group name.',
      );
      return false;
    }

    state = const GroupRenameState(isSubmitting: true);
    try {
      await _ref
          .read(groupRepositoryProvider)
          .renameGroup(_groupId, trimmedName);
      _ref.invalidate(groupDetailProvider(_groupId));
      _ref.invalidate(homeGroupsProvider);
      _ref.invalidate(homeSummaryProvider);
      state = const GroupRenameState();
      return true;
    } on ApiException catch (error) {
      state = GroupRenameState(errorMessage: _messageFor(error));
      return false;
    } catch (_) {
      state = const GroupRenameState(
        errorMessage: 'Unable to rename this group right now.',
      );
      return false;
    }
  }

  String _messageFor(ApiException error) {
    if (error.code == 'OWNER_REQUIRED') {
      return 'Only the group owner can rename this group.';
    }
    if (error.code == 'GROUP_NOT_FOUND') {
      return 'This group is no longer available.';
    }
    return 'Unable to rename this group right now.';
  }
}

final groupRenameControllerProvider = StateNotifierProvider.autoDispose
    .family<GroupRenameController, GroupRenameState, String>(
  (Ref ref, groupId) => GroupRenameController(ref, groupId),
);

enum GroupMemberOperation { promote, demote, remove, leave }

class GroupMemberMutationState {
  const GroupMemberMutationState({
    this.isSubmitting = false,
    this.operation,
    this.errorCode,
    this.errorMessage,
  });

  final bool isSubmitting;
  final GroupMemberOperation? operation;
  final String? errorCode;
  final String? errorMessage;
}

class GroupMemberMutationController
    extends StateNotifier<GroupMemberMutationState> {
  GroupMemberMutationController(this._ref, this._groupId)
      : super(const GroupMemberMutationState());

  final Ref _ref;
  final String _groupId;

  Future<bool> changeRole(String userId, String role) {
    final normalizedRole = role.toLowerCase();
    if (normalizedRole != 'owner' && normalizedRole != 'member') {
      return Future<bool>.error(
        ArgumentError.value(role, 'role', 'Must be owner or member.'),
      );
    }
    return _submit(
      normalizedRole == 'owner'
          ? GroupMemberOperation.promote
          : GroupMemberOperation.demote,
      () => _ref
          .read(groupRepositoryProvider)
          .updateMemberRole(_groupId, userId, normalizedRole),
    );
  }

  Future<bool> remove(String userId) => _submit(
        GroupMemberOperation.remove,
        () => _ref.read(groupRepositoryProvider).removeMember(_groupId, userId),
      );

  Future<bool> leave() => _submit(
        GroupMemberOperation.leave,
        () => _ref.read(groupRepositoryProvider).leaveGroup(_groupId),
        awaitHomeReconciliation: true,
      );

  Future<bool> _submit(
    GroupMemberOperation operation,
    Future<void> Function() mutation, {
    bool awaitHomeReconciliation = false,
  }) async {
    if (state.isSubmitting) return false;
    final keepAlive = _ref.keepAlive();
    state = GroupMemberMutationState(
      isSubmitting: true,
      operation: operation,
    );
    try {
      await mutation();
    } on ApiException catch (error) {
      state = GroupMemberMutationState(
        errorCode: error.code,
        errorMessage: _memberMutationMessage(error.code),
      );
      keepAlive.close();
      return false;
    } catch (_) {
      state = const GroupMemberMutationState(
        errorMessage: 'Unable to update group membership right now.',
      );
      keepAlive.close();
      return false;
    }

    try {
      _ref.invalidate(groupDetailProvider(_groupId));
      _ref.invalidate(homeGroupsProvider);
      if (awaitHomeReconciliation) {
        await _ref.read(homeGroupsProvider.future);
      }
    } catch (_) {
      // The server mutation already succeeded. A later provider refresh can
      // recover local Home/selection state without retrying the mutation.
    } finally {
      state = const GroupMemberMutationState();
      keepAlive.close();
    }
    return true;
  }
}

String _memberMutationMessage(String code) => switch (code) {
      'OWNER_REQUIRED' => 'Only an Owner can manage members.',
      'MEMBER_NOT_FOUND' =>
        'This member is no longer available. Refresh and try again.',
      'LAST_OWNER_REQUIRED' => 'Make another member an Owner first.',
      'MEMBER_HAS_OPEN_BALANCE' =>
        "Complete this member's balances in every fund first.",
      'MEMBER_HAS_PENDING_SETTLEMENT' =>
        'Complete or cancel the pending settlement first.',
      'GROUP_ACCESS_DENIED' => 'You no longer have access to this group.',
      'ROLE_UNCHANGED' => 'The member already has this role.',
      'CANNOT_REMOVE_SELF' => 'Use Leave group instead.',
      _ => 'Unable to update group membership right now.',
    };

final groupMemberMutationControllerProvider = StateNotifierProvider.autoDispose
    .family<GroupMemberMutationController, GroupMemberMutationState, String>(
  (Ref ref, groupId) => GroupMemberMutationController(ref, groupId),
);
