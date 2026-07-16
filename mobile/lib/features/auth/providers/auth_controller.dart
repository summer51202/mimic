import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_exception.dart';
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

  Future<bool> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final payload = await _ref.read(authRepositoryProvider).register(
            displayName: displayName,
            email: email,
            password: password,
          );
      await _persistSession(payload);
      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _registrationErrorMessage(error),
      );
      return false;
    }
  }

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

      await _persistSession(payload);

      state = state.copyWith(isSubmitting: false, clearError: true);
      return true;
    } catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: _loginErrorMessage(error),
      );
      return false;
    }
  }

  Future<void> _persistSession(AuthSessionPayload payload) async {
    final session = SessionState(
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      userId: payload.userId,
    );
    _ref.read(sessionProvider.notifier).setSession(
          accessToken: session.accessToken!,
          refreshToken: session.refreshToken!,
          userId: session.userId!,
        );
    await _ref.read(sessionPersistenceProvider).saveSession(session);
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

String _registrationErrorMessage(Object error) {
  if (error is! ApiException) {
    return 'Unable to create your account right now.';
  }
  return switch (error.code) {
    'EMAIL_ALREADY_REGISTERED' =>
      'This email already has an account. Sign in instead.',
    _ => "We couldn't connect. Please try again.",
  };
}

String _loginErrorMessage(Object error) {
  if (error is! ApiException) {
    return 'Unable to sign in right now.';
  }
  return switch (error.code) {
    'INVALID_CREDENTIALS' => 'Email or password is incorrect.',
    _ => "We couldn't connect. Please try again.",
  };
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((Ref ref) {
  return AuthController(ref);
});
