import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/fund_creation_repository.dart';

class CreateFundState {
  const CreateFundState({
    this.name = '',
    this.currency = 'TWD',
    this.isSubmitting = false,
    this.errorMessage,
  });

  final String name;
  final String currency;
  final bool isSubmitting;
  final String? errorMessage;

  CreateFundState copyWith({
    String? name,
    String? currency,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CreateFundState(
      name: name ?? this.name,
      currency: currency ?? this.currency,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class CreateFundController extends StateNotifier<CreateFundState> {
  CreateFundController(this._ref) : super(const CreateFundState());

  final Ref _ref;

  void updateName(String value) {
    state = state.copyWith(name: value);
  }

  void updateCurrency(String value) {
    state = state.copyWith(currency: value);
  }

  Future<bool> submit() async {
    if (state.name.trim().isEmpty) {
      state = state.copyWith(errorMessage: 'Please enter a fund name.');
      return false;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _ref.read(fundCreationRepositoryProvider).createFund(
            CreateFundDraft(
              name: state.name.trim(),
              currency: state.currency,
            ),
          );
      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } on FundCreationException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: error.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to create this fund right now.',
      );
      return false;
    }
  }
}

final createFundControllerProvider =
    StateNotifierProvider.autoDispose<CreateFundController, CreateFundState>((Ref ref) {
  return CreateFundController(ref);
});
