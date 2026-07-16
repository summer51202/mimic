import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../home/providers/home_summary_provider.dart';
import '../data/group_creation_repository.dart';
import 'selected_group_provider.dart';

class CreateGroupState {
  const CreateGroupState({
    this.name = '',
    this.groupType = 'couple',
    this.defaultCurrency = 'TWD',
    this.isSubmitting = false,
    this.errorMessage,
  });

  final String name;
  final String groupType;
  final String defaultCurrency;
  final bool isSubmitting;
  final String? errorMessage;

  CreateGroupState copyWith({
    String? name,
    String? groupType,
    String? defaultCurrency,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CreateGroupState(
      name: name ?? this.name,
      groupType: groupType ?? this.groupType,
      defaultCurrency: defaultCurrency ?? this.defaultCurrency,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class CreateGroupController extends StateNotifier<CreateGroupState> {
  CreateGroupController(this._ref) : super(const CreateGroupState());

  final Ref _ref;

  void updateName(String value) =>
      state = state.copyWith(name: value, clearError: true);

  void updateGroupType(String value) =>
      state = state.copyWith(groupType: value, clearError: true);

  void updateCurrency(String value) =>
      state = state.copyWith(defaultCurrency: value, clearError: true);

  Future<bool> submit() async {
    if (state.name.trim().isEmpty) {
      state = state.copyWith(errorMessage: 'Please enter a group name.');
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final group =
          await _ref.read(groupCreationRepositoryProvider).createGroup(
                CreateGroupDraft(
                  name: state.name.trim(),
                  groupType: state.groupType,
                  defaultCurrency: state.defaultCurrency,
                ),
              );
      await _ref.read(selectedGroupProvider.notifier).select(group.id);
      _ref.invalidate(homeGroupsProvider);
      _ref.invalidate(homeSummaryProvider);
      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to create this group right now.',
      );
      return false;
    }
  }
}

final createGroupControllerProvider =
    StateNotifierProvider.autoDispose<CreateGroupController, CreateGroupState>(
        (Ref ref) {
  return CreateGroupController(ref);
});
