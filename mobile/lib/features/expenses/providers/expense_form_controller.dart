import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/expense_repository.dart';

class ExpenseFormState {
  const ExpenseFormState({
    this.title = '',
    this.amountText = '',
    this.payerUserId = 'user-a',
    this.splitMode = 'equal',
    this.note = '',
    this.isSubmitting = false,
    this.errorMessage,
    this.participants = const <ExpenseParticipantDraft>[
      ExpenseParticipantDraft(
        userId: 'user-a',
        name: 'Edward',
        allocationLabel: '50%',
        sortOrder: 1,
      ),
      ExpenseParticipantDraft(
        userId: 'user-b',
        name: 'Partner',
        allocationLabel: '50%',
        sortOrder: 2,
      ),
    ],
  });

  final String title;
  final String amountText;
  final String payerUserId;
  final String splitMode;
  final String note;
  final bool isSubmitting;
  final String? errorMessage;
  final List<ExpenseParticipantDraft> participants;

  ExpenseFormState copyWith({
    String? title,
    String? amountText,
    String? payerUserId,
    String? splitMode,
    String? note,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    List<ExpenseParticipantDraft>? participants,
  }) {
    return ExpenseFormState(
      title: title ?? this.title,
      amountText: amountText ?? this.amountText,
      payerUserId: payerUserId ?? this.payerUserId,
      splitMode: splitMode ?? this.splitMode,
      note: note ?? this.note,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      participants: participants ?? this.participants,
    );
  }
}

class ExpenseFormController extends StateNotifier<ExpenseFormState> {
  ExpenseFormController(this._ref, this.fundId) : super(const ExpenseFormState());

  final Ref _ref;
  final String fundId;

  void updateTitle(String value) {
    state = state.copyWith(title: value);
  }

  void updateAmount(String value) {
    state = state.copyWith(amountText: value);
  }

  void updateSplitMode(String value) {
    state = state.copyWith(splitMode: value);
  }

  void updateNote(String value) {
    state = state.copyWith(note: value);
  }

  Future<bool> submit() async {
    if (state.title.trim().isEmpty || state.amountText.trim().isEmpty) {
      state = state.copyWith(
        errorMessage: 'Please add a title and amount.',
        clearError: false,
      );
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _ref.read(expenseRepositoryProvider).createExpense(
            ExpenseDraftPayload(
              fundId: fundId,
              title: state.title.trim(),
              amountText: state.amountText.trim(),
              payerUserId: state.payerUserId,
              splitMode: state.splitMode,
              note: state.note,
              splits: state.participants,
            ),
          );

      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } on ExpenseRepositoryException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: error.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to save this expense right now.',
      );
      return false;
    }
  }
}

final expenseFormControllerProvider = StateNotifierProvider.autoDispose
    .family<ExpenseFormController, ExpenseFormState, String>((
  Ref ref,
  String fundId,
) {
  return ExpenseFormController(ref, fundId);
});
