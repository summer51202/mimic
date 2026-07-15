import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/correction_repository.dart';

class CorrectionFormState {
  const CorrectionFormState({
    this.title = '',
    this.amountText = '',
    this.note = '',
    this.isSubmitting = false,
    this.errorMessage,
  });

  final String title;
  final String amountText;
  final String note;
  final bool isSubmitting;
  final String? errorMessage;

  CorrectionFormState copyWith({
    String? title,
    String? amountText,
    String? note,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CorrectionFormState(
      title: title ?? this.title,
      amountText: amountText ?? this.amountText,
      note: note ?? this.note,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class CorrectionFormController extends StateNotifier<CorrectionFormState> {
  CorrectionFormController(this._ref, this.fundId)
      : super(const CorrectionFormState());

  final Ref _ref;
  final String fundId;

  void updateTitle(String value) {
    state = state.copyWith(title: value);
  }

  void updateAmount(String value) {
    state = state.copyWith(amountText: value);
  }

  void updateNote(String value) {
    state = state.copyWith(note: value);
  }

  Future<bool> submit() async {
    if (state.title.trim().isEmpty || state.amountText.trim().isEmpty) {
      state = state.copyWith(
        errorMessage: 'Please enter a title and amount.',
      );
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _ref.read(correctionRepositoryProvider).createCorrection(
            CorrectionDraft(
              fundId: fundId,
              title: state.title.trim(),
              amountText: state.amountText.trim(),
              note: state.note.trim(),
            ),
          );
      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } on CorrectionRepositoryException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: error.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to save this correction right now.',
      );
      return false;
    }
  }
}

final correctionFormControllerProvider = StateNotifierProvider.autoDispose
    .family<CorrectionFormController, CorrectionFormState, String>((Ref ref, String fundId) {
  return CorrectionFormController(ref, fundId);
});
