import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_exception.dart';
import '../data/invite_repository.dart';

class CreateInviteState {
  const CreateInviteState({
    this.emailDraft = '',
    this.isSubmitting = false,
    this.invite,
    this.errorMessage,
  });

  final String emailDraft;
  final bool isSubmitting;
  final CreatedInvite? invite;
  final String? errorMessage;

  CreateInviteState copyWith({
    String? emailDraft,
    bool? isSubmitting,
    CreatedInvite? invite,
    String? errorMessage,
    bool clearInvite = false,
    bool clearError = false,
  }) {
    return CreateInviteState(
      emailDraft: emailDraft ?? this.emailDraft,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      invite: clearInvite ? null : (invite ?? this.invite),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class CreateInviteController extends StateNotifier<CreateInviteState> {
  CreateInviteController(this._ref, this.groupId)
      : super(const CreateInviteState());

  final Ref _ref;
  final String groupId;

  void updateEmail(String value) {
    state = state.copyWith(emailDraft: value);
  }

  Future<bool> submit() async {
    if (state.isSubmitting) {
      return false;
    }

    final trimmedEmail = state.emailDraft.trim();
    final normalizedEmail =
        trimmedEmail.isEmpty ? null : trimmedEmail.toLowerCase();
    if (normalizedEmail != null && !_emailPattern.hasMatch(normalizedEmail)) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Please enter a valid email address.',
        clearInvite: true,
      );
      return false;
    }

    final link = _ref.keepAlive();
    state = state.copyWith(
      isSubmitting: true,
      clearInvite: true,
      clearError: true,
    );

    try {
      final invite = await _ref.read(inviteRepositoryProvider).createInvite(
            groupId,
            invitedEmail: normalizedEmail,
          );
      state = state.copyWith(
        isSubmitting: false,
        invite: invite,
        clearError: true,
      );
      return true;
    } on ApiException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _createErrorMessage(error.code),
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _genericCreateError,
      );
      return false;
    } finally {
      link.close();
    }
  }
}

final createInviteControllerProvider = StateNotifierProvider.autoDispose
    .family<CreateInviteController, CreateInviteState, String>(
        (Ref ref, String groupId) {
  return CreateInviteController(ref, groupId);
});

final _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

const _genericCreateError = 'Unable to create an invite right now.';

String _createErrorMessage(String code) {
  if (code == 'GROUP_OWNER_REQUIRED') {
    return 'Only a group owner can invite members.';
  }
  return _genericCreateError;
}
