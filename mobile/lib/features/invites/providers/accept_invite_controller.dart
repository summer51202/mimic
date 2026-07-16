import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_exception.dart';
import '../../home/providers/home_summary_provider.dart';
import '../data/invite_repository.dart';

class AcceptInviteState {
  const AcceptInviteState({
    this.codeDraft = '',
    this.isSubmitting = false,
    this.acceptedInvite,
    this.errorMessage,
  });

  final String codeDraft;
  final bool isSubmitting;
  final AcceptedInvite? acceptedInvite;
  final String? errorMessage;

  AcceptInviteState copyWith({
    String? codeDraft,
    bool? isSubmitting,
    AcceptedInvite? acceptedInvite,
    String? errorMessage,
    bool clearAcceptedInvite = false,
    bool clearError = false,
  }) {
    return AcceptInviteState(
      codeDraft: codeDraft ?? this.codeDraft,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      acceptedInvite:
          clearAcceptedInvite ? null : (acceptedInvite ?? this.acceptedInvite),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AcceptInviteController extends StateNotifier<AcceptInviteState> {
  AcceptInviteController(this._ref) : super(const AcceptInviteState());

  final Ref _ref;

  void updateCode(String value) {
    state = state.copyWith(codeDraft: value);
  }

  Future<bool> submit() async {
    if (state.isSubmitting) {
      return false;
    }

    final code = state.codeDraft.trim();
    if (code.isEmpty) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Please enter an invite code.',
        clearAcceptedInvite: true,
      );
      return false;
    }

    final link = _ref.keepAlive();
    state = state.copyWith(
      isSubmitting: true,
      clearAcceptedInvite: true,
      clearError: true,
    );

    try {
      final acceptedInvite =
          await _ref.read(inviteRepositoryProvider).acceptInvite(code);
      state = state.copyWith(
        isSubmitting: false,
        acceptedInvite: acceptedInvite,
        clearError: true,
      );
      _ref.invalidate(homeSummaryProvider);
      return true;
    } on ApiException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _acceptErrorMessage(error.code),
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _genericAcceptError,
      );
      return false;
    } finally {
      link.close();
    }
  }
}

final acceptInviteControllerProvider = StateNotifierProvider.autoDispose<
    AcceptInviteController, AcceptInviteState>((Ref ref) {
  return AcceptInviteController(ref);
});

const _genericAcceptError = 'Unable to accept this invite right now.';

String _acceptErrorMessage(String code) {
  return switch (code) {
    'INVITE_NOT_FOUND' => 'This invite code was not found.',
    'INVITE_ALREADY_USED' => 'This invite code has already been used.',
    'INVITE_EXPIRED' => 'This invite code has expired.',
    'INVITE_EMAIL_MISMATCH' =>
      'This invite was created for another email address.',
    'ALREADY_GROUP_MEMBER' => 'You are already a member of this group.',
    _ => _genericAcceptError,
  };
}
