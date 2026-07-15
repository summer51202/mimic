import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/session_provider.dart';
import '../data/contribution_repository.dart';

class ContributionFormState {
  const ContributionFormState({
    this.amountText = '',
    this.note = '',
    this.contributionType = 'one_time',
    this.occurredOn = '',
    this.isSubmitting = false,
    this.errorMessage,
  });

  final String amountText;
  final String note;
  final String contributionType;
  final String occurredOn;
  final bool isSubmitting;
  final String? errorMessage;

  ContributionFormState copyWith({
    String? amountText,
    String? note,
    String? contributionType,
    String? occurredOn,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ContributionFormState(
      amountText: amountText ?? this.amountText,
      note: note ?? this.note,
      contributionType: contributionType ?? this.contributionType,
      occurredOn: occurredOn ?? this.occurredOn,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class ContributionFormController extends StateNotifier<ContributionFormState> {
  ContributionFormController(this._ref, this.fundId)
      : super(
          ContributionFormState(
            occurredOn: DateTime.now().toIso8601String().split('T').first,
          ),
        );

  final Ref _ref;
  final String fundId;

  void updateAmount(String value) {
    state = state.copyWith(amountText: value);
  }

  void updateNote(String value) {
    state = state.copyWith(note: value);
  }

  void updateContributionType(String value) {
    state = state.copyWith(contributionType: value);
  }

  Future<bool> submit() async {
    final amountMinor = int.tryParse(state.amountText.trim()) ?? 0;
    if (amountMinor <= 0) {
      state = state.copyWith(
        errorMessage: 'Please enter a valid amount.',
      );
      return false;
    }

    final userId = _ref.read(sessionProvider).userId ?? 'demo-user';

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _ref.read(contributionRepositoryProvider).createContribution(
            ContributionDraftPayload(
              fundId: fundId,
              contributorUserId: userId,
              amountText: state.amountText.trim(),
              contributionType: state.contributionType,
              occurredOn: state.occurredOn,
              note: state.note.trim(),
            ),
          );

      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } on ContributionRepositoryException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: error.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to save this contribution right now.',
      );
      return false;
    }
  }
}

final contributionFormControllerProvider = StateNotifierProvider.autoDispose
    .family<ContributionFormController, ContributionFormState, String>((
  Ref ref,
  String fundId,
) {
  return ContributionFormController(ref, fundId);
});
