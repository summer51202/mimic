import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/session_provider.dart';
import '../../../shared/storage/session_persistence.dart';
import '../data/auth_repository.dart';

class AuthState {
  const AuthState({
    this.isSubmitting = false,
    this.errorMessage,
  });

  final bool isSubmitting;
  final String? errorMessage;

  AuthState copyWith({
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState());

  final Ref _ref;

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final AuthSessionPayload payload =
          await _ref.read(authRepositoryProvider).login(
                email: email,
                password: password,
              );

      _ref.read(sessionProvider.notifier).setSession(
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            userId: payload.userId,
          );
      await _ref.read(sessionPersistenceProvider).saveSession(
            SessionState(
              accessToken: payload.accessToken,
              refreshToken: payload.refreshToken,
              userId: payload.userId,
            ),
          );

      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Unable to sign in right now.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _ref.read(authRepositoryProvider).logout();
    } catch (_) {
      // Keep logout resilient even if the remote endpoint is unavailable.
    } finally {
      _ref.read(sessionProvider.notifier).clear();
      await _ref.read(sessionPersistenceProvider).clearSession();
      state = state.copyWith(isSubmitting: false, clearError: true);
    }
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((Ref ref) {
  return AuthController(ref);
});
