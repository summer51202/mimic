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
